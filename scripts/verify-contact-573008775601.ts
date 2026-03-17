/**
 * Verificación del contacto 573008775601 en producción - SOLO LECTURA
 * Uso: npx tsx scripts/verify-contact-573008775601.ts
 */
import { PrismaClient } from "@prisma/client";

const PHONE = "573008775601";
const PHONE_CLEAN = PHONE.replace(/\D/g, "");

const prisma = new PrismaClient();

async function main() {
  console.log("\n=== VERIFICACIÓN CONTACTO 573008775601 ===\n");

  // 1. Buscar contacto (por número exacto o variantes)
  const contacts = await prisma.contact.findMany({
    where: {
      OR: [
        { phone: PHONE },
        { phone: PHONE_CLEAN },
        { phone: { contains: "3008775601" } },
        { phone: { contains: "573008775601" } },
      ],
    },
  });

  console.log("1. CONTACTO EN BD:");
  if (contacts.length === 0) {
    console.log("   ❌ No se encontró contacto con ese número.");
    console.log("   Buscando variantes...");
    const allContacts = await prisma.contact.findMany({
      where: { phone: { contains: "3008775601" } },
    });
    if (allContacts.length > 0) {
      console.log("   Encontrados:", allContacts.map((c) => c.phone));
    } else {
      console.log("   Ningún contacto coincide.");
    }
  } else {
    for (const c of contacts) {
      console.log(`   ✓ id=${c.id} | phone="${c.phone}" | name=${c.name ?? "(null)"}`);
    }
  }

  const contactIds = contacts.map((c) => c.id);
  if (contactIds.length === 0) {
    console.log("\n   No hay más datos que consultar sin el contacto.\n");
    return;
  }

  // 2. Conversaciones de este contacto
  const convs = await prisma.conversation.findMany({
    where: { contactId: { in: contactIds } },
    include: {
      contact: true,
      assignedTo: { select: { email: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  console.log("\n2. CONVERSACIONES:");
  if (convs.length === 0) {
    console.log("   (ninguna)");
  } else {
    for (const c of convs) {
      console.log(
        `   conv=${c.id} | channel=${c.channel} | assigned=${!!c.assignedToId} | handoff=${!!c.handoffRequestedAt}`
      );
    }
  }

  const convIds = convs.map((c) => c.id);

  // 3. Mensajes recientes (últimos 15)
  const messages = await prisma.message.findMany({
    where: { conversationId: { in: convIds } },
    orderBy: { createdAt: "desc" },
    take: 15,
    include: { sender: { select: { email: true } } },
  });

  console.log("\n3. ÚLTIMOS MENSAJES:");
  for (const m of messages) {
    const from = m.senderContactId ? "contacto" : m.sender?.email ?? "sistema";
    const waId = m.whatsappMessageId ? ` | waId=${m.whatsappMessageId.slice(0, 20)}...` : " | waId=(null)";
    console.log(
      `   [${m.createdAt.toISOString()}] ${from} | status=${m.status}${waId} | content="${(m.content ?? "").slice(0, 50)}..."`
    );
  }

  // 4. Mensajes de plantilla enviados por nosotros
  const templateMsgs = messages.filter(
    (m) => m.senderId && (m.content?.includes("[Plantilla:") || m.content?.includes("— "))
  );
  console.log("\n4. MENSAJES DE PLANTILLA ENVIADOS:");
  if (templateMsgs.length === 0) {
    console.log("   (ninguno en los últimos 15)");
  } else {
    for (const m of templateMsgs) {
      console.log(
        `   [${m.createdAt.toISOString()}] status=${m.status} | whatsappMessageId=${m.whatsappMessageId ?? "null"}`
      );
    }
  }

  // 5. BotLog relacionados con este teléfono
  const logs = await prisma.botLog.findMany({
    where: {
      OR: [{ phone: { contains: "3008775601" } }, { metadata: { contains: "3008775601" } }],
    },
    orderBy: { createdAt: "desc" },
    take: 15,
  });

  console.log("\n5. LOGS DEL BOT (phone/metadata con 3008775601):");
  if (logs.length === 0) {
    console.log("   (ninguno)");
  } else {
    for (const l of logs) {
      console.log(`   [${l.createdAt.toISOString()}] ${l.level} | ${l.stage}: ${l.message} | ${l.metadata ?? ""}`);
    }
  }

  // 6. Resumen de estado
  const lastFromContact = messages.find((m) => m.senderContactId);
  const lastFromUs = messages.find((m) => m.senderId && !m.senderContactId);
  console.log("\n6. RESUMEN:");
  console.log(`   Último mensaje del contacto: ${lastFromContact?.createdAt?.toISOString() ?? "N/A"}`);
  console.log(`   Último mensaje nuestro: ${lastFromUs?.createdAt?.toISOString() ?? "N/A"}`);
  if (lastFromUs?.whatsappMessageId) {
    console.log(`   whatsappMessageId del último nuestro: ${lastFromUs.whatsappMessageId}`);
  } else if (lastFromUs && !lastFromUs.senderContactId) {
    console.log(`   ⚠ Último mensaje nuestro SIN whatsappMessageId (posible fallo de envío)`);
  }

  console.log("\n");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
