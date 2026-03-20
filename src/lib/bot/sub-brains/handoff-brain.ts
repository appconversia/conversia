import { prisma } from "@/lib/db";
import { getPusherServer, PUSHER_CHANNEL_PREFIX } from "@/lib/pusher";
import { botLog } from "../bot-logger";

/**
 * Ejecuta handoff: conversación pasa de bot a sin asignar.
 * - handoffRequestedAt = now
 * - assignedToId = null (queda en "sin asignar")
 * - Notifica por Pusher para actualizar el dashboard en tiempo real
 */
export async function executeHandoff(conversationId: string): Promise<void> {
  void botLog("info", "handoff", "executeHandoff: handoff solicitado → sin asignar", {
    conversationId,
    metadata: {
      action: "handoff_requested",
      handoffRequestedAt: "now",
      assignedToId: "null",
      pusherChannels: ["conversations-updates", conversationId],
    },
  });
  const sinAsignarTag = await prisma.conversationTag.findUnique({ where: { slug: "sin_asignar" }, select: { id: true } });
  await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      handoffRequestedAt: new Date(),
      assignedToId: null,
      ...(sinAsignarTag && { conversationTagId: sinAsignarTag.id }),
    },
  });
  const pusher = getPusherServer();
  if (pusher) {
    pusher
      .trigger(`${PUSHER_CHANNEL_PREFIX}${conversationId}`, "handoff_requested", { conversationId })
      .catch((e) => console.error("Pusher handoff:", e));
    pusher
      .trigger("conversations-updates", "handoff_requested", { conversationId })
      .catch((e) => console.error("Pusher handoff:", e));
  }
}
