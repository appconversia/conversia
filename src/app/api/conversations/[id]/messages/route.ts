import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getPusherServer, PUSHER_CHANNEL_PREFIX } from "@/lib/pusher";
import {
  sendWhatsAppText,
  sendWhatsAppImage,
  sendWhatsAppVideo,
  sendWhatsAppAudio,
  sendWhatsAppDocument,
} from "@/lib/bot/whatsapp-send";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id: conversationId } = await params;
  const url = new URL(request.url);
  const before = url.searchParams.get("before");

  const conv = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { participants: { select: { userId: true } } },
  });

  if (!conv) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const cursor = before ? { id: before } : undefined;
  const messages = await prisma.message.findMany({
    where: { conversationId },
    take: 50,
    ...(cursor ? { cursor, skip: 1 } : {}),
    orderBy: { createdAt: "desc" },
    include: {
      sender: { select: { id: true, name: true, email: true } },
      senderContact: { select: { id: true, name: true, phone: true } },
    },
  });

  const replyToIds = messages.map((m) => m.replyToMessageId).filter(Boolean) as string[];
  const replyToMap = new Map<string, { id: string; content: string; type: string; sender: { id: string; name: string | null; email: string } | null; fromContact: boolean }>();
  if (replyToIds.length > 0) {
    const replyToMessages = await prisma.message.findMany({
      where: { id: { in: replyToIds } },
      include: {
        sender: { select: { id: true, name: true, email: true } },
        senderContact: { select: { id: true, name: true, phone: true } },
      },
    });
    for (const r of replyToMessages) {
      replyToMap.set(r.id, {
        id: r.id,
        content: r.content,
        type: r.type,
        sender: r.sender ?? (r.senderContact ? { id: r.senderContact.id, name: r.senderContact.name, email: r.senderContact.phone } : null),
        fromContact: !!r.senderContactId,
      });
    }
  }

  const chronologicalOrder = [...messages].reverse();

  return NextResponse.json({
    messages: chronologicalOrder.map((m) => ({
      id: m.id,
      content: m.content,
      type: m.type,
      mediaUrl: m.mediaUrl,
      mediaFilename: m.mediaFilename,
      senderId: m.senderId ?? m.senderContactId,
      sender: m.sender ?? (m.senderContact ? { id: m.senderContact.id, name: m.senderContact.name, email: m.senderContact.phone } : null),
      status: m.status,
      createdAt: m.createdAt,
      fromContact: !!m.senderContactId,
      replyTo: m.replyToMessageId ? replyToMap.get(m.replyToMessageId) ?? null : null,
    })),
  });
}


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
  const content = ((body.content as string) ?? "").trim();
  const type = (body.type as string) || "text";
  const mediaUrl = body.mediaUrl as string | undefined;
  const mediaFilename = body.mediaFilename as string | undefined;
  const replyToMessageId = body.replyToMessageId as string | undefined;

  const isMedia = ["image", "video", "audio", "document", "sticker"].includes(type);
  if (!isMedia && (!content || content.length > 4096)) {
    return NextResponse.json({ error: "Mensaje inválido" }, { status: 400 });
  }
  if (isMedia && !mediaUrl) {
    return NextResponse.json({ error: "Falta URL del archivo" }, { status: 400 });
  }

  const conv = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      participants: { select: { userId: true } },
      contact: { select: { phone: true } },
    },
  });

  if (!conv) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const isAssigned = conv.assignedToId === session.id;
  if (!isAssigned) return NextResponse.json({ error: "Debes tomar la conversación para enviar mensajes" }, { status: 403 });

  const isAdmin = ["super_admin", "admin"].includes(String(session.role ?? "").toLowerCase());
  if (conv.restricted && !isAdmin) {
    return NextResponse.json({ error: "Este chat está restringido. Solo un administrador puede enviar mensajes." }, { status: 403 });
  }

  const isWhatsAppContact = conv.channel === "bot" && conv.contact?.phone;

  let contextWhatsAppId: string | undefined;
  if (replyToMessageId) {
    const replyTo = await prisma.message.findUnique({
      where: { id: replyToMessageId, conversationId },
      select: { whatsappMessageId: true },
    });
    if (replyTo?.whatsappMessageId) contextWhatsAppId = replyTo.whatsappMessageId;
  }

  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const message = await prisma.$transaction(async (tx) => {
        return tx.message.create({
          data: {
            conversationId,
            senderId: session.id,
            content: content || "",
            type: type as "text" | "image" | "video" | "audio" | "document" | "sticker",
            mediaUrl: mediaUrl || null,
            mediaFilename: mediaFilename || null,
            replyToMessageId: replyToMessageId || null,
          },
          include: {
            sender: { select: { id: true, name: true, email: true } },
          },
        });
      });

      let whatsappMessageId: string | null = null;
      if (isWhatsAppContact && conv.contact) {
        if (type === "text") {
          const r = await sendWhatsAppText(conv.contact.phone, content, contextWhatsAppId);
          whatsappMessageId = r.messageId ?? null;
        } else if (mediaUrl && (type === "image" || type === "sticker")) {
          const r = await sendWhatsAppImage(conv.contact.phone, mediaUrl, content || undefined, contextWhatsAppId);
          whatsappMessageId = r.messageId ?? null;
        } else if (mediaUrl && type === "video") {
          const r = await sendWhatsAppVideo(conv.contact.phone, mediaUrl, content || undefined, contextWhatsAppId);
          whatsappMessageId = r.messageId ?? null;
        } else if (mediaUrl && type === "audio") {
          const r = await sendWhatsAppAudio(conv.contact.phone, mediaUrl, contextWhatsAppId);
          whatsappMessageId = r.messageId ?? null;
        } else if (mediaUrl && type === "document") {
          const docFilename = mediaFilename || (() => {
            const ext = mediaUrl.split(".").pop()?.split("?")[0] || "pdf";
            return `documento.${ext}`;
          })();
          const r = await sendWhatsAppDocument(conv.contact.phone, mediaUrl, docFilename, content || undefined, contextWhatsAppId);
          whatsappMessageId = r.messageId ?? null;
        } else if (mediaUrl) {
          const r = await sendWhatsAppText(conv.contact.phone, content || mediaFilename || "Archivo adjunto");
          whatsappMessageId = r.messageId ?? null;
        }
        if (whatsappMessageId) {
          await prisma.message.update({
            where: { id: message.id },
            data: { whatsappMessageId },
          });
        }
      }

      let replyTo: { id: string; content: string; type: string; sender: { id: string; name: string | null; email: string } | null; fromContact: boolean } | null = null;
      if (message.replyToMessageId) {
        const rt = await prisma.message.findUnique({
          where: { id: message.replyToMessageId },
          include: {
            sender: { select: { id: true, name: true, email: true } },
            senderContact: { select: { id: true, name: true, phone: true } },
          },
        });
        if (rt) {
          replyTo = {
            id: rt.id,
            content: rt.content,
            type: rt.type,
            sender: rt.sender ?? (rt.senderContact ? { id: rt.senderContact.id, name: rt.senderContact.name, email: rt.senderContact.phone } : null),
            fromContact: !!rt.senderContactId,
          };
        }
      }
      const payload = {
        id: message.id,
        content: message.content,
        type: message.type,
        mediaUrl: message.mediaUrl,
        mediaFilename: message.mediaFilename,
        senderId: message.senderId,
        sender: message.sender,
        status: message.status,
        createdAt: message.createdAt,
        fromContact: false,
        replyTo,
      };

      const pusher = getPusherServer();
      if (pusher) {
        pusher.trigger(`${PUSHER_CHANNEL_PREFIX}${conversationId}`, "new_message", payload).catch((e) => console.error("Pusher trigger:", e));
      }

      return NextResponse.json({
        message: payload,
      });
    } catch (err) {
      lastError = err;
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, 200 * attempt));
      }
    }
  }

  console.error("Message create failed after 3 attempts:", lastError);
  return NextResponse.json(
    { error: "Error al guardar el mensaje. Intenta de nuevo." },
    { status: 500 }
  );
}
