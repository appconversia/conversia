import { prisma } from "@/lib/db";
import { botLog } from "../bot-logger";

/**
 * Ejecuta handoff: conversación pasa de bot a sin asignar.
 * - handoffRequestedAt = now
 * - assignedToId = null (queda en "sin asignar")
 * El dashboard actualiza por polling (Vercel serverless).
 */
export async function executeHandoff(conversationId: string, tenantId: string): Promise<void> {
  void botLog("info", "handoff", "executeHandoff: handoff solicitado → sin asignar", {
    conversationId,
    metadata: {
      action: "handoff_requested",
      handoffRequestedAt: "now",
      assignedToId: "null",
    },
  });
  const sinAsignarTag = await prisma.conversationTag.findUnique({
    where: { tenantId_slug: { tenantId, slug: "sin_asignar" } },
    select: { id: true },
  });
  await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      handoffRequestedAt: new Date(),
      assignedToId: null,
      ...(sinAsignarTag && { conversationTagId: sinAsignarTag.id }),
    },
  });
}
