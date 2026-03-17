/**
 * Deja la base de datos de producción en cero: elimina todas las conversaciones,
 * mensajes, participantes y leads de ejemplo. No toca User, AppConfig, BotFlow ni Contact.
 *
 * Ejecutar contra Neon (producción):
 *   DATABASE_URL="postgresql://user:pass@host/neondb?sslmode=require" npx tsx scripts/clean-production-conversations.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const dbUrl = process.env.DATABASE_URL ?? "";
  if (!dbUrl || !dbUrl.includes("neon")) {
    console.error("Usar DATABASE_URL de Neon (producción). Ejemplo:");
    console.error(
      '  DATABASE_URL="postgresql://user:pass@host/neondb?sslmode=require" npx tsx scripts/clean-production-conversations.ts'
    );
    process.exit(1);
  }

  console.log("Eliminando mensajes...");
  const deletedMessages = await prisma.message.deleteMany({});
  console.log("  Mensajes eliminados:", deletedMessages.count);

  console.log("Eliminando participantes de conversaciones...");
  const deletedParticipants = await prisma.conversationParticipant.deleteMany({});
  console.log("  Participantes eliminados:", deletedParticipants.count);

  console.log("Eliminando conversaciones...");
  const deletedConversations = await prisma.conversation.deleteMany({});
  console.log("  Conversaciones eliminadas:", deletedConversations.count);

  console.log("Eliminando leads (seguimiento)...");
  try {
    const deletedLeads = await prisma.lead.deleteMany({});
    console.log("  Leads eliminados:", deletedLeads.count);
  } catch (e: unknown) {
    const err = e as { meta?: { modelName?: string } };
    if (err?.meta?.modelName === "Lead") {
      console.log("  (tabla Lead no existe en esta BD; omitido)");
    } else {
      throw e;
    }
  }

  console.log("\nProducción en cero. Usuarios, AppConfig y BotFlow intactos.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
