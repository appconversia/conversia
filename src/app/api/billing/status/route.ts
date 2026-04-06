import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getBillingGate, totalConversationQuota } from "@/lib/billing";

export async function GET() {
  const session = await getSession();
  if (!session?.tenantId) {
    return NextResponse.json({ error: "Solo cuentas de comercio" }, { status: 403 });
  }

  const [tenant, allPlans] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: session.tenantId },
      include: { plan: true, pendingPlan: true },
    }),
    prisma.plan.findMany({
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        maxUsers: true,
        sortOrder: true,
        priceUsdCents: true,
        includedConversations: true,
        extraPackConversations: true,
        extraPackPriceUsdCents: true,
        tagline: true,
      },
    }),
  ]);
  if (!tenant) {
    return NextResponse.json({ error: "Comercio no encontrado" }, { status: 404 });
  }

  const gate = await getBillingGate(session.tenantId);
  const quota = totalConversationQuota(tenant.plan, tenant.extraConversationPacks);
  const used = tenant.conversationsInPeriod;

  const payments = await prisma.paymentRecord.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { createdAt: "desc" },
    take: 24,
  });

  return NextResponse.json({
    ok: gate.ok,
    code: gate.ok ? undefined : gate.code,
    message: gate.ok ? undefined : gate.message,
    plans: allPlans,
    tenant: {
      name: tenant.name,
      billingStatus: tenant.billingStatus,
      subscriptionStartAt: tenant.subscriptionStartAt?.toISOString() ?? null,
      subscriptionEndAt: tenant.subscriptionEndAt?.toISOString() ?? null,
      cancelSubscriptionAtPeriodEnd: tenant.cancelSubscriptionAtPeriodEnd,
      extraConversationPacks: tenant.extraConversationPacks,
      conversationsInPeriod: used,
      quota,
      plan: tenant.plan
        ? {
            id: tenant.plan.id,
            name: tenant.plan.name,
            slug: tenant.plan.slug,
            priceUsdCents: tenant.plan.priceUsdCents,
            includedConversations: tenant.plan.includedConversations,
            extraPackConversations: tenant.plan.extraPackConversations,
            extraPackPriceUsdCents: tenant.plan.extraPackPriceUsdCents,
            tagline: tenant.plan.tagline,
          }
        : null,
      pendingPlan: tenant.pendingPlan
        ? {
            id: tenant.pendingPlan.id,
            name: tenant.pendingPlan.name,
            slug: tenant.pendingPlan.slug,
            priceUsdCents: tenant.pendingPlan.priceUsdCents,
            includedConversations: tenant.pendingPlan.includedConversations,
            tagline: tenant.pendingPlan.tagline,
          }
        : null,
      pendingPlanEffectiveAt: tenant.pendingPlanEffectiveAt?.toISOString() ?? null,
    },
    payments: payments.map((p) => ({
      id: p.id,
      amountUsdCents: p.amountUsdCents,
      status: p.status,
      type: p.type,
      description: p.description,
      checkoutUrl: p.checkoutUrl,
      createdAt: p.createdAt.toISOString(),
      paidAt: p.paidAt?.toISOString() ?? null,
    })),
  });
}
