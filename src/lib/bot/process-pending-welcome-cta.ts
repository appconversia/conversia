import { prisma } from "@/lib/db";
import { getBotUserId } from "@/lib/config";
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
      const tenantId = c.tenantId;
      const botUserId = await getBotUserId(tenantId);
      const result = await sendGuaranteedCtaWithTyping(
        tenantId,
        phone,
        c.pendingWelcomeCtaMsgId ?? undefined,
        ctaText
      );

      if (botUserId) {
        await prisma.message.create({
          data: {
            conversationId: c.id,
            senderId: botUserId,
            content: ctaText,
            type: "text",
            whatsappMessageId: result.ok ? result.messageId ?? null : null,
          },
        });
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
