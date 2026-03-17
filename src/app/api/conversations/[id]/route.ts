import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;

  const conv = await prisma.conversation.findUnique({
    where: { id },
    include: {
      contact: { select: { id: true, phone: true, name: true } },
      assignedTo: { select: { id: true, email: true, name: true } },
      participants: {
        include: { user: { select: { id: true, email: true, name: true } } },
      },
      _count: { select: { messages: true } },
    },
  });

  if (!conv) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  let otherUser: { id: string; email: string; name: string | null } | null = null;
  if (conv.channel === "bot" && conv.contact) {
    otherUser = { id: conv.contact.id, email: conv.contact.phone, name: conv.contact.name };
  } else {
    const other = conv.participants.find((p) => p.userId !== session.id)?.user ?? conv.participants[0]?.user;
    otherUser = other ? { id: other.id, email: other.email, name: other.name } : null;
  }
  const participants = conv.participants.map((p) => ({ id: p.user.id, email: p.user.email, name: p.user.name }));
  const messagesCount = (conv as { _count?: { messages: number } })._count?.messages ?? 0;
  return NextResponse.json({
    conversation: {
      id: conv.id,
      channel: conv.channel,
      handoffRequestedAt: conv.handoffRequestedAt?.toISOString() ?? null,
      restricted: conv.restricted,
      otherUser: otherUser,
      assignedTo: conv.assignedTo ? { id: conv.assignedTo.id, email: conv.assignedTo.email, name: conv.assignedTo.name } : null,
      participants,
      contact: conv.contact ? { id: conv.contact.id, phone: conv.contact.phone, name: conv.contact.name } : null,
      messagesCount,
      createdAt: conv.createdAt.toISOString(),
    },
  });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("GET /api/conversations/[id] error:", msg);
    return NextResponse.json(
      { error: "Error al cargar conversación", details: process.env.NODE_ENV === "development" ? msg : undefined },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const conv = await prisma.conversation.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!conv) {
    return NextResponse.json({ error: "Conversación no encontrada" }, { status: 404 });
  }

  await prisma.lead.updateMany({ where: { conversationId: id }, data: { conversationId: null } });
  await prisma.conversation.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
