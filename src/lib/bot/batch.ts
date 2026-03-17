import { prisma } from "@/lib/db";
import { getBatchConfig } from "@/lib/config";
import { runMainBrain } from "./main-brain";
import { botLog } from "./bot-logger";

/**
 * Agrupación de mensajes tipo Redis: buffer por conversación.
 * Cuando el usuario envía varios mensajes seguidos (texto, imagen, audio), se acumulan
 * y se procesan juntos tras un delay configurable, dando una sola respuesta coherente.
 */

export type AddToBatchResult = "processed_immediately" | "added_to_batch";

/**
 * Añade un mensaje a un lote existente o crea uno nuevo. Si batching está deshabilitado, retorna "processed_immediately".
 */
export async function addMessageToBatch(params: {
  conversationId: string;
  messageId: string;
  processNow: () => Promise<void>;
}): Promise<AddToBatchResult> {
  const config = await getBatchConfig();
  if (!config.enabled) {
    void botLog("info", "batch", "Batch deshabilitado: procesamiento inmediato", {
      conversationId: params.conversationId,
      metadata: { messageId: params.messageId },
    });
    await params.processNow();
    return "processed_immediately";
  }

  const now = new Date();
  const readyAt = new Date(now.getTime() + config.delayMs);

  const pending = await prisma.botBatch.findFirst({
    where: { conversationId: params.conversationId, status: "pending" },
    orderBy: { createdAt: "desc" },
    include: { messages: { orderBy: { order: "asc" } } },
  });

  if (pending && pending.messages.length >= config.maxBatchSize) {
    void botLog("info", "batch", "Batch lleno: procesamiento inmediato", {
      conversationId: params.conversationId,
      metadata: { batchSize: pending.messages.length, maxBatchSize: config.maxBatchSize },
    });
    await params.processNow();
    return "processed_immediately";
  }

  await prisma.$transaction(async (tx) => {
    let batchId: string;
    let currentReadyAt: Date;
    if (pending) {
      batchId = pending.id;
      currentReadyAt = pending.readyAt;
      const newReadyAt = new Date(now.getTime() + config.delayMs);
      if (newReadyAt > currentReadyAt) {
        await tx.botBatch.update({
          where: { id: batchId },
          data: { readyAt: newReadyAt },
        });
      }
    } else {
      const created = await tx.botBatch.create({
        data: {
          conversationId: params.conversationId,
          readyAt,
          status: "pending",
        },
      });
      batchId = created.id;
    }
    const order = pending ? pending.messages.length : 0;
    await tx.botBatchMessage.create({
      data: {
        batchId,
        messageId: params.messageId,
        order,
      },
    });
  });

  return "added_to_batch";
}

/**
 * Procesa todos los lotes listos (readyAt <= now). Combinando los mensajes del lote en un solo lastMessage.
 */
export async function processReadyBatches(): Promise<{ processed: number; errors: number }> {
  const now = new Date();
  const batches = await prisma.botBatch.findMany({
    where: { status: "pending", readyAt: { lte: now } },
    orderBy: { readyAt: "asc" },
    include: {
      messages: { orderBy: { order: "asc" }, include: { message: true } },
      conversation: { include: { contact: true } },
    },
  });

  let processed = 0;
  let errors = 0;

  for (const batch of batches) {
    try {
      await prisma.botBatch.update({
        where: { id: batch.id },
        data: { status: "processing" },
      });

      const conv = batch.conversation;
      const contactId = conv.contactId;
      const contactPhone = conv.contact?.phone;
      if (!contactId || !contactPhone) {
        void botLog("warn", "batch", "Batch sin contact/phone: omitido", {
          conversationId: batch.conversationId,
          metadata: { batchId: batch.id },
        });
        await prisma.botBatch.update({ where: { id: batch.id }, data: { status: "processed" } });
        processed++;
        continue;
      }

      const combinedContent = batch.messages
        .map((bm) => {
          const m = bm.message;
          if (m.type === "text") return m.content;
          return `[${m.type}]`;
        })
        .join("\n\n---\n\n");

      const messageTypes = batch.messages.map((bm) => bm.message.type).join(",");
      void botLog("info", "batch", "Procesando batch → main_brain", {
        conversationId: batch.conversationId,
        contactId,
        phone: contactPhone,
        metadata: {
          batchId: batch.id,
          messageCount: batch.messages.length,
          messageTypes,
          combinedContentPreview: combinedContent.slice(0, 150),
          contactName: conv.contact?.name ?? undefined,
        },
      });

      await runMainBrain({
        conversationId: batch.conversationId,
        contactId,
        contactPhone,
        contactName: conv.contact?.name ?? undefined,
        lastMessage: combinedContent,
      });

      await prisma.botBatch.update({
        where: { id: batch.id },
        data: { status: "processed" },
      });
      processed++;
    } catch (e) {
      void botLog("error", "batch", "Error procesando batch", {
        conversationId: batch.conversationId,
        error: e instanceof Error ? e.message : String(e),
        metadata: { batchId: batch.id },
      });
      console.error("processReadyBatches batch error:", batch.id, e);
      await prisma.botBatch.update({
        where: { id: batch.id },
        data: { status: "pending" },
      }).catch(() => {});
      errors++;
    }
  }

  return { processed, errors };
}
