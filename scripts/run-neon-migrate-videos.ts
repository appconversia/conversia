/**
 * Aplica migración de columna videos en Product (Neon producción).
 * Uso: DATABASE_URL="postgresql://..." npx tsx scripts/run-neon-migrate-videos.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "videos" TEXT;`
  );
  console.log("✓ Migración aplicada: columna videos en Product (si no existía).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
