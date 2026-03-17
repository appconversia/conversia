/**
 * Corrige el usuario bot en producción: crea si no existe y sincroniza AppConfig.
 * NO borra nada. Solo crea/actualiza el usuario bot y la config.
 */
import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const botEmail = "bot@system.whatsapibot.local";
  const currentBotId = await prisma.appConfig.findUnique({
    where: { key: "bot_user_id" },
  }).then((r) => r?.value ?? null);

  console.log("Estado actual:");
  console.log("  bot_user_id en AppConfig:", currentBotId ?? "(vacío)");

  let bot = await prisma.user.findUnique({ where: { email: botEmail } });
  if (bot) {
    console.log("  Usuario bot existe:", bot.id);
  } else {
    console.log("  Usuario bot NO existe, creando...");
    const hashedPassword = await bcrypt.hash("bot-system-no-login-" + Date.now(), 10);
    bot = await prisma.user.create({
      data: {
        email: botEmail,
        password: hashedPassword,
        name: "Bot WhatsApiBot",
        role: "sistema",
      },
    });
    console.log("  Usuario bot creado:", bot.id);
  }

  // Sincronizar AppConfig para que apunte al usuario bot correcto
  await prisma.appConfig.upsert({
    where: { key: "bot_user_id" },
    create: { key: "bot_user_id", value: bot.id },
    update: { value: bot.id },
  });
  console.log("  AppConfig bot_user_id actualizado a:", bot.id);

  // Verificación: insertar mensaje de prueba y eliminar
  const conv = await prisma.conversation.findFirst({ where: { channel: "bot" } });
  if (conv) {
    const testMsg = await prisma.message.create({
      data: {
        conversationId: conv.id,
        senderId: bot.id,
        content: "[Verificación] Mensaje de prueba - se eliminará",
        type: "text",
      },
    });
    console.log("  Verificación: insert OK, id:", testMsg.id);
    await prisma.message.delete({ where: { id: testMsg.id } });
    console.log("  Verificación: mensaje de prueba eliminado.");
  }

  console.log("\n✓ Corrección completada. El bot ahora podrá guardar mensajes en el panel.");
}

main()
  .catch((e) => {
    console.error("Error:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
