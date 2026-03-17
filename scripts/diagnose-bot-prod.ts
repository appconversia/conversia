/**
 * Diagnóstico del bot en producción - NO modifica nada
 * Uso: DATABASE_URL="postgresql://..." npx tsx scripts/diagnose-bot-prod.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: {
    db: { url: process.env.DATABASE_URL },
  },
});

async function main() {
  console.log("\n=== DIAGNÓSTICO BOT PRODUCCIÓN ===\n");

  // 1. AppConfig relevante
  const configKeys = [
    "whatsapp_enabled",
    "bot_enabled",
    "bot_batch_config",
    "bot_user_id",
    "whatsapp_phone_number_id",
  ];
  const configs = await prisma.appConfig.findMany({
    where: { key: { in: configKeys } },
  });
  console.log("1. CONFIGURACIÓN (AppConfig):");
  for (const c of configs) {
    let val = c.value;
    if (c.key.includes("token")) val = val ? "[MASKED]" : null;
    console.log(`   ${c.key}: ${val ?? "(null)"}`);
  }

  // 2. Batches pendientes
  const batches = await prisma.botBatch.findMany({
    where: { status: { in: ["pending", "processing"] } },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { _count: { select: { messages: true } } },
  });
  console.log("\n2. BATCHES PENDIENTES/PROCESANDO:");
  if (batches.length === 0) {
    console.log("   (ninguno)");
  } else {
    for (const b of batches) {
      console.log(
        `   ${b.id} | conv=${b.conversationId.slice(0, 8)}... | status=${b.status} | msgs=${b._count.messages} | readyAt=${b.readyAt}`
      );
    }
  }

  // 3. Conversaciones asignadas (bot no responde)
  const assigned = await prisma.conversation.findMany({
    where: { channel: "bot", assignedToId: { not: null } },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { contact: true },
  });
  console.log("\n3. CONVERSACIONES ASIGNADAS (bot no responde):");
  if (assigned.length === 0) {
    console.log("   (ninguna)");
  } else {
    for (const a of assigned) {
      console.log(
        `   conv=${a.id.slice(0, 8)}... | phone=${a.contact?.phone} | assignedTo=${a.assignedToId?.slice(0, 8)}...`
      );
    }
  }

  // 4. Últimos BotLog (incluir más y filtrar errores)
  const logs = await prisma.botLog.findMany({
    where: { level: { in: ["error", "warn"] } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  console.log("\n4a. LOGS ERROR/WARN (últimos 20):");
  if (logs.length === 0) {
    console.log("   (ninguno)");
  } else {
    for (const l of logs) {
      console.log(`   [${l.createdAt}] ${l.level} | ${l.stage}: ${l.message?.slice(0, 80)} | ${l.error?.slice(0, 60) ?? ""}`);
    }
  }

  const allLogs = await prisma.botLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 25,
  });
  console.log("\n4b. ÚLTIMOS 25 LOGS DEL BOT:");
  for (const l of allLogs) {
    const err = l.error ? ` | error=${l.error.slice(0, 80)}` : "";
    console.log(`   [${l.createdAt}] ${l.level} | ${l.stage}: ${l.message?.slice(0, 60)}${err}`);
  }

  // 5. Mensajes recientes (separar bot vs contacto)
  const recentMsgs = await prisma.message.findMany({
    where: { conversation: { channel: "bot" } },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { conversation: { include: { contact: true } } },
  });
  console.log("\n5. ÚLTIMOS 20 MENSAJES (canal bot) - senderId=bot, senderContactId=contacto:");
  const fromBot = recentMsgs.filter((m) => m.senderId);
  const fromContact = recentMsgs.filter((m) => m.senderContactId);
  console.log(`   Del BOT: ${fromBot.length} | Del CONTACTO: ${fromContact.length}`);
  for (const m of recentMsgs.slice(0, 12)) {
    const from = m.senderId ? "BOT" : "contact";
    const convLabel = m.conversation?.contact?.phone?.slice(-4) ?? "?";
    console.log(`   [${m.createdAt.toISOString().slice(11, 19)}] conv..${convLabel} | ${from} | ${m.type}: ${(m.content || "").slice(0, 45)}...`);
  }

  // 6. Conversación Pixel Hub (573213919766) - mensajes bot vs contacto
  const pixelConv = await prisma.conversation.findFirst({
    where: { contact: { phone: { contains: "3213919766" } }, channel: "bot" },
    include: { contact: true, messages: { orderBy: { createdAt: "asc" }, take: 30 } },
  });
  if (pixelConv) {
    console.log("\n6. CONVERSACIÓN PIXEL HUB (3213919766):");
    const botMsgs = pixelConv.messages.filter((m) => m.senderId);
    const contactMsgs = pixelConv.messages.filter((m) => m.senderContactId);
    console.log(`   Total mensajes: ${pixelConv.messages.length} | Bot: ${botMsgs.length} | Contacto: ${contactMsgs.length}`);
    for (const m of pixelConv.messages.slice(-10)) {
      const from = m.senderId ? "BOT" : "contact";
      console.log(`   [${m.createdAt.toISOString().slice(11, 19)}] ${from}: ${(m.content || String(m.type)).slice(0, 50)}`);
    }
  }

  console.log("\n=== FIN DIAGNÓSTICO ===\n");
}

main()
  .catch((e) => {
    console.error("Error:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
