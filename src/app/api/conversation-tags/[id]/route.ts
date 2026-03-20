import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

const ADMIN_ROLES = ["admin", "super_admin"];

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!ADMIN_ROLES.includes(session.role)) return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

  const { id } = await params;
  const tag = await prisma.conversationTag.findUnique({ where: { id } });
  if (!tag) return NextResponse.json({ error: "Etiqueta no encontrada" }, { status: 404 });

  if (tag.slug === "bot") {
    return NextResponse.json({ error: "La etiqueta Bot no se puede modificar" }, { status: 400 });
  }

  const body = await request.json() as { name?: string; order?: number };
  const updated = await prisma.conversationTag.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name.trim() }),
      ...(body.order !== undefined && { order: Number(body.order) }),
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!ADMIN_ROLES.includes(session.role)) return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

  const { id } = await params;
  const tag = await prisma.conversationTag.findUnique({ where: { id } });
  if (!tag) return NextResponse.json({ error: "Etiqueta no encontrada" }, { status: 404 });

  if (tag.slug === "bot") {
    return NextResponse.json({ error: "La etiqueta Bot no se puede eliminar" }, { status: 400 });
  }
  if (tag.isSystem) {
    return NextResponse.json({ error: "Las etiquetas del sistema no se pueden eliminar" }, { status: 400 });
  }

  await prisma.conversation.updateMany({
    where: { conversationTagId: id },
    data: { conversationTagId: null },
  });
  await prisma.conversationTag.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
