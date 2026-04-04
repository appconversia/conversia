/**
 * Crea o actualiza el super admin de plataforma (SaaS) en la base de datos.
 * Se ejecuta tras `prisma migrate deploy` en el build de Vercel para que Neon
 * siempre tenga credenciales alineadas con SEED_PLATFORM_SUPER_ADMIN_*.
 */
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

const emailRaw = process.env.SEED_PLATFORM_SUPER_ADMIN_EMAIL || "jhon@jhon.com";
const password = process.env.SEED_PLATFORM_SUPER_ADMIN_PASSWORD || "Inicio-2026";
const email = emailRaw.trim().toLowerCase();

async function main() {
  const hashedPassword = await hash(password, 12);

  const existing = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  });

  if (!existing) {
    await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: "Super Admin Plataforma",
        role: "super_admin",
        tenantId: null,
        active: true,
      },
    });
    console.log("[ensure-platform-admin] Creado:", email);
    return;
  }

  await prisma.user.update({
    where: { id: existing.id },
    data: {
      email,
      password: hashedPassword,
      role: "super_admin",
      tenantId: null,
      active: true,
    },
  });
  console.log("[ensure-platform-admin] Actualizado:", email);
}

main()
  .catch((e) => {
    console.error("[ensure-platform-admin]", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
