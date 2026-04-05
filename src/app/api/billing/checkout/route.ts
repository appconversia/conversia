import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { createBoldPaymentLink } from "@/lib/bold";
import { getBoldIdentityKey, isBoldSandbox } from "@/lib/platform-settings";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.tenantId) {
    return NextResponse.json({ error: "Solo cuentas de comercio" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    type?: string;
    packs?: number;
  };
  const type = body.type === "extra_pack" ? "extra_pack" : "subscription";
  const packs = Math.min(24, Math.max(1, Number(body.packs) || 1));

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.tenantId },
    include: { plan: true },
  });
  if (!tenant?.plan) {
    return NextResponse.json({ error: "Asigna un plan al comercio" }, { status: 400 });
  }

  let amountUsdCents = 0;
  let desc = "";
  if (type === "subscription") {
    amountUsdCents = tenant.plan.priceUsdCents;
    desc = `Suscripción ${tenant.plan.name} — ${tenant.name}`;
  } else {
    amountUsdCents = tenant.plan.extraPackPriceUsdCents * packs;
    desc = `${packs} pack(s) extra (+${tenant.plan.extraPackConversations * packs} conversaciones) — ${tenant.name}`;
  }

  if (amountUsdCents <= 0) {
    return NextResponse.json({ error: "Monto inválido" }, { status: 400 });
  }

  const identityKey = await getBoldIdentityKey();
  if (!identityKey) {
    return NextResponse.json(
      { error: "Bold no está configurado. El administrador de la plataforma debe guardar la llave en Pagos." },
      { status: 503 }
    );
  }

  const reference = `conv_${tenant.id}_${randomBytes(8).toString("hex")}`;
  const amountUsd = amountUsdCents / 100;

  const link = await createBoldPaymentLink({
    identityKey,
    amountUsd,
    description: desc,
    reference,
    isSandbox: await isBoldSandbox(),
  });

  if (!link.ok) {
    return NextResponse.json({ error: link.error }, { status: 502 });
  }

  await prisma.paymentRecord.create({
    data: {
      tenantId: tenant.id,
      amountUsdCents,
      currency: "USD",
      status: "pending",
      type,
      description: desc,
      boldLinkId: link.paymentLink,
      checkoutUrl: link.checkoutUrl,
      reference,
      packCount: type === "extra_pack" ? packs : null,
    },
  });

  return NextResponse.json({
    checkoutUrl: link.checkoutUrl,
    boldLinkId: link.paymentLink,
    reference,
  });
}
