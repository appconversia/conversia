/**
 * Diagnóstico CTA en producción - qué falló y por qué
 * DATABASE_URL="..." npx tsx scripts/diagnose-cta-produccion.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CTA_PATTERNS = [/alguna duda|quieres más detalles|asesor te ayuda/i, /te interesa.*dudas|asesor te atiende/i];

function isCta(content: string) {
  return CTA_PATTERNS.some((p) => p.test(content));
}

async function main() {
  const convs = await prisma.conversation.findMany({
    where: { channel: "bot" },
    orderBy: { createdAt: "desc" },
    take: 25,
    include: {
      contact: { select: { phone: true, name: true } },
      messages: { orderBy: { createdAt: "asc" }, select: { content: true, type: true, createdAt: true, senderId: true } },
    },
  });

  const sinCta: typeof convs = [];
  const conCta: typeof convs = [];

  for (const c of convs) {
    const botMsgs = c.messages.filter((m) => m.senderId);
    const hasSaludo = botMsgs.some((m) => /bienvenido|te enviamos nuestros barriles/i.test(m.content));
    const hasImages = botMsgs.some((m) => m.type === "image");
    const hasCta = botMsgs.some((m) => m.type === "text" && isCta(m.content));
    if (hasSaludo && hasImages) {
      if (hasCta) conCta.push(c);
      else sinCta.push(c);
    }
  }

  console.log("\n=== CONVERSACIONES SIN CTA (detalle) ===\n");

  for (const c of sinCta.slice(0, 5)) {
    const label = c.contact?.name || c.contact?.phone?.slice(-4) || "?";
    console.log(`--- ${label} (${c.id}) ---`);
    const botMsgs = c.messages.filter((m) => m.senderId);
    const last3 = botMsgs.slice(-5);
    for (const m of last3) {
      console.log(`  [${m.createdAt.toISOString()}] ${m.type}: ${(m.content || "").slice(0, 60)}`);
    }
    console.log("");

    const logs = await prisma.botLog.findMany({
      where: { conversationId: c.id },
      orderBy: { createdAt: "desc" },
      take: 15,
    });
    console.log("  Logs de esta conversación:");
    for (const l of logs) {
      console.log(`    [${l.createdAt.toISOString()}] ${l.level} ${l.stage}: ${l.message?.slice(0, 70)} ${l.error ? `| ${l.error.slice(0, 50)}` : ""}`);
    }
    console.log("");
  }

  console.log("\n=== LOGS whatsapp_send (errores/texto) últimos 2 días ===\n");

  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  const sendLogs = await prisma.botLog.findMany({
    where: {
      stage: "whatsapp_send",
      createdAt: { gte: twoDaysAgo },
      OR: [{ level: "error" }, { level: "warn" }, { message: { contains: "texto" } }],
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  for (const l of sendLogs) {
    console.log(`  [${l.createdAt.toISOString()}] ${l.level} | ${l.message} | conv=${l.conversationId?.slice(0, 8)} | ${l.error?.slice(0, 80) ?? ""}`);
  }

  console.log("\n=== ¿Hay logs de Reintento? (deploy con retry) ===\n");

  const retryLogs = await prisma.botLog.findMany({
    where: { message: { contains: "Reintento" } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  if (retryLogs.length === 0) {
    console.log("  No hay logs de Reintento. El código con sendGuaranteedCtaWithTyping puede no estar en prod.");
  } else {
    for (const l of retryLogs) {
      console.log(`  [${l.createdAt.toISOString()}] ${l.message}`);
    }
  }

  console.log("\n=== Última conversación con bienvenida (completa o no) ===\n");

  const lastWelcome = await prisma.botLog.findFirst({
    where: { message: { contains: "Mensaje de bienvenida" } },
    orderBy: { createdAt: "desc" },
  });
  if (lastWelcome) {
    console.log(`  [${lastWelcome.createdAt.toISOString()}] conv=${lastWelcome.conversationId}`);
    const conv = lastWelcome.conversationId
      ? await prisma.conversation.findUnique({
          where: { id: lastWelcome.conversationId },
          include: {
            contact: true,
            messages: { where: { senderId: { not: null } }, orderBy: { createdAt: "asc" } },
          },
        })
      : null;
    if (conv) {
      const hasCtaMsg = conv.messages.some((m) => m.type === "text" && isCta(m.content));
      console.log(`  Contacto: ${conv.contact?.name || conv.contact?.phone}`);
      console.log(`  Mensajes bot: ${conv.messages.length}`);
      console.log(`  Último: ${conv.messages[conv.messages.length - 1]?.type} - ${(conv.messages[conv.messages.length - 1]?.content || "").slice(0, 50)}`);
      console.log(`  Tiene CTA: ${hasCtaMsg}`);
    }
  }

  console.log("\n=== FIN DIAGNÓSTICO ===\n");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
