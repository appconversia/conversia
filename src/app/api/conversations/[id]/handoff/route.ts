import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

/**
 * POST: Marcar que el usuario pidió asistencia de asesor (sale del bot).
 * Usado por integración con bot - la conversación pasa a "Sin Asignar".
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id: conversationId } = await params;

  const conv = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conv) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  if (session.tenantId && session.tenantId !== conv.tenantId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const tenantId = conv.tenantId;
  const sinAsignarTag = await prisma.conversationTag.findUnique({
    where: { tenantId_slug: { tenantId, slug: "sin_asignar" } },
    select: { id: true },
  });
  await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      channel: "bot",
      handoffRequestedAt: new Date(),
      assignedToId: null,
      ...(sinAsignarTag && { conversationTagId: sinAsignarTag.id }),
    },
  });

  return NextResponse.json({ ok: true, message: "Handoff registrado" });
}
