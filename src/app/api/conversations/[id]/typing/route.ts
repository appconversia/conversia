import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { sendWhatsAppTypingAndRead } from "@/lib/bot/whatsapp-send";

/**
 * POST /api/conversations/[id]/typing
 * Envía indicador de "escribiendo" + marca como leído.
 * Usar cuando un agente está escribiendo una respuesta.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id: conversationId } = await params;
  const conv = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      contact: { select: { phone: true } },
      participants: { select: { userId: true } },
    },
  });

  if (!conv) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const isAssigned = conv.assignedToId === session.id;
  if (!isAssigned) {
    return NextResponse.json({ error: "Debes tomar la conversación para enviar typing" }, { status: 403 });
  }

  if (conv.channel !== "bot" || !conv.contact?.phone) {
    return NextResponse.json({ error: "No es conversación WhatsApp" }, { status: 400 });
  }

  // Último mensaje del contacto para usar como message_id (requerido por la API)
  const lastFromContact = await prisma.message.findFirst({
    where: { conversationId, senderContactId: { not: null } },
    orderBy: { createdAt: "desc" },
    select: { whatsappMessageId: true },
  });

  if (!lastFromContact?.whatsappMessageId) {
    return NextResponse.json({ ok: true });
  }

  const result = await sendWhatsAppTypingAndRead(
    conv.tenantId,
    conv.contact.phone,
    lastFromContact.whatsappMessageId
  );
  return NextResponse.json({ ok: result.ok });
}
