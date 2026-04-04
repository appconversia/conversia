import { execSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

function run(cmd) {
  execSync(cmd, { stdio: "inherit", env: process.env });
}

async function migrateDeployWithRetry() {
  if (!process.env.PRISMA_MIGRATE_ADVISORY_LOCK_TIMEOUT) {
    process.env.PRISMA_MIGRATE_ADVISORY_LOCK_TIMEOUT = "120000";
  }
  // Si solo hay DATABASE_URL (p.ej. local), Prisma necesita DIRECT_URL definido cuando está en schema
  if (process.env.DATABASE_URL && !process.env.DIRECT_URL) {
    process.env.DIRECT_URL = process.env.DATABASE_URL;
  }

  const tries = 4;
  for (let i = 0; i < tries; i++) {
    try {
      execSync("npx prisma migrate deploy", { stdio: "inherit", env: process.env });
      return;
    } catch {
      if (i === tries - 1) throw new Error("migrate deploy failed after retries");
      const waitSec = 12 + i * 6;
      console.warn(`[vercel-build] migrate deploy falló, reintento ${i + 2}/${tries} en ${waitSec}s…`);
      await delay(waitSec * 1000);
    }
  }
}

(async () => {
  if (process.env.DATABASE_URL) {
    await migrateDeployWithRetry();
  }
  run("npx prisma generate");
  if (process.env.DATABASE_URL) {
    run("node scripts/ensure-platform-admin.mjs");
  }
  run("npx next build");
})();
