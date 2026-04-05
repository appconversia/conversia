import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  findTenantIdByWebhookVerifyToken,
  findTenantIdByWhatsAppPhoneNumberId,
  getTenantWhatsAppAppSecret,
} from "@/lib/config";
import { routeIncomingMessage } from "@/lib/bot/router";
import { sendWhatsAppRead } from "@/lib/bot/whatsapp-send";
import { botLog } from "@/lib/bot/bot-logger";
import { prisma } from "@/lib/db";

/** Verifica X-Hub-Signature-256 con el App Secret de Meta (por tenant o variable global). */
function verifyWebhookSignature(rawBody: string, signatureHeader: string | null, secret: string): boolean {
  if (!secret || !signatureHeader?.startsWith("sha256=")) return false;
  const received = signatureHeader.slice(7).toLowerCase();
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  if (received.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(received, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

type WebhookBody = {
  object?: string;
  entry?: Array<{ changes?: Array<{ field?: string; value?: { metadata?: { phone_number_id?: string } } }> }>;
};

function extractPhoneNumberId(body: WebhookBody): string | null {
  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const id = change.value?.metadata?.phone_number_id;
      if (id) return String(id);
    }
  }
  return null;
}

/**
 * Webhook de WhatsApp Cloud API (Meta)
 * GET: Verificación de la URL de callback (token por tenant en AppConfig)
 * POST: Recibe mensajes → Router → Main Brain → Sub-brains
 */
export const maxDuration = 120;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode !== "subscribe") {
    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  }

  if (!token) {
    return NextResponse.json({ error: "Invalid verify token" }, { status: 403 });
  }

  const tenantId = await findTenantIdByWebhookVerifyToken(token);
  if (!tenantId) {
    return NextResponse.json({ error: "Invalid verify token" }, { status: 403 });
  }

  if (!challenge) {
    return NextResponse.json({ error: "Missing challenge" }, { status: 400 });
  }

  return new NextResponse(challenge, {
    headers: { "Content-Type": "text/plain" },
  });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  let body: {
    object?: string;
    entry?: Array<{ changes?: Array<{ field?: string; value?: Record<string, unknown> }> }>;
  };
  try {
    body = JSON.parse(rawBody) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const phoneFromPayload = extractPhoneNumberId(body as WebhookBody);
  const tenantForSecret = phoneFromPayload
    ? await findTenantIdByWhatsAppPhoneNumberId(phoneFromPayload)
    : null;
  const tenantSecret = tenantForSecret ? await getTenantWhatsAppAppSecret(tenantForSecret) : null;
  const globalSecret = process.env.WHATSAPP_APP_SECRET?.trim() || "";
  const effectiveSecret = (tenantSecret?.trim() || globalSecret) || null;

  if (effectiveSecret && !verifyWebhookSignature(rawBody, signature, effectiveSecret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  try {
    if (body.object !== "whatsapp_business_account") {
      return NextResponse.json({ ok: true });
    }

    const entries = body.entry ?? [];
    for (const entry of entries) {
      const changes = entry.changes ?? [];
      for (const change of changes) {
        if (change.field === "messages") {
          const value = (change.value ?? {}) as {
            metadata?: { phone_number_id?: string };
            messages?: Array<Record<string, unknown>>;
            statuses?: Array<{ id: string; status?: string; recipient_id?: string }>;
            contacts?: Array<{ wa_id?: string; waba_id?: string; profile?: { name?: string } }>;
          };

          const phoneNumberId = value.metadata?.phone_number_id;
          const tenantIdFromMeta = phoneNumberId
            ? await findTenantIdByWhatsAppPhoneNumberId(String(phoneNumberId))
            : null;

          // Actualizar estados de mensajes enviados por nosotros (delivered, read)
          const statuses = Array.isArray(value.statuses) ? value.statuses : [];
          for (const st of statuses) {
            const status = String(st.status || "").toLowerCase();
            if (status === "delivered" || status === "read") {
              const msg = await prisma.message.findFirst({
                where: { whatsappMessageId: st.id },
                select: { id: true, conversationId: true },
              });
              if (msg) {
                await prisma.message.updateMany({
                  where: { whatsappMessageId: st.id },
                  data: { status: status === "read" ? "read" : "delivered" },
                });
              }
            }
          }

          if (!tenantIdFromMeta) {
            void botLog("warn", "webhook", "Sin tenant para phone_number_id; mensajes omitidos", {
              metadata: { phoneNumberId: phoneNumberId ?? null },
            });
            continue;
          }

          const messages = Array.isArray(value.messages) ? value.messages : [];
          const contacts = Array.isArray(value.contacts) ? value.contacts : [];
          const contactMap = new Map<string, string>();
          for (const c of contacts) {
            const id = c.wa_id || c.waba_id;
            const name = c.profile?.name;
            if (id && name) contactMap.set(id, name);
          }

          for (const msg of messages) {
            const from = String(msg.from || "");
            if (!from) continue;

            if (from.endsWith("@g.us")) continue;

            const ctx = msg.context as { id?: string } | undefined;
            const msgType = String(msg.type || "text");
            const payload: {
              phone: string;
              contactName?: string;
              text?: string;
              type: string;
              mediaId?: string;
              messageId?: string;
              quotedMessageId?: string;
            } = {
              phone: from,
              contactName: contactMap.get(from) ?? value.contacts?.find((c) => c.wa_id === from)?.profile?.name,
              type: msgType,
              messageId: msg.id != null ? String(msg.id) : undefined,
            };

            if (ctx?.id) payload.quotedMessageId = String(ctx.id);

            if (payload.messageId) {
              sendWhatsAppRead(tenantIdFromMeta, from, payload.messageId).catch(() => {});
            }

            if (msgType === "text" && (msg.text as { body?: string } | undefined)?.body) {
              payload.text = (msg.text as { body: string }).body;
            } else if (msgType === "image" && (msg.image as { id?: string; caption?: string } | undefined)?.id) {
              const img = msg.image as { id: string; caption?: string };
              payload.mediaId = img.id;
              payload.text = img.caption ?? "";
            } else if (msgType === "audio" && (msg.audio as { id?: string } | undefined)?.id) {
              payload.mediaId = (msg.audio as { id: string }).id;
              payload.text = "";
            } else if (msgType === "voice" && (msg.voice as { id?: string } | undefined)?.id) {
              payload.mediaId = (msg.voice as { id: string }).id;
              payload.text = "";
              payload.type = "audio";
            } else if (msgType === "video" && (msg.video as { id?: string; caption?: string } | undefined)?.id) {
              const vid = msg.video as { id: string; caption?: string };
              payload.mediaId = vid.id;
              payload.text = vid.caption ?? "";
            } else if (msgType === "document" && (msg.document as { id?: string; caption?: string } | undefined)?.id) {
              const doc = msg.document as { id: string; caption?: string };
              payload.mediaId = doc.id;
              payload.text = doc.caption ?? "";
            } else if (msgType === "sticker" && (msg.sticker as { id?: string } | undefined)?.id) {
              payload.mediaId = (msg.sticker as { id: string }).id;
              payload.text = "";
            } else if (msgType === "location" && (msg.location as { latitude?: number; longitude?: number; address?: string })) {
              const loc = msg.location as { latitude?: number; longitude?: number; name?: string; address?: string };
              payload.text = loc.address ?? `[Ubicación: ${loc.latitude ?? "?"}, ${loc.longitude ?? "?"}]`;
              payload.type = "text";
            } else if (msgType === "interactive" && (msg.interactive as { type?: string; button_reply?: { title?: string }; list_reply?: { title?: string } })) {
              const inter = msg.interactive as { type?: string; button_reply?: { title?: string }; list_reply?: { title?: string } };
              const title = inter.button_reply?.title ?? inter.list_reply?.title;
              if (title) payload.text = title;
              else continue;
              payload.type = "text";
            } else if (msgType === "button" && (msg.button as { text?: string } | undefined)?.text) {
              const btn = msg.button as { text: string };
              payload.text = btn.text;
              payload.type = "text";
            } else {
              void botLog("debug", "webhook", "Mensaje ignorado (tipo no manejado)", {
                phone: from,
                metadata: { msgType, keys: Object.keys(msg) },
              });
              continue;
            }

            void botLog("info", "webhook", "Mensaje recibido → routing", {
              phone: from,
              metadata: { type: msgType, hasText: !!payload.text?.trim(), mediaId: !!payload.mediaId },
            });
            const routeResult = await routeIncomingMessage(payload, { tenantId: tenantIdFromMeta });
            if (!routeResult.ok) {
              void botLog("error", "webhook", `Router falló: ${routeResult.error}`, {
                phone: from,
                error: routeResult.error,
              });
            }
          }
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[WhatsApp Webhook] Error:", err);
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}
