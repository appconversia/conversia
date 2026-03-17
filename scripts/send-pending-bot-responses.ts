/**
 * Envía respuestas pendientes del bot en la etiqueta "Bot".
 * Solo procesa conversaciones donde el último mensaje es del contacto y no hay respuesta del bot.
 * NO modifica ni borra nada; solo envía mensajes faltantes por WhatsApp y los guarda en BD.
 *
 * Uso: DATABASE_URL="postgresql://..." npx tsx scripts/send-pending-bot-responses.ts
 */
import { PrismaClient } from "@prisma/client";
import { runMainBrain } from "../src/lib/bot/main-brain";

const prisma = new PrismaClient();

async function main() {
  // Conversaciones en etiqueta "Bot": channel=bot, sin handoff, sin asignar
  const botTabConvs = await prisma.conversation.findMany({
    where: {
      channel: "bot",
      handoffRequestedAt: null,
      assignedToId: null,
    },
    include: {
      contact: true,
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  console.log(`\n=== Enviando respuestas pendientes del bot ===`);
  console.log(`Conversaciones en etiqueta Bot: ${botTabConvs.length}\n`);

  const pending: Array<{
    conv: (typeof botTabConvs)[0];
    lastContactMsg: { content: string; type: string };
  }> = [];

  for (const conv of botTabConvs) {
    const msgs = conv.messages;
    if (msgs.length === 0) continue;

    const lastMsg = msgs[msgs.length - 1]!;
    const isLastFromContact = !!lastMsg.senderContactId;

    if (!isLastFromContact) continue; // Ya respondió el bot

    // Combinar mensajes del contacto sin responder (desde el último mensaje del bot)
    const lastBotIdx = msgs.findLastIndex((m) => m.senderId != null);
    const unresponded = lastBotIdx >= 0 ? msgs.slice(lastBotIdx + 1) : msgs;
    const combinedContent = unresponded
      .filter((m) => m.senderContactId)
      .map((m) => (m.type === "text" ? m.content : `[${m.type}]`))
      .join("\n\n---\n\n");

    if (!combinedContent.trim()) continue;

    pending.push({
      conv,
      lastContactMsg: { content: combinedContent, type: lastMsg.type },
    });
  }

  console.log(`Pendientes de respuesta: ${pending.length}\n`);

  let sent = 0;
  let errors = 0;

  for (const { conv, lastContactMsg } of pending) {
    const contact = conv.contact;
    if (!contact?.phone) {
      console.log(`  ⏭ Omitido ${conv.id}: sin teléfono`);
      continue;
    }

    const phone = contact.phone.replace(/\D/g, "");
    console.log(`  📤 Procesando: ${contact.name || phone} (${phone.slice(-4)})...`);

    try {
      const result = await runMainBrain({
        conversationId: conv.id,
        contactId: contact.id,
        contactPhone: phone,
        contactName: contact.name ?? undefined,
        lastMessage: lastContactMsg.content,
      });

      if (result.replySent) {
        sent++;
        console.log(`     ✓ Respuesta enviada`);
      } else {
        console.log(`     ⚠ Sin respuesta (handoff o asignada)`);
      }
    } catch (e) {
      errors++;
      console.log(`     ✗ Error: ${e instanceof Error ? e.message : String(e)}`);
    }

    // Pequeña pausa entre envíos para no saturar WhatsApp
    await new Promise((r) => setTimeout(r, 1500));
  }

  console.log(`\n=== Resumen ===`);
  console.log(`Enviadas: ${sent} | Errores: ${errors} | Total pendientes: ${pending.length}`);
  console.log(`\n✓ Completado.\n`);
}

main()
  .catch((e) => {
    console.error("Error fatal:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
