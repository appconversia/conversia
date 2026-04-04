import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await hash("Inicio-2026@@", 12);
  const ventasPassword = await hash("Inicio-2026", 12);

  await prisma.user.upsert({
    where: { email: "admin@whatsapibot.local" },
    create: {
      email: "admin@whatsapibot.local",
      password: adminPassword,
      name: "Admin Conversia",
      role: "super_admin",
    },
    update: {
      password: adminPassword,
      name: "Admin Conversia",
      role: "super_admin",
    },
  });
  console.log("Admin Conversia creado/actualizado");

  await prisma.user.upsert({
    where: { email: "ventas@whatsapibot.local" },
    create: {
      email: "ventas@whatsapibot.local",
      password: ventasPassword,
      name: "Ventas",
      role: "colaborador",
    },
    update: {
      password: ventasPassword,
      name: "Ventas",
      role: "colaborador",
    },
  });
  console.log("Ventas creado/actualizado");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
