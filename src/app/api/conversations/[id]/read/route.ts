import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id: conversationId } = await params;

  try {
    const now = new Date();
    // Marcar en participante (por si se usa en futuro)
    await prisma.conversationParticipant.upsert({
      where: { conversationId_userId: { conversationId, userId: session.id } },
      create: { conversationId, userId: session.id, lastReadAt: now },
      update: { lastReadAt: now },
    });
    // Lectura global: cuando cualquiera lee, todos ven 0 no leídos
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { lastReadAt: now },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/conversations/[id]/read error:", err);
    return NextResponse.json({ error: "Error al marcar como leído" }, { status: 500 });
  }
}
