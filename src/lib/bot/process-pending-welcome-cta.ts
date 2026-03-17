import { prisma } from "@/lib/db";
import { getBotUserId } from "@/lib/config";
import { getPusherServer, PUSHER_CHANNEL_PREFIX } from "@/lib/pusher";
import { sendGuaranteedCtaWithTyping } from "./whatsapp-send";
import { botLog } from "./bot-logger";

/**
 * Procesa CTAs de bienvenida pendientes (segunda invocación).
 * Se ejecuta desde el cron para evitar timeout en el webhook.
 */
export async function processPendingWelcomeCtas(): Promise<{ sent: number; errors: number }> {
  const convs = await prisma.conversation.findMany({
    where: { pendingWelcomeCtaText: { not: null } },
    include: { contact: true },
    take: 20,
  });

  let sent = 0;
  let errors = 0;

  for (const c of convs) {
    const ctaText = c.pendingWelcomeCtaText;
    const phone = c.contact?.phone;
    if (!ctaText || !phone) continue;

    try {
      const botUserId = await getBotUserId();
      const result = await sendGuaranteedCtaWithTyping(
        phone,
        c.pendingWelcomeCtaMsgId ?? undefined,
        ctaText
      );

      if (botUserId) {
        const message = await prisma.message.create({
          data: {
            conversationId: c.id,
            senderId: botUserId,
            content: ctaText,
            type: "text",
            whatsappMessageId: result.ok ? result.messageId ?? null : null,
          },
          include: { sender: { select: { id: true, name: true, email: true } } },
        });

        const pusher = getPusherServer();
        if (pusher) {
          pusher
            .trigger(`${PUSHER_CHANNEL_PREFIX}${c.id}`, "new_message", {
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

      await prisma.conversation.update({
        where: { id: c.id },
        data: { pendingWelcomeCtaText: null, pendingWelcomeCtaMsgId: null },
      });
      sent++;
      void botLog("info", "batch", "CTA bienvenida enviada (segunda invocación)", {
        conversationId: c.id,
        phone,
      });
    } catch (e) {
      errors++;
      void botLog("error", "batch", "Error enviando CTA bienvenida", {
        conversationId: c.id,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return { sent, errors };
}
