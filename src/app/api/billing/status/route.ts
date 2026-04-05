import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getBillingGate, totalConversationQuota } from "@/lib/billing";

export async function GET() {
  const session = await getSession();
  if (!session?.tenantId) {
    return NextResponse.json({ error: "Solo cuentas de comercio" }, { status: 403 });
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.tenantId },
    include: { plan: true },
  });
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
    tenant: {
      name: tenant.name,
      billingStatus: tenant.billingStatus,
      subscriptionStartAt: tenant.subscriptionStartAt?.toISOString() ?? null,
      subscriptionEndAt: tenant.subscriptionEndAt?.toISOString() ?? null,
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
