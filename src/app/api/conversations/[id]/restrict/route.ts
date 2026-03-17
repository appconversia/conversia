import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

/**
 * POST /api/conversations/[id]/restrict
 * Cualquier usuario con acceso puede restringir/desrestringir.
 * Solo super_admin y admin ven la pestaña "Restringidos".
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
    select: { id: true, restricted: true },
  });

  if (!conv) {
    return NextResponse.json({ error: "Conversación no encontrada" }, { status: 404 });
  }

  const updated = await prisma.conversation.update({
    where: { id: conversationId },
    data: { restricted: !conv.restricted },
    include: { assignedTo: { select: { id: true, email: true, name: true } } },
  });

  return NextResponse.json({
    restricted: updated.restricted,
    assignedTo: updated.assignedTo,
  });
}
