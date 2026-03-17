/**
 * Verifica en las últimas 20 conversaciones (canal bot) si el mensaje CTA
 * "¿Alguna duda o quieres más detalles?" llegó después de las fotos de bienvenida.
 * Ejecutar: npx tsx scripts/verify-cta-bienvenida.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CTA_PATTERNS = [
  /alguna duda|quieres más detalles|asesor te ayuda/i,
  /te interesa.*dudas|asesor te atiende/i,
];

function isCtaMessage(content: string): boolean {
  return CTA_PATTERNS.some((p) => p.test(content));
}

async function main() {
  const convs = await prisma.conversation.findMany({
    where: { channel: "bot" },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      contact: { select: { phone: true, name: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          content: true,
          type: true,
          senderId: true,
          senderContactId: true,
          createdAt: true,
        },
      },
    },
  });

  console.log(`\n📊 Últimas ${convs.length} conversaciones (canal bot)\n`);

  let withCta = 0;
  let withoutCta = 0;
  let withImages = 0;
  let noImages = 0;

  for (const c of convs) {
    const botMsgs = c.messages.filter((m) => m.senderId && !m.senderContactId);
    const hasSaludo = botMsgs.some((m) =>
      /bienvenido a WhatsApiBot|te enviamos|ayudarte hoy/i.test(m.content)
    );
    const hasImages = botMsgs.some((m) => m.type === "image");
    const hasCta = botMsgs.some((m) => m.type === "text" && isCtaMessage(m.content));

    const ctaMsg = botMsgs.find((m) => m.type === "text" && isCtaMessage(m.content));
    const lastImage = botMsgs.filter((m) => m.type === "image").pop();
    const ctaAfterImages =
      hasCta && hasImages && ctaMsg && lastImage
        ? new Date(ctaMsg.createdAt) > new Date(lastImage.createdAt)
        : false;

    if (hasSaludo || hasImages) {
      if (hasCta) withCta++;
      else withoutCta++;
      if (hasImages) withImages++;
      else noImages++;
    }

    const contactLabel = c.contact?.name || c.contact?.phone?.slice(-4) || "?";
    const status = hasCta
      ? ctaAfterImages
        ? "✅ CTA OK (después de fotos)"
        : "⚠️ CTA antes de fotos?"
      : "❌ SIN CTA";

    console.log(
      `  ${c.id.slice(0, 8)}... | ${contactLabel} | saludo=${!!hasSaludo} | fotos=${hasImages ? botMsgs.filter((m) => m.type === "image").length : 0} | ${status}`
    );
  }

  console.log(`\n=== Resumen ===`);
  console.log(`  Con CTA después de fotos: ${withCta}`);
  console.log(`  Sin CTA (o antes de fotos): ${withoutCta}`);
  console.log(`  Con imágenes de bienvenida: ${withImages}`);
  console.log(`  Sin imágenes: ${noImages}`);
  console.log("");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
