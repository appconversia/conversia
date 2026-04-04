import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

const ADMIN_ROLES = ["super_admin", "admin"];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id: conversationId } = await params;
  let body: { take?: boolean; assignToUserId?: string; assignToBot?: boolean } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo de solicitud inválido" }, { status: 400 });
  }
  const take = body.take === true;
  const assignToUserId = typeof body.assignToUserId === "string" ? body.assignToUserId : undefined;
  const assignToBot = body.assignToBot === true;

  const conv = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      participants: { select: { userId: true } },
    },
  });

  if (!conv) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  if (session.tenantId && session.tenantId !== conv.tenantId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const tenantId = conv.tenantId;
  const isAdmin = ADMIN_ROLES.includes(session.role);
  const assignedToSomeoneElse = conv.assignedToId && conv.assignedToId !== session.id;

  if (assignToBot) {
    if (!isAdmin) {
      return NextResponse.json({ error: "Solo administradores pueden devolver la conversación al bot" }, { status: 403 });
    }
    if (conv.channel !== "bot") {
      return NextResponse.json({ error: "Solo conversaciones del canal bot pueden volver al bot" }, { status: 400 });
    }
    const botTag = await prisma.conversationTag.findUnique({
      where: { tenantId_slug: { tenantId, slug: "bot" } },
      select: { id: true },
    });
    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        handoffRequestedAt: null,
        assignedToId: null,
        ...(botTag && { conversationTagId: botTag.id }),
      },
    });
    return NextResponse.json({ assignedTo: null, backToBot: true });
  }

  if (assignToUserId) {
    if (!isAdmin) {
      return NextResponse.json({ error: "Solo administradores pueden asignar a otro usuario" }, { status: 403 });
    }
    const targetUser = await prisma.user.findFirst({
      where: { id: assignToUserId, active: true, tenantId },
      select: { id: true, name: true, email: true },
    });
    if (!targetUser) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }
    const targetIsParticipant = conv.participants.some((p) => p.userId === assignToUserId);
    if (!targetIsParticipant) {
      await prisma.conversationParticipant.create({
        data: { conversationId, userId: assignToUserId },
      });
    }
    const asistidasTag = await prisma.conversationTag.findUnique({
      where: { tenantId_slug: { tenantId, slug: "asistidas" } },
      select: { id: true },
    });
    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        assignedToId: assignToUserId,
        handoffRequestedAt: null,
        ...(asistidasTag && { conversationTagId: asistidasTag.id }),
      },
    });
  } else if (take) {
    if (assignedToSomeoneElse && !isAdmin) {
      return NextResponse.json(
        { error: "La conversación ya está asignada a otro colaborador. Solo los administradores pueden tomar el control." },
        { status: 403 }
      );
    }
    const iAmParticipant = conv.participants.some((p) => p.userId === session.id);
    if (!iAmParticipant) {
      await prisma.conversationParticipant.create({
        data: { conversationId, userId: session.id },
      });
    }
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { assignedToId: session.id },
    });
  } else {
    if (conv.assignedToId !== session.id && !isAdmin) {
      return NextResponse.json(
        { error: "Solo quien tiene la conversación asignada o un administrador puede liberarla." },
        { status: 403 }
      );
    }
    const sinAsignarTag = await prisma.conversationTag.findUnique({
      where: { tenantId_slug: { tenantId, slug: "sin_asignar" } },
      select: { id: true },
    });
    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        assignedToId: null,
        ...(sinAsignarTag && { conversationTagId: sinAsignarTag.id }),
      },
    });
  }

  const updated = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json({
    assignedTo: updated?.assignedTo ?? null,
  });
  } catch (err) {
    console.error("POST /api/conversations/[id]/assign error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al asignar conversación" },
      { status: 500 }
    );
  }
}
