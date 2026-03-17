import { runMainBrain } from "./main-brain";
import { addMessageToBatch } from "./batch";
import { fetchWhatsAppMedia } from "./whatsapp-media";
import { getWhatsAppCredentials, getBotAICredentials } from "@/lib/config";
import { transcribeAudio } from "@/lib/ai-multimodal";
import { uploadBufferToBlob } from "@/lib/upload-media-to-blob";
import { botLog } from "./bot-logger";
import type { ContentPart } from "@/lib/ai-multimodal";

export type IncomingMessage = {
  phone: string;
  contactName?: string;
  text?: string;
  type: string;
  mediaId?: string;
  messageId?: string;
  quotedMessageId?: string;
};

const MEDIA_TYPE_MAP: Record<string, "image" | "audio" | "video" | "document" | "sticker"> = {
  image: "image",
  audio: "audio",
  voice: "audio",
  video: "video",
  document: "document",
  sticker: "image",
};

/**
 * Router: recibe mensajes entrantes (texto, imagen, audio, video) y los enruta al cerebro principal.
 */
export async function routeIncomingMessage(msg: IncomingMessage): Promise<{
  ok: boolean;
  conversationId?: string;
  error?: string;
}> {
  const phone = msg.phone.replace(/\D/g, "");
  const hasText = msg.text != null && msg.text.trim().length > 0;
  const hasMedia = !!msg.mediaId;

  if (!phone || (!hasText && !hasMedia)) {
    void botLog("warn", "router", "Rechazado: teléfono o mensaje vacío", { phone: msg.phone, metadata: { hasText, hasMedia } });
    return { ok: false, error: "Teléfono o mensaje vacío" };
  }

  const { prisma } = await import("@/lib/db");

  let contact = await prisma.contact.findUnique({
    where: { phone },
    include: { conversations: { where: { channel: "bot" }, take: 1, orderBy: { createdAt: "desc" } } },
  });

  if (!contact) {
    contact = await prisma.contact.create({
      data: {
        phone,
        name: msg.contactName?.trim() || null,
      },
      include: {
        conversations: true,
      },
    });
  } else if (msg.contactName?.trim() && msg.contactName !== contact.name) {
    await prisma.contact.update({
      where: { id: contact.id },
      data: { name: msg.contactName.trim() },
    });
  }

  let conversation = contact.conversations?.[0];

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        channel: "bot",
        contactId: contact.id,
      },
    });
  }

  let lastMessageContent: string | ContentPart[] = msg.text?.trim() ?? "";
  let messageType: "text" | "image" | "audio" | "video" | "document" | "sticker" = "text";
  let storedContent = msg.text?.trim() ?? "";
  let mediaUrl: string | null = null;

  if (msg.mediaId) {
    const creds = await getWhatsAppCredentials();
    const mediaType = MEDIA_TYPE_MAP[msg.type] ?? "document";
    messageType = mediaType === "sticker" ? "sticker" : mediaType;

    if (!creds) {
      void botLog("warn", "router", "Credenciales WhatsApp no configuradas: no se puede descargar media", {
        conversationId: conversation.id,
        phone,
        metadata: { mediaType, mediaId: msg.mediaId },
      });
      storedContent = hasText ? msg.text!.trim() : `[${mediaType} - configuración pendiente]`;
      lastMessageContent = storedContent;
    } else {
      const media = await fetchWhatsAppMedia(msg.mediaId, creds.accessToken);
      if (media) {
        const part: ContentPart =
          mediaType === "image" || mediaType === "sticker"
            ? { type: "image", base64: media.base64, mimeType: media.mimeType }
            : mediaType === "audio"
              ? { type: "audio", base64: media.base64, mimeType: media.mimeType }
              : mediaType === "video"
                ? { type: "video", base64: media.base64, mimeType: media.mimeType }
                : { type: "text", text: "[Documento recibido. Descríbeme por escrito qué necesitas.]" };

        if (part.type === "text") {
          storedContent = part.text;
          lastMessageContent = part.text;
        } else if (part.type === "audio") {
          const creds = await getBotAICredentials();
          if (creds?.openaiKey) {
            try {
              const transcript = await transcribeAudio(
                part.base64,
                part.mimeType,
                creds.openaiKey
              );
              storedContent = `[Voz]: ${transcript}`;
              lastMessageContent = `[Voz]: ${transcript}`;
            } catch {
              storedContent = "[Audio no transcrito]";
              lastMessageContent = "[Audio no transcrito]";
            }
          } else {
            storedContent = "[Audio recibido. Por favor escribe tu mensaje.]";
            lastMessageContent = storedContent;
          }
        } else {
          lastMessageContent = [part];
          if (hasText) {
            lastMessageContent = [{ type: "text", text: msg.text!.trim() }, part];
          }
          storedContent = hasText ? `${msg.text!.trim()} [${mediaType}]` : `[${mediaType}]`;
        }
        try {
          const buffer = Buffer.from(media.base64, "base64");
          mediaUrl = await uploadBufferToBlob(buffer, media.mimeType, "whatsapp-in");
        } catch (e) {
          void botLog("warn", "router", "Error subiendo media a Blob", {
            conversationId: conversation.id,
            metadata: { error: e instanceof Error ? e.message : String(e) },
          });
        }
        void botLog("info", "router", "Media descargada y procesada", {
          conversationId: conversation.id,
          phone,
          metadata: { mediaType, hasTranscript: mediaType === "audio" && storedContent.startsWith("[Voz]:") },
        });
      } else {
        void botLog("warn", "router", "fetchWhatsAppMedia falló: media no disponible", {
          conversationId: conversation.id,
          phone,
          metadata: { mediaType, mediaId: msg.mediaId },
        });
        storedContent = hasText ? msg.text!.trim() : `[${mediaType} no disponible]`;
        lastMessageContent = storedContent;
      }
    }
  }

  if (msg.messageId) {
    const existing = await prisma.message.findUnique({
      where: { whatsappMessageId: msg.messageId },
    });
    if (existing) {
      void botLog("debug", "router", "Mensaje duplicado ignorado (whatsappMessageId ya existe)", {
        conversationId: conversation.id,
        contactId: contact.id,
        phone,
      });
      return { ok: true, conversationId: conversation.id };
    }
  }

  // Contexto de mensaje citado: buscar el mensaje al que el usuario responde
  let quotedMessageContent: string | undefined;
  let replyToMessageId: string | null = null;
  if (msg.quotedMessageId) {
    const quoted = await prisma.message.findUnique({
      where: { whatsappMessageId: msg.quotedMessageId },
      select: { id: true, content: true, type: true },
    });
    if (quoted) {
      replyToMessageId = quoted.id;
      quotedMessageContent = quoted.type === "text" ? quoted.content : `[${quoted.type}]: ${quoted.content}`;
      void botLog("info", "router", "Mensaje citado encontrado", {
        conversationId: conversation.id,
        metadata: { quotedPreview: quotedMessageContent.slice(0, 80), replyToMessageId: quoted.id },
      });
    } else {
      const recentFromUs = await prisma.message.findFirst({
        where: { conversationId: conversation.id, senderContactId: null },
        orderBy: { createdAt: "desc" },
        select: { id: true, content: true, type: true },
      });
      if (recentFromUs) {
        replyToMessageId = recentFromUs.id;
        quotedMessageContent = recentFromUs.type === "text" ? recentFromUs.content : `[${recentFromUs.type}]: ${recentFromUs.content}`;
      }
    }
  }

  // Bot solo responde si: no está asignada (sin asesor tomando control). Si asignado → bot queda fuera.
  const convFresh = await prisma.conversation.findUnique({
    where: { id: conversation.id },
    select: { handoffRequestedAt: true, assignedToId: true },
  });
  if (convFresh?.assignedToId) {
    void botLog("info", "router", "Conversación asignada: mensaje guardado sin procesar bot", {
      conversationId: conversation.id,
      contactId: contact.id,
      phone,
    });
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderContactId: contact.id,
        content: storedContent,
        type: messageType,
        mediaUrl,
        whatsappMessageId: msg.messageId || null,
        replyToMessageId,
      },
    });
    return { ok: true, conversationId: conversation.id };
  }

  const created = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderContactId: contact.id,
      content: storedContent,
      type: messageType,
      mediaUrl,
      whatsappMessageId: msg.messageId || null,
      replyToMessageId,
    },
  });

  void botLog("info", "router", "Mensaje creado → añadido a batch", {
    conversationId: conversation.id,
    contactId: contact.id,
    phone,
    metadata: {
      messageId: created.id,
      type: messageType,
      contentPreview: storedContent?.slice(0, 100),
      hasMedia: !!mediaUrl,
      contactName: contact.name ?? undefined,
    },
  });
  await addMessageToBatch({
    conversationId: conversation.id,
    messageId: created.id,
    processNow: () =>
      runMainBrain({
        conversationId: conversation.id,
        contactId: contact.id,
        contactPhone: phone,
        contactName: contact.name ?? msg.contactName?.trim() ?? undefined,
        lastMessage: lastMessageContent,
        quotedMessage: quotedMessageContent,
        receivedMessageId: msg.messageId,
      }).then(() => {}),
  });

  return { ok: true, conversationId: conversation.id };
}
