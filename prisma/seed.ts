import { PrismaClient, type UserRole } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

const SEED_PASSWORD = process.env.SEED_PASSWORD || "Inicio-00";

async function main() {
  // Etiquetas de conversaciones (si no existen)
  const systemTags = [
    { slug: "bot", name: "Bot", order: 0 },
    { slug: "sin_asignar", name: "Sin Asignar", order: 1 },
    { slug: "asistidas", name: "Asistidas", order: 2 },
  ];
  for (const t of systemTags) {
    const existing = await prisma.conversationTag.findUnique({ where: { slug: t.slug } });
    if (!existing) {
      await prisma.conversationTag.create({
        data: { ...t, isSystem: true },
      });
      console.log(`Etiqueta ${t.name} creada`);
    }
  }

  const hashedPassword = await hash(SEED_PASSWORD, 12);

  // Super Admin (solo para configuración del sistema)
  const superAdminEmail = process.env.SEED_SUPER_ADMIN_EMAIL || "superadmin@conversia.local";
  let superAdmin = await prisma.user.findUnique({ where: { email: superAdminEmail } });
  if (!superAdmin) {
    superAdmin = await prisma.user.create({
      data: {
        email: superAdminEmail,
        password: hashedPassword,
        name: "Super Admin",
        phone: "+57 300 000 0000",
        role: "super_admin",
      },
    });
    console.log("Super Admin creado");
  } else {
    await prisma.user.update({
      where: { email: superAdminEmail },
      data: { password: hashedPassword, role: "super_admin" },
    });
  }

  await prisma.appConfig.upsert({
    where: { key: "system_protected_user_id" },
    create: { key: "system_protected_user_id", value: superAdmin.id },
    update: { value: superAdmin.id },
  });

  // Admin
  const adminEmail = "admin@conversia.local";
  let admin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!admin) {
    admin = await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        name: "Administrador",
        phone: "+57 300 000 0001",
        role: "admin",
      },
    });
    console.log("Admin creado");
  } else {
    await prisma.user.update({
      where: { email: adminEmail },
      data: { password: hashedPassword, name: "Administrador", role: "admin" },
    });
  }

  // Usuario Bot (sistema) - para mensajes enviados por IA
  const botEmail = "bot@system.conversia.local";
  let bot = await prisma.user.findUnique({ where: { email: botEmail } });
  if (!bot) {
    bot = await prisma.user.create({
      data: {
        email: botEmail,
        password: hashedPassword,
        name: "Bot Conversia",
        role: "sistema" as UserRole,
      },
    });
    console.log("Usuario Bot creado");
  }
  await prisma.appConfig.upsert({
    where: { key: "bot_user_id" },
    create: { key: "bot_user_id", value: bot!.id },
    update: { value: bot!.id },
  });

  // Colaborador
  const colabEmail = "ventas@conversia.local";
  let colaborador = await prisma.user.findUnique({ where: { email: colabEmail } });
  if (!colaborador) {
    colaborador = await prisma.user.create({
      data: {
        email: colabEmail,
        password: hashedPassword,
        name: "Ventas",
        phone: "+57 300 000 0002",
        role: "colaborador",
      },
    });
    console.log("Colaborador creado");
  } else {
    await prisma.user.update({
      where: { email: colabEmail },
      data: { password: hashedPassword, name: "Ventas", role: "colaborador" },
    });
  }

  // NO se crean conversaciones ni mensajes de ejemplo - base limpia para conectar a nueva cuenta Meta

  // Flujos del bot: principal (saludo + IA)
  await prisma.botFlow.updateMany({ data: { isActive: false } });

  const saludoInicialTexto =
    "Bienvenido a Conversia. Soy tu asesor y estoy aquí para ayudarte. ¿En qué puedo ayudarte hoy?";

  const flowPrincipal = {
    name: "Flujo principal Conversia",
    description:
      "Primer mensaje: saludo. Resto: IA con memoria, catálogo, clasificación de interés y handoff.",
    flowJson: JSON.stringify({
      nodes: [
        { id: "trigger-1", type: "trigger", data: { label: "Mensaje entrante" } },
        {
          id: "cond-1",
          type: "condition",
          data: { label: "¿Primer mensaje?", condition: "first_message" },
        },
        {
          id: "respond-saludo",
          type: "respond",
          data: { label: "Saludo", text: saludoInicialTexto },
        },
        { id: "ai-chat-1", type: "ai_chat", data: { label: "Asistente IA" } },
      ],
      edges: [
        { source: "trigger-1", target: "cond-1" },
        { source: "cond-1", target: "respond-saludo" },
        { source: "cond-1", target: "ai-chat-1" },
      ],
    }),
    isActive: true,
  };
  const existingPrincipal = await prisma.botFlow.findFirst({
    where: { name: flowPrincipal.name },
  });
  if (!existingPrincipal) {
    await prisma.botFlow.create({ data: flowPrincipal });
    console.log("Flujo principal Conversia creado y activado");
  } else {
    await prisma.botFlow.update({
      where: { id: existingPrincipal.id },
      data: { flowJson: flowPrincipal.flowJson, isActive: true },
    });
    console.log("Flujo principal Conversia actualizado");
  }

  const flowHola = {
    name: "Saludo inicial (simple)",
    description: "Respuesta fija 'hola' en cada mensaje (sin IA)",
    flowJson: JSON.stringify({
      nodes: [
        { id: "trigger-1", type: "trigger", data: { label: "Inicio" } },
        { id: "respond-1", type: "respond", data: { label: "Responder", text: "hola" } },
      ],
      edges: [{ source: "trigger-1", target: "respond-1" }],
    }),
    isActive: false,
  };
  const existingHola = await prisma.botFlow.findFirst({
    where: { name: flowHola.name },
  });
  if (!existingHola) {
    await prisma.botFlow.create({ data: flowHola });
    console.log("Flujo 'Saludo inicial (simple)' creado (inactivo)");
  } else {
    await prisma.botFlow.update({
      where: { id: existingHola.id },
      data: { flowJson: flowHola.flowJson, isActive: false },
    });
  }

  // Categoría ejemplo (solo si no existe)
  let catEjemplo = await prisma.category.findFirst({ where: { name: "categoria ejemplo" } });
  if (!catEjemplo) {
    catEjemplo = await prisma.category.create({
      data: { name: "categoria ejemplo", order: 0 },
    });
    console.log("Categoría ejemplo creada");
  }

  // Productos ejemplo genéricos (solo si no existen)
  const productosEjemplo = [
    { name: "Producto ejemplo 1", description: "Descripción del producto ejemplo 1.", price: 10000, characteristics: '{"material":"genérico","tallas":"única"}' },
    { name: "Producto ejemplo 2", description: "Descripción del producto ejemplo 2.", price: 15000, characteristics: '{"material":"genérico"}' },
    { name: "Producto ejemplo 3", description: "Descripción del producto ejemplo 3.", price: 20000, characteristics: '{}' },
  ];
  const maxOrder = (await prisma.product.findFirst({ orderBy: { order: "desc" }, select: { order: true } }))?.order ?? -1;
  let order = maxOrder + 1;
  for (const p of productosEjemplo) {
    const existing = await prisma.product.findFirst({ where: { name: p.name, categoryId: catEjemplo!.id } });
    if (!existing) {
      await prisma.product.create({
        data: {
          name: p.name,
          description: p.description,
          price: p.price,
          stock: 50,
          available: true,
          categoryId: catEjemplo!.id,
          characteristics: p.characteristics,
          order: order++,
        },
      });
      console.log(`Producto ejemplo creado: ${p.name}`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
