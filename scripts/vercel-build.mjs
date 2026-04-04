import { execSync } from "node:child_process";

function run(cmd) {
  execSync(cmd, { stdio: "inherit", env: process.env });
}

if (process.env.DATABASE_URL) {
  run("npx prisma migrate deploy");
}
run("npx prisma generate");
run("npx next build");
