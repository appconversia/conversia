import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePlatformSession } from "@/lib/tenant-session";

const now = new Date();
const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
const startOfWeek = new Date(startOfToday);
startOfWeek.setDate(startOfWeek.getDate() - 7);

export async function GET() {
  const gate = await requirePlatformSession();
  if (!gate.ok) return gate.response;

  try {
    const [
      tenantsTotal,
      tenantsActive,
      usersTotal,
      conversations7d,
      messagesToday,
      messagesWeek,
      plans,
    ] = await Promise.all([
      prisma.tenant.count(),
      prisma.tenant.count({ where: { active: true } }),
      prisma.user.count({ where: { tenantId: { not: null } } }),
      prisma.conversation.count({ where: { createdAt: { gte: startOfWeek } } }),
      prisma.message.count({ where: { createdAt: { gte: startOfToday } } }),
      prisma.message.count({ where: { createdAt: { gte: startOfWeek } } }),
      prisma.plan.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true, slug: true } }),
    ]);

    const tenantsByPlan = await prisma.tenant.groupBy({
      by: ["planId"],
      _count: { id: true },
    });

    const recentTenants = await prisma.tenant.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      include: {
        plan: { select: { name: true, slug: true } },
        _count: { select: { users: true } },
      },
    });

    return NextResponse.json({
      tenantsTotal,
      tenantsActive,
      usersTotal,
      conversations7d,
      messagesToday,
      messagesWeek,
      plans,
      tenantsByPlan,
      recentTenants: recentTenants.map((t) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        active: t.active,
        createdAt: t.createdAt.toISOString(),
        planName: t.plan?.name ?? null,
        userCount: t._count.users,
      })),
    });
  } catch (e) {
    console.error("[platform/stats]", e);
    return NextResponse.json({ error: "Error al cargar estadísticas" }, { status: 500 });
  }
}
