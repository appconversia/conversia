import { prisma } from "./db";
import type { BillingStatus } from "@prisma/client";

export type BillingGateResult =
  | { ok: true }
  | { ok: false; code: "expired" | "suspended" | "inactive" | "quota"; message: string };

function monthStart(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** Alinea periodo de uso mensual y resetea contador si cambió el mes. */
export async function ensureUsageMonthRollover(tenantId: string): Promise<void> {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) return;
  const now = new Date();
  const start = monthStart(now);
  const prev = tenant.usagePeriodMonthStart;
  if (!prev || monthStart(prev).getTime() !== start.getTime()) {
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        usagePeriodMonthStart: start,
        conversationsInPeriod: 0,
      },
    });
  }
}

export function totalConversationQuota(plan: {
  includedConversations: number;
  extraPackConversations: number;
} | null, extraPacks: number): number {
  const base = plan?.includedConversations ?? 100;
  const packSize = plan?.extraPackConversations ?? 1000;
  return base + extraPacks * packSize;
}

/** Aplica downgrade programado cuando llega la fecha efectiva. */
export async function applyPendingPlanIfNeeded(tenantId: string): Promise<void> {
  const t = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!t?.pendingPlanId || !t.pendingPlanEffectiveAt) return;
  if (new Date() < t.pendingPlanEffectiveAt) return;
  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      planId: t.pendingPlanId,
      pendingPlanId: null,
      pendingPlanEffectiveAt: null,
    },
  });
}

export async function getBillingGate(tenantId: string): Promise<BillingGateResult> {
  await applyPendingPlanIfNeeded(tenantId);

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { plan: true },
  });
  if (!tenant) {
    return { ok: false, code: "inactive", message: "Comercio no encontrado" };
  }
  if (!tenant.active) {
    return { ok: false, code: "inactive", message: "Comercio inactivo" };
  }
  if (tenant.billingStatus === "suspended") {
    return { ok: false, code: "suspended", message: "Cuenta suspendida" };
  }
  const now = new Date();
  if (tenant.subscriptionEndAt && tenant.subscriptionEndAt < now) {
    if (tenant.billingStatus !== "past_due") {
      await prisma.tenant.update({
        where: { id: tenantId },
        data: { billingStatus: "past_due" },
      });
    }
    return { ok: false, code: "expired", message: "Suscripción vencida" };
  }
  await ensureUsageMonthRollover(tenantId);
  const fresh = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { plan: true },
  });
  if (!fresh) return { ok: false, code: "inactive", message: "Comercio no encontrado" };

  const quota = totalConversationQuota(fresh.plan, fresh.extraConversationPacks);
  if (fresh.conversationsInPeriod >= quota) {
    return {
      ok: false,
      code: "quota",
      message: "Límite de conversaciones del periodo alcanzado",
    };
  }

  return { ok: true };
}

export async function incrementConversationUsage(tenantId: string): Promise<void> {
  await ensureUsageMonthRollover(tenantId);
  await prisma.tenant.update({
    where: { id: tenantId },
    data: { conversationsInPeriod: { increment: 1 } },
  });
}

export async function applySubscriptionPayment(params: {
  tenantId: string;
  monthsToAdd?: number;
}): Promise<void> {
  const months = params.monthsToAdd ?? 1;
  const tenant = await prisma.tenant.findUnique({ where: { id: params.tenantId } });
  if (!tenant) return;
  const base = tenant.subscriptionEndAt && tenant.subscriptionEndAt > new Date()
    ? tenant.subscriptionEndAt
    : new Date();
  const end = new Date(base);
  end.setMonth(end.getMonth() + months);
  await prisma.tenant.update({
    where: { id: params.tenantId },
    data: {
      billingStatus: "active" as BillingStatus,
      subscriptionStartAt: tenant.subscriptionStartAt ?? new Date(),
      subscriptionEndAt: end,
      cancelSubscriptionAtPeriodEnd: false,
      ...(tenant.pendingPlanId
        ? {
            /** El downgrade pendiente aplica al nuevo fin de periodo tras renovar. */
            pendingPlanEffectiveAt: end,
          }
        : {}),
    },
  });
}

/** Tras pagar un upgrade (prorrateo): cambia de plan sin alargar el periodo. */
export async function applyUpgradePayment(tenantId: string, targetPlanId: string): Promise<void> {
  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      planId: targetPlanId,
      billingStatus: "active" as BillingStatus,
      cancelSubscriptionAtPeriodEnd: false,
      pendingPlanId: null,
      pendingPlanEffectiveAt: null,
    },
  });
}

export async function applyExtraPackPayment(tenantId: string, packs = 1): Promise<void> {
  await prisma.tenant.update({
    where: { id: tenantId },
    data: { extraConversationPacks: { increment: packs } },
  });
}
