import { PrismaClient } from "@prisma/client";
import { compare } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "admin@yjbarriles.com";
  const password = "Inicio-2026@@";

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.log("ERROR: Usuario no encontrado");
    return;
  }
  console.log("Usuario encontrado:", user.email, user.name, user.role, "active:", user.active);

  const valid = await compare(password, user.password);
  console.log("Contraseña válida:", valid);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
