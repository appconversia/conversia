import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, isPlatformSuperAdmin } from "@/lib/auth";

const now = new Date();
const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
const startOfWeek = new Date(startOfToday);
startOfWeek.setDate(startOfWeek.getDate() - 7);

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const tenantScope = session.tenantId;
  const platformView = isPlatformSuperAdmin(session);

  if (!tenantScope && !platformView) {
    return NextResponse.json({ error: "Sin organización asignada" }, { status: 403 });
  }

  const convWhere = tenantScope ? { tenantId: tenantScope } : {};
  const msgWhere = tenantScope
    ? { conversation: { tenantId: tenantScope } }
    : {};
  const userWhere = tenantScope ? { tenantId: tenantScope } : {};
  const sessionUserWhere = tenantScope ? { user: { tenantId: tenantScope } } : {};

  try {
    const [
      totalConversations,
      unassignedConversations,
      assignedConversations,
      handoffPendingCount,
      messagesToday,
      messagesThisWeek,
      activeUsersCount,
      activeSessionsCount,
      botCounts,
      conversationsByDay,
      recentConversations,
      conversationsByAssignee,
    ] = await Promise.all([
      prisma.conversation.count({ where: convWhere }),
      prisma.conversation.count({
        where: { ...convWhere, assignedToId: null },
      }),
      prisma.conversation.count({
        where: { ...convWhere, assignedToId: { not: null } },
      }),
      prisma.conversation.count({
        where: {
          ...convWhere,
          channel: "bot",
          handoffRequestedAt: { not: null },
          assignedToId: null,
        },
      }),
      prisma.message.count({
        where: {
          ...msgWhere,
          createdAt: { gte: startOfToday },
        },
      }),
      prisma.message.count({
        where: {
          ...msgWhere,
          createdAt: { gte: startOfWeek },
        },
      }),
      prisma.user.count({ where: { ...userWhere, active: true } }),
      prisma.session.count({
        where: {
          expiresAt: { gt: now },
          ...sessionUserWhere,
        },
      }),
      getBotFlowCounts(tenantScope),
      getConversationsByDay(tenantScope),
      getRecentConversations(tenantScope),
      getConversationsByAssignee(tenantScope),
    ]);

    return NextResponse.json({
      scope: platformView ? "platform" : "tenant",
      conversations: {
        total: totalConversations,
        unassigned: unassignedConversations,
        assigned: assignedConversations,
        handoffPending: handoffPendingCount,
      },
      messages: {
        today: messagesToday,
        thisWeek: messagesThisWeek,
      },
      team: {
        activeUsers: activeUsersCount,
        activeSessions: activeSessionsCount,
      },
      bot: {
        flowsTotal: botCounts.total,
        flowsActive: botCounts.active,
      },
      activity: {
        conversationsByDay,
        recent: recentConversations,
        byAssignee: conversationsByAssignee,
      },
    });
  } catch (err) {
    console.error("GET /api/dashboard/stats error:", err);
    return NextResponse.json(
      { error: "Error al cargar estadísticas" },
      { status: 500 }
    );
  }
}

async function getBotFlowCounts(tenantId: string | null): Promise<{ total: number; active: number }> {
  try {
    const where = tenantId ? { tenantId } : {};
    const [total, active] = await Promise.all([
      prisma.botFlow.count({ where }),
      prisma.botFlow.count({ where: { ...where, isActive: true } }),
    ]);
    return { total, active };
  } catch {
    return { total: 0, active: 0 };
  }
}

async function getConversationsByDay(tenantId: string | null): Promise<{ date: string; count: number }[]> {
  const days: { date: string; count: number }[] = [];
  const baseWhere = tenantId ? { tenantId } : {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    const count = await prisma.conversation.count({
      where: {
        ...baseWhere,
        createdAt: { gte: start, lt: end },
      },
    });
    days.push({
      date: start.toISOString().slice(0, 10),
      count,
    });
  }
  return days;
}

async function getRecentConversations(tenantId: string | null) {
  const where = tenantId ? { tenantId } : {};
  const list = await prisma.conversation.findMany({
    where,
    take: 5,
    orderBy: { createdAt: "desc" },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      participants: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { content: true, createdAt: true },
      },
    },
  });
  return list.map((c) => {
    const firstOther = c.participants[0]?.user;
    return {
      id: c.id,
      channel: c.channel,
      assignedTo: c.assignedTo,
      otherUser: firstOther ? { id: firstOther.id, name: firstOther.name, email: firstOther.email } : null,
      lastMessage: c.messages[0],
      createdAt: c.createdAt.toISOString(),
    };
  });
}

async function getConversationsByAssignee(tenantId: string | null) {
  const where = tenantId ? { tenantId, assignedToId: { not: null } } : { assignedToId: { not: null } };
  const grouped = await prisma.conversation.groupBy({
    by: ["assignedToId"],
    where,
    _count: { id: true },
    orderBy: { _count: { assignedToId: "desc" } },
    take: 5,
  });
  const userIds = grouped.map((g) => g.assignedToId).filter(Boolean) as string[];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));
  return grouped.map((g) => ({
    userId: g.assignedToId,
    user: g.assignedToId ? userMap.get(g.assignedToId) : null,
    count: g._count.id,
  }));
}
