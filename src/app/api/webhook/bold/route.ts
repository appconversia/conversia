import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { applyExtraPackPayment, applySubscriptionPayment } from "@/lib/billing";

/**
 * Webhook Bold — configurar en el panel Bold la URL pública: /api/webhook/bold
 * El payload exacto puede variar; intentamos localizar payment_link / id y estado PAID.
 */
export async function POST(request: Request) {
  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const status = String(
    payload.status ?? (payload.data as Record<string, unknown>)?.status ?? ""
  ).toUpperCase();
  const linkId = String(
    payload.payment_link ??
      payload.id ??
      (payload.data as Record<string, unknown>)?.payment_link ??
      (payload.payload as Record<string, unknown>)?.payment_link ??
      ""
  );

  if (!linkId || status !== "PAID" && status !== "APPROVED") {
    // Algunos webhooks envían otro formato; si viene transaction aprobada:
    const alt = String(payload.type ?? "");
    if (!linkId && alt !== "PAYMENT_APPROVED") {
      return NextResponse.json({ received: true });
    }
  }

  const record = linkId
    ? await prisma.paymentRecord.findFirst({
        where: { boldLinkId: linkId },
      })
    : null;

  if (!record) {
    console.warn("[webhook/bold] Sin PaymentRecord para link", linkId, JSON.stringify(payload).slice(0, 500));
    return NextResponse.json({ received: true });
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
