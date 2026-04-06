import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { createBoldPaymentLink } from "@/lib/bold";
import { getBoldIdentityKey, isBoldSandbox } from "@/lib/platform-settings";
import { computeUpgradeProration } from "@/lib/billing-proration";
import { planAllowsExtraConversationPacks } from "@/lib/plan-catalog";

type CheckoutType = "subscription" | "renewal" | "upgrade" | "extra_pack";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.tenantId) {
    return NextResponse.json({ error: "Solo cuentas de comercio" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    type?: string;
    packs?: number;
    targetPlanId?: string;
  };

  let type: CheckoutType = "subscription";
  if (body.type === "extra_pack") type = "extra_pack";
  else if (body.type === "renewal") type = "renewal";
  else if (body.type === "upgrade") type = "upgrade";

  const packs = Math.min(24, Math.max(1, Number(body.packs) || 1));
  const targetPlanId = typeof body.targetPlanId === "string" ? body.targetPlanId.trim() : "";

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.tenantId },
    include: { plan: true },
  });
  if (!tenant?.plan) {
    return NextResponse.json({ error: "Asigna un plan al comercio" }, { status: 400 });
  }

  let amountUsdCents = 0;
  let desc = "";
  let recordType: string = type;
  let paymentTargetPlanId: string | null = null;

  if (type === "subscription" || type === "renewal") {
    amountUsdCents = tenant.plan.priceUsdCents;
    desc =
      type === "renewal"
        ? `Renovación ${tenant.plan.name} — ${tenant.name}`
        : `Suscripción ${tenant.plan.name} — ${tenant.name}`;
    recordType = type;
  } else if (type === "upgrade") {
    if (!targetPlanId) {
      return NextResponse.json({ error: "Indica targetPlanId para el upgrade" }, { status: 400 });
    }
    const target = await prisma.plan.findUnique({ where: { id: targetPlanId } });
    if (!target) {
      return NextResponse.json({ error: "Plan destino no encontrado" }, { status: 404 });
    }
    if (target.id === tenant.planId) {
      return NextResponse.json({ error: "Ya estás en ese plan" }, { status: 400 });
    }
    const pr = computeUpgradeProration({
      now: new Date(),
      subscriptionStartAt: tenant.subscriptionStartAt,
      subscriptionEndAt: tenant.subscriptionEndAt,
      currentPriceUsdCents: tenant.plan.priceUsdCents,
      newPriceUsdCents: target.priceUsdCents,
    });
    if (pr.amountUsdCents <= 0) {
      return NextResponse.json(
        { error: pr.summary || "El upgrade no tiene cargo. Usa programar cambio de plan para bajar de plan." },
        { status: 400 }
      );
    }
    amountUsdCents = pr.amountUsdCents;
    desc = `Upgrade a ${target.name} — ${pr.summary} — ${tenant.name}`;
    recordType = "upgrade";
    paymentTargetPlanId = target.id;
  } else {
    if (!planAllowsExtraConversationPacks(tenant.plan.slug)) {
      return NextResponse.json(
        {
          error:
            "Los packs extra (+1.000 conversaciones por US$15 c/u) solo están disponibles en el plan Empresa.",
        },
        { status: 403 }
      );
    }
    if (tenant.plan.extraPackPriceUsdCents <= 0) {
      return NextResponse.json({ error: "Packs extra no disponibles en tu plan." }, { status: 400 });
    }
    amountUsdCents = tenant.plan.extraPackPriceUsdCents * packs;
    desc = `${packs} pack(s) extra (+${tenant.plan.extraPackConversations * packs} conversaciones) — ${tenant.name}`;
    recordType = "extra_pack";
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
      type: recordType,
      description: desc,
      targetPlanId: paymentTargetPlanId,
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
