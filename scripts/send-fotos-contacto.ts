/**
 * Envía fotos/videos del catálogo a un contacto específico.
 * Uso: DATABASE_URL="..." npx tsx scripts/send-fotos-contacto.ts 573112599594
 */
import { PrismaClient } from "@prisma/client";
import { runMainBrain } from "../src/lib/bot/main-brain";

const prisma = new PrismaClient();

async function main() {
  const phoneArg = process.argv[2]?.replace(/\D/g, "");
  if (!phoneArg) {
    console.error("Uso: npx tsx scripts/send-fotos-contacto.ts 573112599594");
    process.exit(1);
  }

  const contact = await prisma.contact.findFirst({
    where: { phone: { contains: phoneArg.slice(-9) } },
    include: {
      conversations: {
        where: { channel: "bot" },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!contact) {
    console.error("Contacto no encontrado");
    process.exit(1);
  }

  const conv = contact.conversations[0];
  if (!conv) {
    console.error("Conversación bot no encontrada");
    process.exit(1);
  }

  const phone = contact.phone.replace(/\D/g, "");
  console.log(`\nEnviando fotos/videos a: ${contact.name || phone} (${phone})\n`);

  try {
    const result = await runMainBrain({
      conversationId: conv.id,
      contactId: contact.id,
      contactPhone: phone,
      contactName: contact.name ?? undefined,
      lastMessage: "Por favor envíame las fotos y videos de todos los barriles del catálogo",
    });

    if (result.replySent) {
      console.log("✓ Respuesta enviada correctamente.");
    } else {
      console.log("⚠ No se envió respuesta (revisar handoff/asignación).");
    }
  } catch (e) {
    console.error("Error:", e instanceof Error ? e.message : e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
