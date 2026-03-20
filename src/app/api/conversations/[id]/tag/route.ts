import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id: convId } = await params;
  const body = await request.json() as { tagId: string; assignToUserId?: string };

  const conv = await prisma.conversation.findUnique({
    where: { id: convId },
    include: { conversationTag: true },
  });
  if (!conv) return NextResponse.json({ error: "Conversación no encontrada" }, { status: 404 });

  const tag = await prisma.conversationTag.findUnique({ where: { id: body.tagId } });
  if (!tag) return NextResponse.json({ error: "Etiqueta no encontrada" }, { status: 404 });

  const isAdmin = ["admin", "super_admin"].includes(String(session.role ?? "").toLowerCase());

  if (tag.slug === "bot") {
    if (!isAdmin) return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    await prisma.conversation.update({
      where: { id: convId },
      data: {
        handoffRequestedAt: null,
        assignedToId: null,
        conversationTagId: tag.id,
      },
    });
    return NextResponse.json({ ok: true });
  }

  if (tag.slug === "sin_asignar") {
    if (!isAdmin) return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    await prisma.conversation.update({
      where: { id: convId },
      data: {
        handoffRequestedAt: new Date(),
        assignedToId: null,
        conversationTagId: tag.id,
      },
    });
    return NextResponse.json({ ok: true });
  }

  if (tag.slug === "asistidas") {
    const assignTo = body.assignToUserId?.trim();
    if (!assignTo) return NextResponse.json({ error: "Debes indicar a quién asignar (assignToUserId)" }, { status: 400 });
    if (!isAdmin && assignTo !== session.id) return NextResponse.json({ error: "Solo puedes asignarte a ti mismo" }, { status: 403 });
    await prisma.conversation.update({
      where: { id: convId },
      data: {
        handoffRequestedAt: null,
        assignedToId: assignTo,
        conversationTagId: tag.id,
      },
    });
    return NextResponse.json({ ok: true });
  }

  if (tag.isSystem) {
    return NextResponse.json({ error: "Etiqueta del sistema no soportada para mover" }, { status: 400 });
  }

  await prisma.conversation.update({
    where: { id: convId },
    data: { conversationTagId: tag.id },
  });
  return NextResponse.json({ ok: true });
}
