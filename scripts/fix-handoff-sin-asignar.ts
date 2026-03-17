/**
 * Mueve a "Sin asignar" las conversaciones donde el bot prometió un asesor
 * pero no se ejecutó executeHandoff (handoffRequestedAt sigue null).
 *
 * Condiciones (conservadoras): último mensaje del bot debe contener promesa
 * explícita de asesor (contactará, atiende, ayudará, conectarte, etc.).
 * NO borra ni modifica nada más.
 *
 * Uso: DATABASE_URL="..." npx tsx scripts/fix-handoff-sin-asignar.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Solo promesa EXPLÍCITA: "te contactará", "te contactarán", "conectarte con asesor".
// NO incluir el CTA estándar "un asesor te atiende" (oferta, no promesa de acción).
const PROMESA_ASESOR =
  /(te\s+contactar[aá]n?|te\s+comunicar[aá]n?|conecta(rte|rse)\s+con\s+(un\s+)?asesor)/i;

async function main() {
  const convs = await prisma.conversation.findMany({
    where: {
      channel: "bot",
      handoffRequestedAt: null,
      assignedToId: null,
    },
    include: {
      contact: true,
      messages: { orderBy: { createdAt: "desc" }, take: 3 },
    },
  });

  console.log(`\n=== Revisando handoff pendiente ===`);
  console.log(`Conversaciones en Bot (sin handoff): ${convs.length}\n`);

  const toFix: Array<{ id: string; contact: string; lastBot: string }> = [];

  for (const conv of convs) {
    const lastMsg = conv.messages[0];
    if (!lastMsg || lastMsg.senderContactId) continue; // último no es del bot

    const botContent = (lastMsg.content || "").trim();
    if (!botContent || botContent.length < 20) continue;

    if (PROMESA_ASESOR.test(botContent)) {
      toFix.push({
        id: conv.id,
        contact: conv.contact?.name || conv.contact?.phone || "?",
        lastBot: botContent.slice(0, 80),
      });
    }
  }

  console.log(`Cumplen condiciones (bot prometió asesor): ${toFix.length}\n`);

  for (const { id, contact, lastBot } of toFix) {
    console.log(`  📌 ${contact}`);
    console.log(`     Bot dijo: "${lastBot}..."`);
  }

  if (toFix.length === 0) {
    console.log("Ninguna conversación pendiente de mover.\n");
    return;
  }

  console.log(`\nAplicando handoffRequestedAt a ${toFix.length} conversaciones...`);

  for (const { id } of toFix) {
    await prisma.conversation.update({
      where: { id },
      data: { handoffRequestedAt: new Date() },
    });
    console.log(`  ✓ ${id.slice(0, 8)}...`);
  }

  console.log(`\n✓ Completado. ${toFix.length} conversaciones movidas a "Sin asignar".\n`);
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
