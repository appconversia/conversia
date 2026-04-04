import { execSync } from "node:child_process";

function run(cmd) {
  execSync(cmd, { stdio: "inherit", env: process.env });
}

if (process.env.DATABASE_URL) {
  run("npx prisma migrate deploy");
}
run("npx prisma generate");
if (process.env.DATABASE_URL) {
  run("node scripts/ensure-platform-admin.mjs");
}
run("npx next build");
