/**
 * Diagnóstico rápido: verificar conversaciones en la BD
 * Ejecutar: npx tsx scripts/check-conversations.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const total = await prisma.conversation.count();
  console.log(`\n📊 Total conversaciones en BD: ${total}\n`);

  if (total === 0) {
    console.log("No hay conversaciones en la base de datos.\n");
    return;
  }

  const byChannel = await prisma.conversation.groupBy({
    by: ["channel"],
    _count: true,
  });
  console.log("Por canal:", byChannel);

  const byStatus = await prisma.$queryRaw<
    { channel: string; handoff: number; assigned: number; bot_tab: number }[]
  >`
    SELECT 
      "channel",
      COUNT(*) FILTER (WHERE "handoffRequestedAt" IS NOT NULL AND "assignedToId" IS NULL) as handoff,
      COUNT(*) FILTER (WHERE "assignedToId" IS NOT NULL) as assigned,
      COUNT(*) FILTER (WHERE "channel" = 'bot' AND "handoffRequestedAt" IS NULL AND "assignedToId" IS NULL) as bot_tab
    FROM "Conversation"
    GROUP BY "channel"
  `;
  console.log("\nPor estado:");
  console.table(byStatus);

  const recent = await prisma.conversation.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: {
      contact: { select: { phone: true, name: true } },
      assignedTo: { select: { email: true } },
    },
  });
  console.log("\nÚltimas 5 conversaciones:");
  for (const c of recent) {
    console.log(
      `  - ${c.id.slice(0, 8)}... | channel=${c.channel} | handoff=${!!c.handoffRequestedAt} | assigned=${!!c.assignedToId} | contact=${c.contact?.phone ?? "N/A"}`
    );
  }
  console.log("");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
