import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getPusherServer, PUSHER_CHANNEL_PREFIX } from "@/lib/pusher";
import { sendWhatsAppTemplate } from "@/lib/bot/whatsapp-send";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id: conversationId } = await params;
  const body = await request.json();
  const templateName = (body.templateName as string)?.trim();
  const languageCode = (body.languageCode as string)?.trim() || "es";
  const bodyParams = (body.bodyParams as string[]) ?? [];
  const displayContent = (body.displayContent as string)?.trim();

  if (!templateName) {
    return NextResponse.json({ error: "Falta nombre de plantilla" }, { status: 400 });
  }

  const conv = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      contact: { select: { phone: true } },
      participants: { select: { userId: true } },
    },
  });

  if (!conv) return NextResponse.json({ error: "Conversación no encontrada" }, { status: 404 });

  const isAssigned = conv.assignedToId === session.id;
  if (!isAssigned) {
    return NextResponse.json({ error: "Debes tomar la conversación para enviar plantillas" }, { status: 403 });
  }

  if (conv.channel !== "bot" || !conv.contact?.phone) {
    return NextResponse.json({ error: "Solo se pueden enviar plantillas a contactos de WhatsApp" }, { status: 400 });
  }

  const components =
    bodyParams.length > 0
      ? [
          {
            type: "body" as const,
            parameters: bodyParams.map((t: string) => ({ type: "text" as const, text: t })),
          },
        ]
      : undefined;

  const result = await sendWhatsAppTemplate(
    conv.contact.phone,
    templateName,
    languageCode,
    components
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Error al enviar plantilla" }, { status: 500 });
  }

  const message = await prisma.message.create({
    data: {
      conversationId,
      senderId: session.id,
      content: displayContent || `[Plantilla: ${templateName}]`,
      type: "text",
      whatsappMessageId: result.messageId ?? null,
    },
    include: {
      sender: { select: { id: true, name: true, email: true } },
    },
  });

  const pusher = getPusherServer();
  if (pusher) {
    pusher
      .trigger(`${PUSHER_CHANNEL_PREFIX}${conversationId}`, "new_message", {
        id: message.id,
        content: message.content,
        type: message.type,
        mediaUrl: null,
        mediaFilename: null,
        senderId: message.senderId,
        sender: message.sender,
        status: message.status,
        createdAt: message.createdAt,
        fromContact: false,
      })
      .catch((e) => console.error("Pusher trigger:", e));
  }

  return NextResponse.json({ ok: true, message });
}
