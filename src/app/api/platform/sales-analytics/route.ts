import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requirePlatformSession } from "@/lib/tenant-session";

export const runtime = "nodejs";

type RangeKey = "today" | "yesterday" | "7d" | "30d" | "month" | "year" | "all" | "custom";

function parseRange(
  range: string,
  fromStr: string | null,
  toStr: string | null
): { key: RangeKey; from: Date; to: Date; label: string } {
  const now = new Date();
  if (fromStr && toStr) {
    const from = new Date(fromStr);
    const to = new Date(toStr);
    if (!Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime())) {
      from.setHours(0, 0, 0, 0);
      to.setHours(23, 59, 59, 999);
      return { key: "custom", from, to, label: "Personalizado" };
    }
  }

  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const start = new Date(now);

  switch (range as RangeKey) {
    case "today": {
      start.setHours(0, 0, 0, 0);
      return { key: "today", from: start, to: end, label: "Hoy" };
    }
    case "yesterday": {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      y.setHours(0, 0, 0, 0);
      const ye = new Date(y);
      ye.setHours(23, 59, 59, 999);
      return { key: "yesterday", from: y, to: ye, label: "Ayer" };
    }
    case "7d": {
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      return { key: "7d", from: start, to: end, label: "Últimos 7 días" };
    }
    case "30d": {
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      return { key: "30d", from: start, to: end, label: "Últimos 30 días" };
    }
    case "month": {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      return { key: "month", from: start, to: end, label: "Mes en curso" };
    }
    case "year": {
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      return { key: "year", from: start, to: end, label: "Año en curso" };
    }
    case "all": {
      const ancient = new Date(2020, 0, 1);
      start.setTime(ancient.getTime());
      return { key: "all", from: start, to: end, label: "Todo el historial" };
    }
    default: {
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      return { key: "30d", from: start, to: end, label: "Últimos 30 días" };
    }
  }
}

function eachDay(from: Date, to: Date): string[] {
  const days: string[] = [];
  const cur = new Date(from);
  cur.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(23, 59, 59, 999);
  while (cur <= end) {
    days.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

function centsToUsd(cents: number): string {
  return (cents / 100).toFixed(2);
}

export async function GET(request: Request) {
  const gate = await requirePlatformSession();
  if (!gate.ok) return gate.response;

  const { searchParams } = new URL(request.url);
  const rangeParam = searchParams.get("range") ?? "30d";
  const { from, to, label, key } = parseRange(rangeParam, searchParams.get("from"), searchParams.get("to"));

  try {
    const [paidAgg, pendingCount, byType, tenantsByPlanRaw, billingCounts, plans] = await Promise.all([
      prisma.paymentRecord.aggregate({
        where: { status: "paid", paidAt: { gte: from, lte: to } },
        _sum: { amountUsdCents: true },
        _count: true,
      }),
      prisma.paymentRecord.count({
        where: { status: "pending", createdAt: { gte: from, lte: to } },
      }),
      prisma.paymentRecord.groupBy({
        by: ["type"],
        where: { status: "paid", paidAt: { gte: from, lte: to } },
        _sum: { amountUsdCents: true },
        _count: true,
      }),
      prisma.tenant.groupBy({
        by: ["planId"],
        _count: { id: true },
      }),
      prisma.tenant.groupBy({
        by: ["billingStatus"],
        _count: { id: true },
      }),
      prisma.plan.findMany({ orderBy: { sortOrder: "asc" } }),
    ]);

    const newTenantsCount = await prisma.tenant.count({
      where: { createdAt: { gte: from, lte: to } },
    });

    const newUsersCount = await prisma.user.count({
      where: { tenantId: { not: null }, createdAt: { gte: from, lte: to } },
    });

    const newActiveSubs = await prisma.tenant.count({
      where: {
        billingStatus: "active",
        subscriptionStartAt: { gte: from, lte: to },
      },
    });

    const revenueRows = await prisma.$queryRaw<Array<{ day: Date; total: bigint; cnt: bigint }>>(
      Prisma.sql`
        SELECT DATE_TRUNC('day', "paidAt") AS day,
               SUM("amountUsdCents")::bigint AS total,
               COUNT(*)::bigint AS cnt
        FROM "PaymentRecord"
        WHERE "status" = 'paid'
          AND "paidAt" >= ${from}
          AND "paidAt" <= ${to}
        GROUP BY 1
        ORDER BY 1 ASC
      `
    );

    const tenantDayRows = await prisma.$queryRaw<Array<{ day: Date; cnt: bigint }>>(
      Prisma.sql`
        SELECT DATE_TRUNC('day', "createdAt") AS day,
               COUNT(*)::bigint AS cnt
        FROM "Tenant"
        WHERE "createdAt" >= ${from}
          AND "createdAt" <= ${to}
        GROUP BY 1
        ORDER BY 1 ASC
      `
    );

    const userDayRows = await prisma.$queryRaw<Array<{ day: Date; cnt: bigint }>>(
      Prisma.sql`
        SELECT DATE_TRUNC('day', "createdAt") AS day,
               COUNT(*)::bigint AS cnt
        FROM "User"
        WHERE "tenantId" IS NOT NULL
          AND "createdAt" >= ${from}
          AND "createdAt" <= ${to}
        GROUP BY 1
        ORDER BY 1 ASC
      `
    );

    const dayKeys = eachDay(from, to);
    const revMap = new Map<string, { usdCents: number; count: number }>();
    for (const r of revenueRows) {
      const k = new Date(r.day).toISOString().slice(0, 10);
      revMap.set(k, { usdCents: Number(r.total), count: Number(r.cnt) });
    }
    const tenantMap = new Map<string, number>();
    for (const r of tenantDayRows) {
      tenantMap.set(new Date(r.day).toISOString().slice(0, 10), Number(r.cnt));
    }
    const userMap = new Map<string, number>();
    for (const r of userDayRows) {
      userMap.set(new Date(r.day).toISOString().slice(0, 10), Number(r.cnt));
    }

    const revenueByDay = dayKeys.map((d) => ({
      date: d,
      usdCents: revMap.get(d)?.usdCents ?? 0,
      paymentCount: revMap.get(d)?.count ?? 0,
    }));

    const newTenantsByDay = dayKeys.map((d) => ({
      date: d,
      count: tenantMap.get(d) ?? 0,
    }));

    const newUsersByDay = dayKeys.map((d) => ({
      date: d,
      count: userMap.get(d) ?? 0,
    }));

    const planById = new Map(plans.map((p) => [p.id, p]));
    const tenantsByPlan = tenantsByPlanRaw.map((row) => {
      const p = row.planId ? planById.get(row.planId) : null;
      return {
        planId: row.planId,
        planName: p?.name ?? "Sin plan",
        planSlug: p?.slug ?? null,
        tenantCount: row._count.id,
        priceUsdCents: p?.priceUsdCents ?? 0,
        mrrIfAllActiveUsdCents: (p?.priceUsdCents ?? 0) * row._count.id,
      };
    });

    const activeTenants = await prisma.tenant.findMany({
      where: { billingStatus: "active", planId: { not: null } },
      include: { plan: true },
    });
    const mrrSnapshotUsdCents = activeTenants.reduce((s, t) => s + (t.plan?.priceUsdCents ?? 0), 0);

    const tenantsActiveCount = await prisma.tenant.count({ where: { active: true } });

    const recentPayments = await prisma.paymentRecord.findMany({
      where: { status: "paid", paidAt: { gte: from, lte: to } },
      orderBy: { paidAt: "desc" },
      take: 25,
      include: {
        tenant: { select: { name: true, slug: true } },
      },
    });

    const topTenantsRaw = await prisma.paymentRecord.groupBy({
      by: ["tenantId"],
      where: { status: "paid", paidAt: { gte: from, lte: to } },
      _sum: { amountUsdCents: true },
      _count: { id: true },
    });
    const topSorted = [...topTenantsRaw]
      .sort((a, b) => (b._sum.amountUsdCents ?? 0) - (a._sum.amountUsdCents ?? 0))
      .slice(0, 10);
    const topIds = topSorted.map((t) => t.tenantId);
    const topTenantsInfo = await prisma.tenant.findMany({
      where: { id: { in: topIds } },
      select: { id: true, name: true, slug: true },
    });
    const infoMap = new Map(topTenantsInfo.map((t) => [t.id, t]));
    const topTenantsByRevenue = topSorted.map((t) => ({
      tenantId: t.tenantId,
      name: infoMap.get(t.tenantId)?.name ?? "—",
      slug: infoMap.get(t.tenantId)?.slug ?? "",
      revenueUsdCents: t._sum.amountUsdCents ?? 0,
      paymentCount: t._count.id,
    }));

    const revenueUsdCents = paidAgg._sum.amountUsdCents ?? 0;
    const failedInPeriod = await prisma.paymentRecord.count({
      where: { status: "failed", createdAt: { gte: from, lte: to } },
    });

    return NextResponse.json({
      range: {
        key,
        label,
        from: from.toISOString(),
        to: to.toISOString(),
      },
      summary: {
        revenueUsdCents,
        revenueUsd: centsToUsd(revenueUsdCents),
        paymentsPaidCount: paidAgg._count,
        pendingPaymentsCount: pendingCount,
        failedPaymentsCount: failedInPeriod,
        subscriptionPayments: {
          count: byType.find((x) => x.type === "subscription")?._count ?? 0,
          usdCents: byType.find((x) => x.type === "subscription")?._sum.amountUsdCents ?? 0,
        },
        extraPackPayments: {
          count: byType.find((x) => x.type === "extra_pack")?._count ?? 0,
          usdCents: byType.find((x) => x.type === "extra_pack")?._sum.amountUsdCents ?? 0,
        },
        newComerciosCount: newTenantsCount,
        newUsersColaboradoresCount: newUsersCount,
        newActivationsBillingActive: newActiveSubs,
        tenantsActiveTotal: tenantsActiveCount,
        mrrSnapshotUsdCents,
        mrrSnapshotUsd: centsToUsd(mrrSnapshotUsdCents),
        arrEstimateUsd: centsToUsd(mrrSnapshotUsdCents * 12),
      },
      tenantsByBillingStatus: Object.fromEntries(
        billingCounts.map((b) => [b.billingStatus, b._count.id])
      ),
      tenantsByPlan,
      series: {
        revenueByDay,
        newTenantsByDay,
        newUsersByDay,
      },
      recentPayments: recentPayments.map((p) => ({
        id: p.id,
        tenantName: p.tenant.name,
        tenantSlug: p.tenant.slug,
        amountUsdCents: p.amountUsdCents,
        amountUsd: centsToUsd(p.amountUsdCents),
        type: p.type,
        status: p.status,
        paidAt: p.paidAt?.toISOString() ?? null,
        description: p.description,
      })),
      topTenantsByRevenue: topTenantsByRevenue.map((t) => ({
        ...t,
        revenueUsd: centsToUsd(t.revenueUsdCents),
      })),
    });
  } catch (e) {
    console.error("[platform/sales-analytics]", e);
    return NextResponse.json({ error: "Error al cargar analíticas de ventas" }, { status: 500 });
  }
}
