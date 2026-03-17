import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const phone = "573213919766";
  const contact = await prisma.contact.findUnique({
    where: { phone },
    include: {
      conversations: {
        where: { channel: "bot" },
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          messages: {
            orderBy: { createdAt: "desc" },
            take: 40,
            select: {
              id: true,
              content: true,
              type: true,
              status: true,
              whatsappMessageId: true,
              senderContactId: true,
              createdAt: true,
            },
          },
        },
      },
    },
  });

  if (!contact?.conversations[0]) {
    console.log("No se encontró conversación para", phone);
    return;
  }

  const msgs = contact.conversations[0].messages.reverse();
  console.log(`\n=== Conversación con ${contact.name || phone} (${msgs.length} mensajes) ===\n`);

  for (const m of msgs) {
    const from = m.senderContactId ? "CONTACTO" : "BOT/AGENTE";
    const content = (m.content || "").slice(0, 45).replace(/\n/g, " ");
    const hasWaId = !!m.whatsappMessageId;
    console.log(
      `${m.createdAt.toISOString().slice(11, 19)} | ${from.padEnd(10)} | ${m.status.padEnd(9)} | wa_id:${hasWaId ? "SÍ" : "NO"} | ${m.type.padEnd(6)} | ${content}`
    );
  }

  const fromUs = msgs.filter((m) => !m.senderContactId);
  const withWaId = fromUs.filter((m) => m.whatsappMessageId);
  const read = fromUs.filter((m) => m.status === "read");
  const sentOnly = fromUs.filter((m) => m.status === "sent");

  console.log("\n=== Resumen mensajes enviados por nosotros ===");
  console.log(`Total: ${fromUs.length} | Con whatsappMessageId: ${withWaId.length} | Leídos (read): ${read.length} | Solo enviados (sent): ${sentOnly.length}`);
  if (sentOnly.length > 0) {
    console.log("\nMensajes que siguen en 'sent' (no delivered/read):");
    sentOnly.forEach((m) => {
      console.log(`  - ${m.createdAt.toISOString()} | wa_id: ${m.whatsappMessageId || "NULL"} | ${(m.content || "").slice(0, 50)}`);
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
