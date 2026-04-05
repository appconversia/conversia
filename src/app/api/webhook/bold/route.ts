import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { applyExtraPackPayment, applySubscriptionPayment } from "@/lib/billing";
import { verifyBoldWebhookSignature } from "@/lib/bold";
import { getBoldSecretKey, isBoldSandbox } from "@/lib/platform-settings";

export const runtime = "nodejs";

/**
 * Webhook Bold (CloudEvents) — Panel Comercios → Integraciones → Webhooks.
 * URL: https://TU_DOMINIO/api/webhook/bold
 * Firma: https://developers.bold.co/webhook (x-bold-signature, llave secreta Botón de pagos)
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature =
    request.headers.get("x-bold-signature") ??
    request.headers.get("x-bold-Signature") ??
    request.headers.get("X-Bold-Signature");

  const isSandbox = await isBoldSandbox();
  const secretFromDb = await getBoldSecretKey();
  /** Producción: llave secreta obligatoria. Sandbox/pruebas: string vacío según doc Bold. */
  const secretKey = isSandbox ? "" : (secretFromDb ?? "");

  if (!isSandbox && !secretFromDb?.trim()) {
    console.error("[webhook/bold] Falta BOLD_SECRET_KEY en plataforma (llave secreta Botón de pagos).");
    return NextResponse.json({ error: "Webhook no configurado (llave secreta)" }, { status: 503 });
  }

  if (!verifyBoldWebhookSignature(rawBody, signature, secretKey)) {
    return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const eventType = String(payload.type ?? "");
  if (eventType !== "SALE_APPROVED") {
    return NextResponse.json({ received: true, ignored: eventType || "unknown" });
  }

  const data = payload.data as Record<string, unknown> | undefined;
  const metadata = data?.metadata as Record<string, unknown> | undefined;
  const refFromMeta =
    metadata && typeof metadata.reference === "string" ? metadata.reference.trim() : "";

  const subject = typeof payload.subject === "string" ? payload.subject.trim() : "";
  const paymentId = typeof data?.payment_id === "string" ? data.payment_id.trim() : "";

  let record =
    refFromMeta.length > 0
      ? await prisma.paymentRecord.findFirst({
          where: { reference: refFromMeta },
        })
      : null;

  if (!record && subject.length > 0) {
    record = await prisma.paymentRecord.findFirst({
      where: { OR: [{ boldLinkId: subject }, { reference: subject }] },
    });
  }

  if (!record && paymentId.length > 0) {
    record = await prisma.paymentRecord.findFirst({
      where: { OR: [{ boldLinkId: paymentId }, { reference: paymentId }] },
    });
  }

  if (!record) {
    const linkHint = rawBody.match(/LNK_[A-Za-z0-9]+/);
    if (linkHint) {
      record = await prisma.paymentRecord.findFirst({
        where: { boldLinkId: linkHint[0] },
      });
    }
  }

  if (!record) {
    console.warn("[webhook/bold] Sin PaymentRecord. ref=", refFromMeta, "subject=", subject);
    return NextResponse.json({ received: true, pending: true });
  }

  if (record.status === "paid") {
    return NextResponse.json({ received: true, duplicate: true });
  }

  await prisma.paymentRecord.update({
    where: { id: record.id },
    data: { status: "paid", paidAt: new Date() },
  });

  if (record.type === "subscription") {
    await applySubscriptionPayment({ tenantId: record.tenantId, monthsToAdd: 1 });
  } else if (record.type === "extra_pack") {
    const price = await getPackPrice(record.tenantId);
    const packs = record.packCount ?? Math.max(1, Math.round(record.amountUsdCents / price));
    await applyExtraPackPayment(record.tenantId, packs);
  }

  return NextResponse.json({ ok: true });
}

async function getPackPrice(tenantId: string): Promise<number> {
  const t = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { plan: true },
  });
  return t?.plan?.extraPackPriceUsdCents ?? 1500;
}
