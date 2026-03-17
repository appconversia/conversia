import { prisma } from "@/lib/db";
import { botLog } from "./bot-logger";

export type AIMessage = { role: "user" | "assistant"; content: string };

const MAX_MESSAGES = 150;

/**
 * Obtiene el contexto completo de la conversación para la IA.
 * Lee los ÚLTIMOS 150 mensajes (más recientes) en orden cronológico ascendente.
 * Importante: orderBy desc + take + reverse asegura que usemos el contexto reciente, no los 150 más antiguos.
 */
export async function getFullConversationContext(
  conversationId: string
): Promise<AIMessage[]> {
  const [totalCount, messages] = await Promise.all([
    prisma.message.count({ where: { conversationId } }),
    prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "desc" },
      take: MAX_MESSAGES,
      select: { senderId: true, senderContactId: true, content: true },
    }),
  ]);

  const result = messages
    .reverse()
    .map((m) => {
      const isFromContact = !!m.senderContactId;
      return {
        role: (isFromContact ? "user" : "assistant") as "user" | "assistant",
        content: m.content,
      };
    });

  void botLog("info", "conversation_memory", "Historial: últimos mensajes cargados", {
    conversationId,
    metadata: {
      totalInDb: totalCount,
      returned: result.length,
      truncated: totalCount > MAX_MESSAGES,
      lastRole: result[result.length - 1]?.role,
      lastContentPreview: result[result.length - 1]?.content?.slice(0, 80),
    },
  });

  return result;
}
