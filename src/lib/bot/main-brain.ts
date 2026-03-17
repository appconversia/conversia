import { prisma } from "@/lib/db";
import { getBotUserId } from "@/lib/config";
import { getPusherServer, PUSHER_CHANNEL_PREFIX } from "@/lib/pusher";
import { botLog } from "./bot-logger";
import { getFlowResult } from "./flow-runner";
import { upsertLead } from "./lead-register";
import {
  processSalesFlow,
  sendProductImages,
  type SalesFlowOutput,
} from "./sub-brains/sales-flow-brain";
import { buildFullProductDescription } from "./sub-brains/product-response-brain";
import { executeHandoff } from "./sub-brains/handoff-brain";
import { generateSinAsignarResponse } from "./sub-brains/sin-asignar-response";
import { processProductDetailQuestion } from "./sub-brains/product-detail-question-brain";
import { processProductSelection } from "./sub-brains/product-selection-brain";
import { buildScopeGuardReply } from "./sub-brains/scope-guard-brain";
import { fulfillPromisedSendIfNeeded } from "./sub-brains/promise-fulfillment-brain";
import { sendWhatsAppText, withBotTyping } from "./whatsapp-send";
import { getFullConversationContext } from "./conversation-memory";
import { isWithinBusinessHours } from "./business-hours";
import type { ContentPart } from "@/lib/ai-multimodal";

function lastMessageAsText(lastMessage: string | ContentPart[]): string {
  if (typeof lastMessage === "string") return lastMessage;
  return lastMessage
    .filter((p): p is ContentPart & { type: "text" } => p.type === "text")
    .map((p) => p.text)
    .join(" ");
}

export type BrainInput = {
  conversationId: string;
  contactId: string;
  contactPhone: string;
  contactName?: string;
  lastMessage: string | ContentPart[];
  quotedMessage?: string;
  receivedMessageId?: string;
};

export type BrainOutput = {
  replySent: boolean;
  handoffExecuted: boolean;
};

/**
 * Cerebro principal: orquesta router → sub-cerebros.
 * Flujo: SalesFlowBrain procesa → si handoff → HandoffBrain ejecuta.
 */
export async function runMainBrain(input: BrainInput): Promise<BrainOutput> {
  const { conversationId, contactId, contactPhone, contactName, lastMessage, quotedMessage, receivedMessageId } =
    input;

  const convState = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { handoffRequestedAt: true, assignedToId: true },
  });
  if (convState?.assignedToId) {
    void botLog("info", "main_brain", "Conversación asignada: bot no responde", {
      conversationId,
      contactId,
      metadata: { assignedToId: convState.assignedToId },
    });
    return { replySent: false, handoffExecuted: false };
  }
  if (convState?.handoffRequestedAt) {
    void botLog("info", "main_brain", "Sin asignar: generando respuesta contextual con IA", {
      conversationId,
      contactId,
      phone: contactPhone,
    });
    const lastText = lastMessageAsText(lastMessage);
    const replyText = await generateSinAsignarResponse(lastText, contactName);
    const botUserId = await getBotUserId();
    const sendResult = await withBotTyping(contactPhone, receivedMessageId, () => sendWhatsAppText(contactPhone, replyText));
    if (botUserId) {
      await prisma.message.create({
        data: {
          conversationId,
          senderId: botUserId,
          content: replyText,
          type: "text",
          whatsappMessageId: sendResult?.messageId ?? null,
        },
      });
    }
    return { replySent: true, handoffExecuted: false };
  }

  const history = await getFullConversationContext(conversationId);
  const messageCountFromContact = history.filter((m) => m.role === "user").length;
  void botLog("info", "main_brain", "Historial cargado (últimos 150 msgs)", {
    conversationId,
    contactId,
    phone: contactPhone,
    metadata: {
      historyLength: history.length,
      userMessages: messageCountFromContact,
      lastRole: history[history.length - 1]?.role,
      lastContentPreview: history[history.length - 1]?.content?.slice(0, 60),
    },
  });

  const lastTwoFromContact = await prisma.message.findMany({
    where: { conversationId, senderContactId: { not: null } },
    orderBy: { createdAt: "desc" },
    take: 2,
    select: { createdAt: true },
  });
  const twentyFourHoursMs = 24 * 60 * 60 * 1000;
  const returningAfter24h =
    lastTwoFromContact.length >= 2 &&
    Date.now() - new Date(lastTwoFromContact[1]!.createdAt).getTime() >
      twentyFourHoursMs;

  const flowContext = {
    isFirstMessage: messageCountFromContact <= 1 || returningAfter24h,
    messageCountFromContact,
    lastMessageText: lastMessageAsText(lastMessage),
  };
  const flowResult = await getFlowResult(flowContext);

  void botLog("info", "main_brain", "Flow result obtenido", {
    conversationId,
    contactId,
    phone: contactPhone,
    metadata: { flowType: flowResult?.type ?? "none", isFirstMessage: flowContext.isFirstMessage },
  });

  // Primer mensaje: saludo + fotos de barriles + pregunta inductiva (sin IA)
  if (flowContext.isFirstMessage) {
    void botLog("info", "main_brain", "Mensaje de bienvenida: saludo + fotos barriles + pregunta", {
      conversationId,
      contactId,
      phone: contactPhone,
    });
    const botUserId = await getBotUserId();
    const saludo = contactName?.trim()
      ? `Hola ${contactName.trim()}, bienvenido a WhatsApiBot. Soy tu asesor y estoy aquí para ayudarte. ¿En qué puedo ayudarte hoy?`
      : "Bienvenido a WhatsApiBot. Soy tu asesor y estoy aquí para ayudarte. ¿En qué puedo ayudarte hoy?";
    const sendSaludo = await withBotTyping(contactPhone, receivedMessageId, () => sendWhatsAppText(contactPhone, saludo));
    if (botUserId) {
      await prisma.message.create({
        data: {
          conversationId,
          senderId: botUserId,
          content: saludo,
          type: "text",
          whatsappMessageId: sendSaludo?.messageId ?? null,
        },
      });
    }
    const { sent: sentMedia, ctaMessage } = await sendProductImages(
      contactPhone,
      "barril",
      contactName,
      "image_only"
    );
    if (botUserId && sentMedia.length > 0) {
      const pusher = getPusherServer();
      for (const item of sentMedia) {
        const message = await prisma.message.create({
          data: {
            conversationId,
            senderId: botUserId,
            content: item.description || (item.type === "video" ? "Video" : "Imagen"),
            type: item.type,
            mediaUrl: item.url,
            mediaFilename: item.description || null,
            whatsappMessageId: item.whatsappMessageId ?? null,
          },
          include: { sender: { select: { id: true, name: true, email: true } } },
        });
        if (pusher) {
          pusher
            .trigger(`${PUSHER_CHANNEL_PREFIX}${conversationId}`, "new_message", {
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
            })
            .catch((e) => console.error("Pusher trigger:", e));
        }
      }
    }
    const withinHours = await isWithinBusinessHours();
    const nombre = contactName?.trim();
    const preguntaInductiva = withinHours
      ? nombre
        ? `¿Alguna duda o quieres más detalles, ${nombre}? Un asesor te ayuda 📦✨💬`
        : "¿Alguna duda o quieres más detalles? Un asesor te ayuda 📦✨💬"
      : nombre
        ? `¿Te interesa, ${nombre}? Si tienes dudas, un asesor te atiende cuando esté disponible 📦`
        : "¿Te interesa? Si tienes dudas, un asesor te atiende cuando esté disponible 📦";
    const ctaToSend = ctaMessage || preguntaInductiva;
    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        pendingWelcomeCtaText: ctaToSend,
        pendingWelcomeCtaMsgId: receivedMessageId ?? null,
      },
    });
    void botLog("info", "main_brain", "CTA bienvenida en cola (segunda invocación vía cron)", {
      conversationId,
      contactId,
      phone: contactPhone,
    });
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);
    if (baseUrl) {
      const secret = process.env.CRON_SECRET;
      fetch(`${baseUrl}/api/bot/process-pending-cta-now`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(secret && { Authorization: `Bearer ${secret}` }),
        },
      }).catch(() => {});
    }
    return { replySent: true, handoffExecuted: false };
  }

  // Respuesta fija del flow (solo cuando NO es primer mensaje)
  if (flowResult?.type === "respond" && !flowContext.isFirstMessage) {
    void botLog("info", "main_brain", "Flow respond: respuesta fija (sin IA)", {
      conversationId,
      contactId,
      phone: contactPhone,
      metadata: {
        flowType: "respond",
        textPreview: flowResult.text.slice(0, 80),
        isFirstMessage: flowContext.isFirstMessage,
      },
    });
    const botUserId = await getBotUserId();
    const sendResult = await withBotTyping(contactPhone, receivedMessageId, () => sendWhatsAppText(contactPhone, flowResult.text));
    if (botUserId) {
      await prisma.message.create({
        data: {
          conversationId,
          senderId: botUserId,
          content: flowResult.text,
          type: "text",
          whatsappMessageId: sendResult?.messageId ?? null,
        },
      });
    }
    return { replySent: true, handoffExecuted: false };
  }

  const historyForAI =
    history.length > 0 ? history.slice(0, -1) : history;
  const conv = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { lastProductSentForBot: true },
  });

  // Pregunta sobre productos "otros" (gorras, ponchos, carbón) → mostrar menú otros (evita que product-detail intercepte "gorras tienen?")
  const lastTextForOtros = lastMessageAsText(lastMessage).trim();
  const PIDE_OTROS =
    /\b(tienen\s+(gorras?|ponchos?|carb[oó]n|manoplas?|kit\s+limpieza)|(gorras?|ponchos?|carb[oó]n|manoplas?)\s+tienen|hay\s+(gorras?|ponchos?|carb[oó]n)|tienen\s+otros\s+productos?)\b/i;
  if (PIDE_OTROS.test(lastTextForOtros)) {
    void botLog("info", "main_brain", "Pregunta sobre otros productos detectada → menú otros", {
      conversationId,
      contactId,
      phone: contactPhone,
      metadata: { lastText: lastTextForOtros.slice(0, 60) },
    });
    const scopeReply = await buildScopeGuardReply(contactName, conversationId, true);
    const botUserId = await getBotUserId();
    const sendResult = await withBotTyping(contactPhone, receivedMessageId, () => sendWhatsAppText(contactPhone, scopeReply.reply));
    if (botUserId) {
      await prisma.message.create({
        data: {
          conversationId,
          senderId: botUserId,
          content: scopeReply.reply,
          type: "text",
          whatsappMessageId: sendResult?.messageId ?? null,
        },
      });
    }
    return { replySent: true, handoffExecuted: false };
  }

  // Cerebrito híbrido: preguntas puntuales (accesorios, dimensiones, etc.) → consulta BD + IA redacta
  const detailResult = await processProductDetailQuestion(
    lastMessage,
    conv?.lastProductSentForBot ?? undefined,
    contactName,
    conversationId,
    quotedMessage
  );
  if (detailResult.handled && detailResult.reply) {
    const replyText = detailResult.reply;
    void botLog("info", "main_brain", "Pregunta puntual atendida por product-detail-question", {
      conversationId,
      contactId,
      phone: contactPhone,
    });
    const botUserId = await getBotUserId();
    const sendResult = await withBotTyping(contactPhone, receivedMessageId, () => sendWhatsAppText(contactPhone, replyText));
    if (botUserId) {
      await prisma.message.create({
        data: {
          conversationId,
          senderId: botUserId,
          content: replyText,
          type: "text",
          whatsappMessageId: sendResult?.messageId ?? null,
        },
      });
    }
    return { replySent: true, handoffExecuted: false };
  }

  // Cerebrito híbrido: pide algunos (varios productos) → envía imagen y video de esas
  const selectionResult = await processProductSelection(lastMessage, conversationId);
  if (selectionResult.handled && selectionResult.productNames && selectionResult.productNames.length >= 2) {
    void botLog("info", "main_brain", "Pide algunos: enviando imagen y video seleccionados", {
      conversationId,
      contactId,
      phone: contactPhone,
      metadata: { count: selectionResult.productNames.length },
    });
    const botUserId = await getBotUserId();
    if (selectionResult.reply) {
      const selReply = selectionResult.reply;
      const sendResult = await withBotTyping(contactPhone, receivedMessageId, () => sendWhatsAppText(contactPhone, selReply));
      if (botUserId) {
        await prisma.message.create({
          data: {
            conversationId,
            senderId: botUserId,
            content: selReply,
            type: "text",
            whatsappMessageId: sendResult?.messageId ?? null,
          },
        });
      }
    }
    const { sent: sentMedia, ctaMessage, lastProductName } = await sendProductImages(
      contactPhone,
      selectionResult.productNames,
      contactName
    );
    if (lastProductName) {
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { lastProductSentForBot: lastProductName },
      });
    }
    if (botUserId && sentMedia.length > 0) {
      const pusher = getPusherServer();
      for (const item of sentMedia) {
        const message = await prisma.message.create({
          data: {
            conversationId,
            senderId: botUserId,
            content: item.description || (item.type === "video" ? "Video" : "Imagen"),
            type: item.type,
            mediaUrl: item.url,
            mediaFilename: item.description || null,
            whatsappMessageId: item.whatsappMessageId ?? null,
          },
          include: { sender: { select: { id: true, name: true, email: true } } },
        });
        if (pusher) {
          pusher
            .trigger(`${PUSHER_CHANNEL_PREFIX}${conversationId}`, "new_message", {
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
            })
            .catch((e) => console.error("Pusher trigger:", e));
        }
      }
    }
    const withinHours = await isWithinBusinessHours();
    const mensajeCTA = withinHours
      ? "¿Alguna duda o quieres más detalles? Un asesor te ayuda ✨"
      : "¿Te interesa? Si tienes dudas, un asesor te atiende cuando esté disponible 📦";
    const ctaToSend = ctaMessage || mensajeCTA;
    if (ctaToSend) {
      const sendResult = await withBotTyping(contactPhone, receivedMessageId, () => sendWhatsAppText(contactPhone, ctaToSend));
      if (botUserId) {
        await prisma.message.create({
          data: {
            conversationId,
            senderId: botUserId,
            content: ctaToSend,
            type: "text",
            whatsappMessageId: sendResult?.messageId ?? null,
          },
        });
      }
    }
    return { replySent: true, handoffExecuted: false };
  }

  // Usuario eligió "Otros" del menú (10, otros, diez) → mostrar menú de otros productos
  const lastText = lastMessageAsText(lastMessage).trim().toLowerCase();
  const pideMenuOtros = /^(10|otros|diez|opci[oó]n\s*10|la\s+10|el\s+10|quiero\s+ver\s+otros|ver\s+otros)$/i.test(lastText);
  if (pideMenuOtros) {
    const scopeReply = await buildScopeGuardReply(contactName, conversationId, true);
    const botUserId = await getBotUserId();
    const sendResult = await withBotTyping(contactPhone, receivedMessageId, () => sendWhatsAppText(contactPhone, scopeReply.reply));
    if (botUserId) {
      await prisma.message.create({
        data: {
          conversationId,
          senderId: botUserId,
          content: scopeReply.reply,
          type: "text",
          whatsappMessageId: sendResult?.messageId ?? null,
        },
      });
    }
    return { replySent: true, handoffExecuted: false };
  }

  void botLog("info", "main_brain", "Ejecutando sales_flow", {
    conversationId,
    contactId,
    phone: contactPhone,
    metadata: {
      historyForAILength: historyForAI.length,
      lastMessagePreview: lastMessageAsText(lastMessage).slice(0, 80),
      isFirstMessage: flowContext.isFirstMessage,
    },
  });
  const salesResult: SalesFlowOutput = await processSalesFlow(
    contactPhone,
    lastMessage,
    historyForAI,
    contactName,
    conv?.lastProductSentForBot ?? undefined,
    flowContext.isFirstMessage,
    conversationId,
    quotedMessage
  );

  // Scope Guard: NO_ENTIENDO o FUERA_DE_ALCANCE → mensaje límite + lista inductiva
  if (salesResult.scopeGuardTriggered) {
    const scopeReply = await buildScopeGuardReply(contactName, conversationId);
    const botUserId = await getBotUserId();
    const sendResult = await withBotTyping(contactPhone, receivedMessageId, () => sendWhatsAppText(contactPhone, scopeReply.reply));
    if (botUserId) {
      await prisma.message.create({
        data: {
          conversationId,
          senderId: botUserId,
          content: scopeReply.reply,
          type: "text",
          whatsappMessageId: sendResult?.messageId ?? null,
        },
      });
    }
    return { replySent: true, handoffExecuted: false };
  }

  let handoffExecuted = false;
  const botUserId = await getBotUserId();

  if (salesResult.handoffRequired) {
    void botLog("info", "main_brain", "Handoff ejecutado", {
      conversationId,
      contactId,
      phone: contactPhone,
      metadata: { reason: "salesResult.handoffRequired=true" },
    });
    await executeHandoff(conversationId);
    handoffExecuted = true;
  }

  const withinHours = await isWithinBusinessHours();
  const mensajeInductivoHandoff = withinHours
    ? "En contados instantes uno de nuestros asesores te brindará más detalles para que finalices tu compra. ¡Gracias por tu interés!"
    : "Ya tienes toda la información que necesitas. Nuestros agentes te atenderán en cuanto estén disponibles.";

  let replyToSend: string;
  if (salesResult.sendFullDescription) {
    const fullDesc = await buildFullProductDescription(salesResult.sendFullDescription, contactName);
    replyToSend = (fullDesc ?? salesResult.reply) || "Un asesor te enviará la información en breve.";
    if (salesResult.handoffRequired) {
      replyToSend = `${replyToSend}\n\n${mensajeInductivoHandoff}`;
    }
  } else if (salesResult.sendImages) {
    // Intro corto antes de video/imagen: solo "Te enviaré los detalles del X, un momento"
    // Evita texto largo con ficha y preguntas de asesor (eso va en imagen + CTA)
    const pf = salesResult.productFilter;
    const name =
      Array.isArray(pf) && pf.length > 0
        ? pf[0]
        : typeof pf === "string" && pf.trim()
          ? pf
          : salesResult.productInterest;
    if (typeof name === "string" && name.trim()) {
      replyToSend =
        name.toLowerCase() === "todos" || name.toLowerCase().includes("catálogo")
          ? "Te envío la información del catálogo, un momento por favor ✨"
          : `Te enviaré los detalles del *${name}*, un momento por favor ✨`;
    } else if (Array.isArray(pf) && pf.length >= 2) {
      replyToSend = "Te envío la información de los barriles que elegiste, un momento por favor ✨";
    } else {
      replyToSend = "Te envío la información, un momento por favor ✨";
    }
    if (salesResult.handoffRequired) {
      replyToSend = `${replyToSend}\n\n${mensajeInductivoHandoff}`;
    }
  } else {
    replyToSend = salesResult.handoffRequired
      ? `${salesResult.reply}\n\n${mensajeInductivoHandoff}`
      : salesResult.reply;
  }

  // 1) Enviar SIEMPRE el texto de respuesta ANTES de cualquier imagen/video (orden correcto en chat)
  if (replyToSend) {
    const sendResult = await withBotTyping(contactPhone, receivedMessageId, () => sendWhatsAppText(contactPhone, replyToSend));
    if (botUserId) {
      await prisma.message.create({
        data: {
          conversationId,
          senderId: botUserId,
          content: replyToSend,
          type: "text",
          whatsappMessageId: sendResult?.messageId ?? null,
        },
      });
    }
  }

  // 2) Enviar imágenes solo cuando sales-flow lo autoriza (opciones primero: no enviar si pidieron genérico tipo "quiero barriles")
  const shouldSendImages = salesResult.sendImages;
  void botLog(
    shouldSendImages ? "info" : "info",
    "main_brain",
    shouldSendImages
      ? "sendImages=true: enviando imagen y video de productos"
      : "sendImages=false: NO se envían (pide genérico o no cumple pideEspecifico+pideVer)",
    {
      conversationId,
      contactId,
      phone: contactPhone,
      metadata: {
        sendImages: salesResult.sendImages,
        productFilter: salesResult.productFilter,
        productInterest: salesResult.productInterest,
        handoffRequired: salesResult.handoffRequired,
      },
    }
  );
  if (shouldSendImages) {
    const { sent: sentMedia, failedCount, ctaMessage, lastProductName } = await sendProductImages(
      contactPhone,
      salesResult.productFilter ?? salesResult.productInterest,
      contactName,
      salesResult.mediaPreference ?? "both"
    );
    if (lastProductName) {
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { lastProductSentForBot: lastProductName },
      });
    }
    void botLog(
      failedCount > 0 ? "error" : "info",
      "send_image",
      failedCount > 0
        ? `Fotos enviadas: ${sentMedia.length} ok, ${failedCount} fallaron`
        : `Fotos enviadas correctamente: ${sentMedia.length}`,
      {
        conversationId,
        contactId,
        phone: contactPhone,
        metadata: { sent: sentMedia.length, failedCount, productInterest: salesResult.productInterest },
      }
    );
    if (failedCount > 0) {
      const fallbackMsg =
        "Disculpa, hubo un problema al enviar algunas imágenes. Un asesor te las enviará en breve.";
      const sendResult = await withBotTyping(contactPhone, receivedMessageId, () => sendWhatsAppText(contactPhone, fallbackMsg));
      if (botUserId) {
        await prisma.message.create({
          data: {
            conversationId,
            senderId: botUserId,
            content: fallbackMsg,
            type: "text",
            whatsappMessageId: sendResult?.messageId ?? null,
          },
        });
      }
      if (!handoffExecuted) {
        await executeHandoff(conversationId);
        handoffExecuted = true;
      }
    }
    if (botUserId && sentMedia.length > 0) {
      const pusher = getPusherServer();
      for (const item of sentMedia) {
        const message = await prisma.message.create({
          data: {
            conversationId,
            senderId: botUserId,
            content: item.description || (item.type === "video" ? "Video" : "Imagen"),
            type: item.type,
            mediaUrl: item.url,
            mediaFilename: item.description || null,
            whatsappMessageId: item.whatsappMessageId ?? null,
          },
          include: {
            sender: { select: { id: true, name: true, email: true } },
          },
        });
        if (pusher) {
          pusher
            .trigger(`${PUSHER_CHANNEL_PREFIX}${conversationId}`, "new_message", {
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
            })
            .catch((e) => console.error("Pusher trigger:", e));
        }
      }
    }
    // CTA SIEMPRE después de cada imagen con su descripción (mensaje separado al final). Preferir el de la IA (personalizado).
    const ctaToSend = salesResult.ctaMessage ?? ctaMessage;
    if (sentMedia.length > 0 && ctaToSend) {
      const sendResult = await withBotTyping(contactPhone, receivedMessageId, () => sendWhatsAppText(contactPhone, ctaToSend));
      if (botUserId) {
        await prisma.message.create({
          data: {
            conversationId,
            senderId: botUserId,
            content: ctaToSend,
            type: "text",
            whatsappMessageId: sendResult?.messageId ?? null,
          },
        });
      }
    }
  } else {
    // Contingencia: bot prometió enviar fotos/videos/info pero no se envió.
    // La IA analiza la respuesta y dispara el envío real (no modifica flujo existente).
    if (!salesResult.sendFullDescription) {
      try {
        await fulfillPromisedSendIfNeeded(
          replyToSend,
          contactPhone,
          contactName,
          conversationId,
          botUserId,
          getPusherServer,
          PUSHER_CHANNEL_PREFIX
        );
      } catch (e) {
        void botLog("warn", "main_brain", "Contingencia promesa falló sin afectar flujo", {
          conversationId,
          metadata: { error: e instanceof Error ? e.message : String(e) },
        });
      }
    }
  }

  void botLog("info", "main_brain", "runMainBrain completado", {
    conversationId,
    contactId,
    phone: contactPhone,
    metadata: {
      replySent: !!replyToSend,
      handoffExecuted,
      sendImages: salesResult.sendImages,
      handoffRequired: salesResult.handoffRequired,
    },
  });

  // Registrar lead cuando hay interés (nivel o handoff)
  if (
    (salesResult.interestLevel ?? salesResult.leadNotes ?? handoffExecuted) &&
    contactPhone
  ) {
    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
      select: { name: true },
    }).catch(() => null);
    const priority =
      salesResult.interestLevel === "alto"
        ? "urgente"
        : salesResult.interestLevel === "medio"
          ? "normal"
          : "baja";
    await upsertLead({
      phone: contactPhone,
      name: contact?.name ?? contactName ?? undefined,
      conversationId,
      productInterest: salesResult.productInterest ?? undefined,
      interestLevel: salesResult.interestLevel ?? undefined,
      priority: salesResult.interestLevel ? priority : undefined,
      status: "Pendiente",
      notes: salesResult.leadNotes ?? (handoffExecuted ? "Solicitó asesor" : undefined),
    });
  }

  return {
    replySent: !!replyToSend,
    handoffExecuted,
  };
}
