/**
 * Contingencia: cuando el bot prometió enviar fotos/videos/info pero no se envió
 * (sendImages=false), la IA analiza la respuesta y dispara el envío real.
 * No modifica el flujo existente; solo actúa como fallback.
 */
import { callAI } from "@/lib/ai";
import { prisma } from "@/lib/db";
import { getBotAICredentials } from "@/lib/config";
import { getProductCatalog } from "../product-catalog";
import { sendProductImages, type MediaPreference } from "./sales-flow-brain";
import { buildFullProductDescription } from "./product-response-brain";
import { sendWhatsAppText } from "../whatsapp-send";
import { botLog } from "../bot-logger";

/** Regex rápido: el bot prometió enviar algo (evita llamar IA si no hay promesa). */
/** Usa (?=[\s.,!?]|$) en vez de \b final: en JS \w excluye acentos (é,á) y \b falla con "enviaré". */
const PROMESA_ENVIO =
  /\b(te\s+env[ií]o|te\s+env[ií]ar[eé]|en\s+un\s+momento\s+te\s+(mando|env[ií]o)|aqu[ií]\s+tienes\s+(las\s+)?(fotos?|im[aá]genes?|v[ií]deos?|detalles)|te\s+mando|se\s+los\s+env[ií]o|voy\s+a\s+enviart[eo])(?=[\s.,!?]|$)/i;

export type PromiseAnalysisResult = {
  promisesToSend: boolean;
  productName?: string;
  contentType?: "images" | "videos" | "both" | "description_only";
};

/**
 * La IA analiza la respuesta del bot y determina si prometió enviar algo
 * y qué tipo de contenido (fotos, videos, ambos, o solo descripción).
 */
export async function analyzePromisedSendWithAI(
  botReply: string,
  catalogNames: string[]
): Promise<PromiseAnalysisResult> {
  const creds = await getBotAICredentials();
  if (!creds) return { promisesToSend: false };

  const namesList = catalogNames.slice(0, 25).join(", ");
  const systemPrompt = `Eres un analizador. Tu única tarea es decidir si la siguiente respuesta del bot PROMETE enviar fotos, videos o información de un producto al cliente.

Si la respuesta promete enviar algo (ej: "Te enviaré las fotos del X", "Aquí tienes los detalles del Y"), devuelve un JSON válido con este formato exacto:
{"promisesToSend":true,"productName":"nombre exacto del producto tal como está en el mensaje","contentType":"images"|"videos"|"both"|"description_only"}

contentType: "images" = solo fotos/imágenes; "videos" = solo videos; "both" = fotos y videos; "description_only" = solo texto/descripción sin media.

Si NO promete enviar nada concreto, devuelve: {"promisesToSend":false}

Productos válidos del catálogo (usa el nombre más parecido si hay variación): ${namesList}

Responde ÚNICAMENTE con el JSON, sin markdown ni texto adicional.`;

  const userPrompt = `Respuesta del bot:\n"${botReply.slice(0, 500)}"\n\n¿Promete enviar fotos, videos o información? Devuelve el JSON.`;

  try {
    const response = await callAI(
      creds.provider as "openai" | "anthropic" | "google",
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      {
        openaiKey: creds.openaiKey,
        anthropicKey: creds.anthropicKey,
        googleKey: creds.googleKey,
        model: creds.model,
        temperature: 0.1,
        maxTokens: 256,
      }
    );
    const cleaned = response.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const parsed = JSON.parse(cleaned) as PromiseAnalysisResult;
    if (!parsed.promisesToSend || !parsed.productName) {
      return { promisesToSend: false };
    }
    return parsed;
  } catch (e) {
    void botLog("warn", "promise_fulfillment", "IA no pudo analizar promesa", {
      metadata: { error: e instanceof Error ? e.message : String(e) },
    });
    return { promisesToSend: false };
  }
}

/**
 * Contingencia: si el bot prometió enviar pero no lo hizo, la IA analiza y dispara el envío.
 * Solo se ejecuta cuando shouldSendImages fue false (no enviamos fotos).
 */
export async function fulfillPromisedSendIfNeeded(
  botReply: string,
  contactPhone: string,
  contactName: string | null | undefined,
  conversationId: string,
  botUserId: string | null,
  getPusherServer: () => { trigger: (ch: string, ev: string, data: unknown) => Promise<unknown> } | null,
  PUSHER_CHANNEL_PREFIX: string
): Promise<{ fulfilled: boolean }> {
  if (!botReply || !PROMESA_ENVIO.test(botReply)) {
    return { fulfilled: false };
  }

  const catalog = await getProductCatalog();
  if (catalog.length === 0) return { fulfilled: false };

  const catalogNames = [...new Set(catalog.map((c) => c.name))];
  const analysis = await analyzePromisedSendWithAI(botReply, catalogNames);
  if (!analysis.promisesToSend || !analysis.productName) {
    return { fulfilled: false };
  }

  const productFilter = analysis.productName;
  let mediaPreference: MediaPreference = "both";
  if (analysis.contentType === "images") mediaPreference = "image_only";
  else if (analysis.contentType === "videos") mediaPreference = "video_only";

  if (analysis.contentType === "description_only") {
    const fullDesc = await buildFullProductDescription(productFilter, contactName);
    if (fullDesc) {
      const sendResult = await sendWhatsAppText(contactPhone, fullDesc);
      if (botUserId) {
        await prisma.message.create({
          data: {
            conversationId,
            senderId: botUserId,
            content: fullDesc,
            type: "text",
            whatsappMessageId: sendResult?.messageId ?? null,
          },
        });
      }
      void botLog("info", "promise_fulfillment", "Contingencia: enviada descripción", {
        conversationId,
        phone: contactPhone,
        metadata: { productName: productFilter },
      });
      return { fulfilled: true };
    }
    return { fulfilled: false };
  }

  const { sent: sentMedia, failedCount, ctaMessage, lastProductName } = await sendProductImages(
    contactPhone,
    productFilter,
    contactName,
    mediaPreference
  );

  void botLog("info", "promise_fulfillment", "Contingencia: enviados media tras promesa", {
    conversationId,
    phone: contactPhone,
    metadata: {
      productName: productFilter,
      sent: sentMedia.length,
      failedCount,
    },
  });

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

  const ctaToSend = ctaMessage ?? "¿Te interesa? Si tienes dudas o quieres ayuda, un asesor te atiende 📦";
  if (sentMedia.length > 0) {
    const sendResult = await sendWhatsAppText(contactPhone, ctaToSend);
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

  return { fulfilled: sentMedia.length > 0 };
}
