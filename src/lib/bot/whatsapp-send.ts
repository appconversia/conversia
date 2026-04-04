import { getWhatsAppCredentials } from "@/lib/config";
import { botLog } from "./bot-logger";

type SendResult = { ok: boolean; messageId?: string; error?: string };

const WHATSAPP_MAX_CHARS = 4096;
const TYPING_MIN_SEC = 5;
const TYPING_MAX_SEC = 15;

/** Duración aleatoria entre 5 y 15 segundos para el typing del bot */
export function getRandomTypingDelayMs(): number {
  const sec = TYPING_MIN_SEC + Math.random() * (TYPING_MAX_SEC - TYPING_MIN_SEC);
  return Math.round(sec * 1000);
}

/**
 * Marca un mensaje como leído en WhatsApp (check azul).
 * Usar cuando recibimos un mensaje del usuario.
 */
export async function sendWhatsAppRead(tenantId: string, toPhone: string, messageId: string): Promise<SendResult> {
  const creds = await getWhatsAppCredentials(tenantId);
  if (!creds) {
    void botLog("error", "whatsapp_send", "Credenciales WhatsApp no configuradas", { phone: toPhone });
    return { ok: false, error: "WhatsApp no configurado" };
  }
  const url = `https://graph.facebook.com/v18.0/${creds.phoneNumberId}/messages`;
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${creds.accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        status: "read",
        message_id: messageId,
      }),
    });
    const data = (await r.json().catch(() => ({}))) as { success?: boolean; error?: { message: string } };
    if (!r.ok) {
      void botLog("warn", "whatsapp_send", "Marcar como leído falló", {
        phone: toPhone,
        error: data.error?.message ?? `HTTP ${r.status}`,
      });
      return { ok: false, error: data.error?.message ?? `HTTP ${r.status}` };
    }
    return { ok: true };
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : "Error";
    void botLog("warn", "whatsapp_send", "Excepción marcando como leído", { phone: toPhone, error: errMsg });
    return { ok: false, error: errMsg };
  }
}

/**
 * Envía indicador de "escribiendo" + marca como leído.
 * El typing se oculta automáticamente al enviar un mensaje o tras ~25s.
 */
export async function sendWhatsAppTypingAndRead(tenantId: string, toPhone: string, messageId: string): Promise<SendResult> {
  const creds = await getWhatsAppCredentials(tenantId);
  if (!creds) {
    void botLog("error", "whatsapp_send", "Credenciales WhatsApp no configuradas", { phone: toPhone });
    return { ok: false, error: "WhatsApp no configurado" };
  }
  const url = `https://graph.facebook.com/v18.0/${creds.phoneNumberId}/messages`;
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${creds.accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        status: "read",
        message_id: messageId,
        typing_indicator: { type: "text" },
      }),
    });
    const data = (await r.json().catch(() => ({}))) as { success?: boolean; error?: { message: string } };
    if (!r.ok) {
      void botLog("warn", "whatsapp_send", "Typing/read falló", {
        phone: toPhone,
        error: data.error?.message ?? `HTTP ${r.status}`,
      });
      return { ok: false, error: data.error?.message ?? `HTTP ${r.status}` };
    }
    return { ok: true };
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : "Error";
    void botLog("warn", "whatsapp_send", "Excepción enviando typing", { phone: toPhone, error: errMsg });
    return { ok: false, error: errMsg };
  }
}

/**
 * Envía typing, espera 5-15s aleatorios, luego ejecuta la función de envío.
 * Usar para respuestas del bot.
 */
export async function withBotTyping<T>(
  tenantId: string,
  toPhone: string,
  messageId: string | undefined,
  sendFn: () => Promise<T>
): Promise<T> {
  if (messageId) {
    await sendWhatsAppTypingAndRead(tenantId, toPhone, messageId);
    await new Promise((r) => setTimeout(r, getRandomTypingDelayMs()));
  }
  return sendFn();
}

/** Divide texto largo en trozos respetando párrafos/oraciones (límite WhatsApp ~4096) */
function splitLongMessage(text: string): string[] {
  if (text.length <= WHATSAPP_MAX_CHARS) return [text];
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= WHATSAPP_MAX_CHARS) {
      chunks.push(remaining);
      break;
    }
    const segment = remaining.slice(0, WHATSAPP_MAX_CHARS);
    const lastNewline = segment.lastIndexOf("\n");
    const lastPeriod = segment.lastIndexOf(". ");
    const splitAt = lastNewline > WHATSAPP_MAX_CHARS * 0.5
      ? lastNewline + 1
      : lastPeriod > WHATSAPP_MAX_CHARS * 0.5
        ? lastPeriod + 2
        : WHATSAPP_MAX_CHARS;
    chunks.push(remaining.slice(0, splitAt).trim());
    remaining = remaining.slice(splitAt).trim();
  }
  return chunks;
}

export async function sendWhatsAppText(
  tenantId: string,
  toPhone: string,
  text: string,
  contextMessageId?: string
): Promise<SendResult> {
  const creds = await getWhatsAppCredentials(tenantId);
  if (!creds) {
    void botLog("error", "whatsapp_send", "Credenciales WhatsApp no configuradas", { phone: toPhone });
    return { ok: false, error: "WhatsApp no configurado" };
  }

  const phoneId = toPhone.replace(/\D/g, "");
  const url = `https://graph.facebook.com/v18.0/${creds.phoneNumberId}/messages`;
  const chunks = splitLongMessage(text);
  let firstMessageId: string | undefined;

  for (let i = 0; i < chunks.length; i++) {
    const body: Record<string, unknown> = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: phoneId,
      type: "text",
      text: { body: chunks[i]! },
    };
    if (contextMessageId && i === 0) {
      body.context = { message_id: contextMessageId };
    }
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${creds.accessToken}`,
        },
        body: JSON.stringify(body),
      });
      const data = (await r.json().catch(() => ({}))) as { messages?: [{ id: string }]; error?: { message: string } };
      if (!r.ok) {
        void botLog("error", "whatsapp_send", "Envío texto falló", {
          phone: toPhone,
          error: data.error?.message ?? `HTTP ${r.status}`,
          metadata: { chunk: i + 1, total: chunks.length },
        });
        return { ok: false, error: data.error?.message ?? `HTTP ${r.status}` };
      }
      if (i === 0 && data.messages?.[0]?.id) firstMessageId = data.messages[0].id;
      if (i < chunks.length - 1) await new Promise((r) => setTimeout(r, 300));
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : "Error de envío";
      void botLog("error", "whatsapp_send", "Excepción enviando texto", { phone: toPhone, error: errMsg });
      return { ok: false, error: errMsg };
    }
  }
  return { ok: true, messageId: firstMessageId };
}

const CTA_RETRY_ATTEMPTS = 3;
const CTA_RETRY_DELAY_MS = 1000;

/**
 * Envía texto con reintentos. Garantiza hasta 3 intentos para mensajes críticos (ej. CTA bienvenida).
 */
export async function sendWhatsAppTextWithRetry(
  tenantId: string,
  toPhone: string,
  text: string,
  contextMessageId?: string
): Promise<SendResult> {
  let lastError: string | undefined;
  for (let attempt = 1; attempt <= CTA_RETRY_ATTEMPTS; attempt++) {
    const result = await sendWhatsAppText(tenantId, toPhone, text, contextMessageId);
    if (result.ok) return result;
    lastError = result.error;
    void botLog("warn", "whatsapp_send", `Reintento ${attempt}/${CTA_RETRY_ATTEMPTS} falló`, {
      phone: toPhone,
      error: lastError,
    });
    if (attempt < CTA_RETRY_ATTEMPTS) {
      await new Promise((r) => setTimeout(r, CTA_RETRY_DELAY_MS));
    }
  }
  return { ok: false, error: lastError ?? "Error tras reintentos" };
}

/**
 * Envía CTA con typing + garantía de envío (reintentos hasta 3 veces).
 * Usar para mensajes que deben llegar sí o sí (ej. tras fotos de bienvenida).
 */
export async function sendGuaranteedCtaWithTyping(
  tenantId: string,
  toPhone: string,
  messageId: string | undefined,
  ctaText: string
): Promise<SendResult> {
  if (messageId) {
    await sendWhatsAppTypingAndRead(tenantId, toPhone, messageId);
    await new Promise((r) => setTimeout(r, getRandomTypingDelayMs()));
  }
  return sendWhatsAppTextWithRetry(tenantId, toPhone, ctaText);
}

/**
 * Envía imagen por link directo (método estable). Meta descarga desde la URL y entrega al usuario.
 */
export async function sendWhatsAppImage(
  tenantId: string,
  toPhone: string,
  imageUrl: string,
  caption?: string,
  contextMessageId?: string
): Promise<SendResult> {
  const creds = await getWhatsAppCredentials(tenantId);
  if (!creds) {
    void botLog("error", "whatsapp_send", "Credenciales WhatsApp no configuradas", { phone: toPhone });
    return { ok: false, error: "WhatsApp no configurado" };
  }

  const phoneId = toPhone.replace(/\D/g, "");
  const messagesUrl = `https://graph.facebook.com/v18.0/${creds.phoneNumberId}/messages`;
  const imagePayload = { link: imageUrl, ...(caption && { caption }) };

  const body: Record<string, unknown> = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: phoneId,
    type: "image",
    image: imagePayload,
  };
  if (contextMessageId) body.context = { message_id: contextMessageId };

  try {
    const r = await fetch(messagesUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${creds.accessToken}`,
      },
      body: JSON.stringify(body),
    });
    const data = (await r.json().catch(() => ({}))) as { messages?: [{ id: string }]; error?: { message: string } };
    if (!r.ok) {
      const errMsg = data.error?.message ?? `HTTP ${r.status}`;
      void botLog("error", "whatsapp_send", "Envío imagen falló", { phone: toPhone, error: errMsg });
      return { ok: false, error: errMsg };
    }
    return { ok: true, messageId: data.messages?.[0]?.id };
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : "Error de envío";
    void botLog("error", "whatsapp_send", "Excepción enviando imagen", { phone: toPhone, error: errMsg });
    return { ok: false, error: errMsg };
  }
}

export async function sendWhatsAppVideo(
  tenantId: string,
  toPhone: string,
  videoUrl: string,
  caption?: string,
  contextMessageId?: string
): Promise<SendResult> {
  const creds = await getWhatsAppCredentials(tenantId);
  if (!creds) {
    void botLog("error", "whatsapp_send", "Credenciales WhatsApp no configuradas", { phone: toPhone });
    return { ok: false, error: "WhatsApp no configurado" };
  }

  const phoneId = toPhone.replace(/\D/g, "");
  const messagesUrl = `https://graph.facebook.com/v18.0/${creds.phoneNumberId}/messages`;
  const videoPayload = { link: videoUrl, ...(caption && { caption }) };

  const body: Record<string, unknown> = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: phoneId,
    type: "video",
    video: videoPayload,
  };
  if (contextMessageId) body.context = { message_id: contextMessageId };

  try {
    const r = await fetch(messagesUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${creds.accessToken}`,
      },
      body: JSON.stringify(body),
    });
    const data = (await r.json().catch(() => ({}))) as { messages?: [{ id: string }]; error?: { message: string } };
    if (!r.ok) {
      const errMsg = data.error?.message ?? `HTTP ${r.status}`;
      void botLog("error", "whatsapp_send", "Envío video falló", { phone: toPhone, error: errMsg });
      return { ok: false, error: errMsg };
    }
    return { ok: true, messageId: data.messages?.[0]?.id };
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : "Error de envío";
    void botLog("error", "whatsapp_send", "Excepción enviando video", { phone: toPhone, error: errMsg });
    return { ok: false, error: errMsg };
  }
}

export async function sendWhatsAppAudio(
  tenantId: string,
  toPhone: string,
  audioUrl: string,
  contextMessageId?: string
): Promise<SendResult> {
  const creds = await getWhatsAppCredentials(tenantId);
  if (!creds) {
    void botLog("error", "whatsapp_send", "Credenciales WhatsApp no configuradas", { phone: toPhone });
    return { ok: false, error: "WhatsApp no configurado" };
  }
  const phoneId = toPhone.replace(/\D/g, "");
  const messagesUrl = `https://graph.facebook.com/v18.0/${creds.phoneNumberId}/messages`;
  const body: Record<string, unknown> = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: phoneId,
    type: "audio",
    audio: { link: audioUrl },
  };
  if (contextMessageId) body.context = { message_id: contextMessageId };
  try {
    const r = await fetch(messagesUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${creds.accessToken}`,
      },
      body: JSON.stringify(body),
    });
    const data = (await r.json().catch(() => ({}))) as { messages?: [{ id: string }]; error?: { message: string } };
    if (!r.ok) {
      void botLog("error", "whatsapp_send", "Envío audio falló", { phone: toPhone, error: data.error?.message ?? `HTTP ${r.status}` });
      return { ok: false, error: data.error?.message ?? `HTTP ${r.status}` };
    }
    return { ok: true, messageId: data.messages?.[0]?.id };
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : "Error de envío";
    void botLog("error", "whatsapp_send", "Excepción enviando audio", { phone: toPhone, error: errMsg });
    return { ok: false, error: errMsg };
  }
}

export async function sendWhatsAppDocument(
  tenantId: string,
  toPhone: string,
  documentUrl: string,
  filename?: string,
  caption?: string,
  contextMessageId?: string
): Promise<SendResult> {
  const creds = await getWhatsAppCredentials(tenantId);
  if (!creds) {
    void botLog("error", "whatsapp_send", "Credenciales WhatsApp no configuradas", { phone: toPhone });
    return { ok: false, error: "WhatsApp no configurado" };
  }
  const phoneId = toPhone.replace(/\D/g, "");
  const messagesUrl = `https://graph.facebook.com/v18.0/${creds.phoneNumberId}/messages`;
  const documentPayload: { link: string; caption?: string; filename?: string } = { link: documentUrl };
  if (caption) documentPayload.caption = caption;
  if (filename) documentPayload.filename = filename;
  const body: Record<string, unknown> = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: phoneId,
    type: "document",
    document: documentPayload,
  };
  if (contextMessageId) body.context = { message_id: contextMessageId };
  try {
    const r = await fetch(messagesUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${creds.accessToken}`,
      },
      body: JSON.stringify(body),
    });
    const data = (await r.json().catch(() => ({}))) as { messages?: [{ id: string }]; error?: { message: string } };
    if (!r.ok) {
      void botLog("error", "whatsapp_send", "Envío documento falló", { phone: toPhone, error: data.error?.message ?? `HTTP ${r.status}` });
      return { ok: false, error: data.error?.message ?? `HTTP ${r.status}` };
    }
    return { ok: true, messageId: data.messages?.[0]?.id };
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : "Error de envío";
    void botLog("error", "whatsapp_send", "Excepción enviando documento", { phone: toPhone, error: errMsg });
    return { ok: false, error: errMsg };
  }
}

export type TemplateComponent = {
  type: "body" | "header" | "button";
  parameters?: Array<{ type: "text"; text: string }>;
};

/**
 * Envía una plantilla de WhatsApp (para reactivar conversación fuera de ventana 24h).
 */
export async function sendWhatsAppTemplate(
  tenantId: string,
  toPhone: string,
  templateName: string,
  languageCode: string,
  components?: TemplateComponent[]
): Promise<SendResult> {
  const creds = await getWhatsAppCredentials(tenantId);
  if (!creds) {
    void botLog("error", "whatsapp_send", "Credenciales WhatsApp no configuradas", { phone: toPhone });
    return { ok: false, error: "WhatsApp no configurado" };
  }
  const phoneId = toPhone.replace(/\D/g, "");
  const url = `https://graph.facebook.com/v18.0/${creds.phoneNumberId}/messages`;
  const template: { name: string; language: { code: string }; components?: TemplateComponent[] } = {
    name: templateName,
    language: { code: languageCode },
  };
  if (components && components.length > 0) {
    template.components = components;
  }
  const body = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: phoneId,
    type: "template",
    template,
  };
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${creds.accessToken}`,
      },
      body: JSON.stringify(body),
    });
    const data = (await r.json().catch(() => ({}))) as { messages?: [{ id: string }]; error?: { message: string } };
    if (!r.ok) {
      void botLog("error", "whatsapp_send", "Envío plantilla falló", {
        phone: toPhone,
        metadata: { templateName },
        error: data.error?.message ?? `HTTP ${r.status}`,
      });
      return { ok: false, error: data.error?.message ?? `HTTP ${r.status}` };
    }
    return { ok: true, messageId: data.messages?.[0]?.id };
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : "Error de envío";
    void botLog("error", "whatsapp_send", "Excepción enviando plantilla", { phone: toPhone, metadata: { templateName }, error: errMsg });
    return { ok: false, error: errMsg };
  }
}
