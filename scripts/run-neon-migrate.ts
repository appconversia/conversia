/**
 * Ejecuta la migración de videos en Neon (producción).
 * DATABASE_URL="postgresql://..." npx tsx scripts/run-neon-migrate.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const tables = await prisma.$queryRawUnsafe<{ tablename: string }[]>(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;`
  );
  console.log("Tablas en public:", tables.map((t) => t.tablename).join(", "));

  const tableName = tables.some((t) => t.tablename === "Product")
    ? "Product"
    : tables.some((t) => t.tablename === "product")
      ? "product"
      : null;

  if (!tableName) {
    console.error("No se encontró la tabla Product/product.");
    process.exit(1);
  }

  await prisma.$executeRawUnsafe(
    `ALTER TABLE "${tableName}" ADD COLUMN IF NOT EXISTS "videos" TEXT;`
  );
  console.log(`✓ Migración aplicada: columna videos agregada a ${tableName}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
