import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
  const session = await getSession();
  if (!session?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // Asegurar que el usuario tenga participación en cada conversación (para marcar leídos)
  const convIds = await prisma.conversation.findMany({ select: { id: true } });
  const myParts = await prisma.conversationParticipant.findMany({
    where: { userId: session.id, conversationId: { in: convIds.map((c) => c.id) } },
    select: { conversationId: true },
  });
  const myConvIds = new Set(myParts.map((p) => p.conversationId));
  const epoch = new Date(0);
  await Promise.all(
    convIds
      .filter((c) => !myConvIds.has(c.id))
      .map((c) =>
        prisma.conversationParticipant.upsert({
          where: { conversationId_userId: { conversationId: c.id, userId: session.id } },
          create: { conversationId: c.id, userId: session.id, joinedAt: epoch },
          update: {},
        })
      )
  );

  // Lectura global: cuando cualquier usuario lee, todos ven 0 no leídos
  const unreadRows = await prisma.$queryRaw<{ conversationId: string; unread: bigint }[]>`
    SELECT m."conversationId", COUNT(*)::int as unread
    FROM "Message" m
    INNER JOIN "Conversation" conv ON conv."id" = m."conversationId"
    WHERE m."createdAt" > COALESCE(conv."lastReadAt", to_timestamp(0))
    AND (
      (conv."channel" = 'bot' AND m."senderContactId" IS NOT NULL)
      OR (conv."channel" = 'direct' AND m."senderId" IS NOT NULL AND m."senderId" != ${session.id})
    )
    GROUP BY m."conversationId"
  `;
  const unreadMap = new Map<string, number>();
  for (const row of unreadRows) {
    unreadMap.set(row.conversationId, Number(row.unread));
  }

  // Último mensaje del cliente por conversación (para ventana 24h de WhatsApp)
  const lastFromContactMap = new Map<string, Date>();
  try {
    const lastFromContactRows = await prisma.$queryRaw<
      { conversationId: string; createdAt: Date }[]
    >`
      SELECT DISTINCT ON (m."conversationId") m."conversationId", m."createdAt"
      FROM "Message" m
      INNER JOIN "Conversation" conv ON conv."id" = m."conversationId"
      WHERE m."senderContactId" IS NOT NULL
         OR (m."senderId" IS NOT NULL AND m."senderId" != ${session.id})
      ORDER BY m."conversationId", m."createdAt" DESC
    `;
    for (const row of lastFromContactRows) {
      lastFromContactMap.set(row.conversationId, row.createdAt);
    }
  } catch (err) {
    console.warn("[conversations] lastMessageFromContactAt query failed:", err);
  }

  const isAdmin = ["super_admin", "admin"].includes(String(session.role ?? "").toLowerCase());
  const convosRaw = await prisma.conversation.findMany({
    include: {
      contact: { select: { id: true, phone: true, name: true } },
      assignedTo: { select: { id: true, email: true, name: true } },
      conversationTag: { select: { id: true, name: true, slug: true } },
      participants: {
        include: { user: { select: { id: true, email: true, name: true } } },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          sender: { select: { id: true, name: true } },
          senderContact: { select: { id: true, name: true, phone: true } },
        },
      },
    },
  });

  const convos = isAdmin ? convosRaw : convosRaw.filter((c) => !c.restricted);

  convos.sort((a, b) => {
    const tA = a.messages[0]?.createdAt?.getTime() ?? a.createdAt.getTime();
    const tB = b.messages[0]?.createdAt?.getTime() ?? b.createdAt.getTime();
    return tB - tA;
  });

  let countTodas = 0;
  let countBot = 0;
  let countSinAsignar = 0;
  let countAsistidas = 0;

  const convosFiltered = convos.filter((c) => c.channel !== "group");

  const result = convosFiltered.map((c) => {
    const last = c.messages[0];
    let otherUser: { id: string; email: string; name: string | null } | null = null;
    if (c.channel === "bot" && c.contact) {
      otherUser = {
        id: c.contact.id,
        email: c.contact.phone,
        name: c.contact.name,
      };
    } else {
      const other = c.participants.find((p) => p.userId !== session.id)?.user;
      otherUser =
        other ?? (c.participants[0]?.user ? { id: c.participants[0].user.id, email: c.participants[0].user.email, name: c.participants[0].user.name } : null);
    }

    const unreadCount = unreadMap.get(c.id) ?? 0;
    const handoffPending = c.channel === "bot" && !!c.handoffRequestedAt && !c.assignedToId;
    const hasUnreadMessages = unreadCount > 0;
    const needsAttention = hasUnreadMessages || handoffPending;

    if (needsAttention) {
      countTodas += 1;
      if (c.channel === "bot" && !c.handoffRequestedAt && !c.assignedToId) countBot += 1;
      else if (c.channel === "bot" && c.handoffRequestedAt && !c.assignedToId) countSinAsignar += 1;
      else if (c.assignedToId) countAsistidas += 1;
    }

    return {
      id: c.id,
      channel: c.channel,
      handoffRequestedAt: c.handoffRequestedAt?.toISOString() ?? null,
      handoffPending,
      restricted: c.restricted,
      conversationTag: c.conversationTag ? { id: c.conversationTag.id, name: c.conversationTag.name, slug: c.conversationTag.slug } : null,
      otherUser: otherUser ? { id: otherUser.id, email: otherUser.email, name: otherUser.name } : null,
      assignedTo: c.assignedTo ? { id: c.assignedTo.id, email: c.assignedTo.email, name: c.assignedTo.name } : null,
      lastMessage: last
        ? {
            content: last.content,
            createdAt: last.createdAt.toISOString(),
            senderId: last.senderId ?? last.senderContactId,
          }
        : null,
      unreadCount,
      unread: needsAttention,
      lastMessageFromContactAt: lastFromContactMap.get(c.id)?.toISOString() ?? null,
    };
  });

  return NextResponse.json({
    conversations: result,
    unreadByTab: {
      todas: countTodas,
      bot: countBot,
      sin_asignar: countSinAsignar,
      asistidas: countAsistidas,
    },
  });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("GET /api/conversations error:", msg, stack);
    return NextResponse.json(
      { error: "Error al cargar conversaciones", details: process.env.NODE_ENV === "development" ? msg : undefined },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const role = String(session.role ?? "").toLowerCase();
  if (role !== "admin" && role !== "super_admin") {
    return NextResponse.json(
      { error: "Solo administradores pueden iniciar conversaciones. Ustedes solo reciben." },
      { status: 403 }
    );
  }

  const body = await request.json();
  const otherUserId = body.userId as string | undefined;
  if (!otherUserId || otherUserId === session.id) {
    return NextResponse.json({ error: "Usuario inválido" }, { status: 400 });
  }

  const myParticipation = await prisma.conversationParticipant.findMany({
    where: { userId: session.id },
    select: { conversationId: true },
  });
  const otherParticipation = await prisma.conversationParticipant.findMany({
    where: { userId: otherUserId },
    select: { conversationId: true },
  });
  const myConvIds = new Set(myParticipation.map((p) => p.conversationId));
  const sharedConvId = otherParticipation.find((p) => myConvIds.has(p.conversationId))?.conversationId;

  if (sharedConvId) {
    const existing = await prisma.conversation.findUnique({
      where: { id: sharedConvId },
      include: { participants: true },
    });
    if (existing && existing.participants.length >= 2) {
      return NextResponse.json({ conversation: { id: existing.id } });
    }
  }

  const conversation = await prisma.conversation.create({
    data: {
      participants: {
        create: [{ userId: session.id }, { userId: otherUserId }],
      },
    },
  });

  return NextResponse.json({ conversation: { id: conversation.id } });
}
