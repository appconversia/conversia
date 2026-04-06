import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { computeUpgradeProration } from "@/lib/billing-proration";

/** Vista previa de prorrateo para upgrade (sin crear pago). */
export async function GET(request: Request) {
  const session = await getSession();
  if (!session?.tenantId) {
    return NextResponse.json({ error: "Solo cuentas de comercio" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const targetPlanId = searchParams.get("targetPlanId")?.trim() ?? "";
  if (!targetPlanId) {
    return NextResponse.json({ error: "Falta targetPlanId" }, { status: 400 });
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.tenantId },
    include: { plan: true },
  });
  if (!tenant?.plan) {
    return NextResponse.json({ error: "Sin plan asignado" }, { status: 400 });
  }

  const target = await prisma.plan.findUnique({ where: { id: targetPlanId } });
  if (!target) {
    return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 });
  }

  const pr = computeUpgradeProration({
    now: new Date(),
    subscriptionStartAt: tenant.subscriptionStartAt,
    subscriptionEndAt: tenant.subscriptionEndAt,
    currentPriceUsdCents: tenant.plan.priceUsdCents,
    newPriceUsdCents: target.priceUsdCents,
  });

  return NextResponse.json({
    currentPlan: {
      id: tenant.plan.id,
      name: tenant.plan.name,
      slug: tenant.plan.slug,
      priceUsdCents: tenant.plan.priceUsdCents,
    },
    targetPlan: {
      id: target.id,
      name: target.name,
      slug: target.slug,
      priceUsdCents: target.priceUsdCents,
      includedConversations: target.includedConversations,
      tagline: target.tagline,
    },
    proration: {
      amountUsdCents: pr.amountUsdCents,
      summary: pr.summary,
      fractionRemaining: pr.fractionRemaining,
      usedProration: pr.usedProration,
    },
  });
}
