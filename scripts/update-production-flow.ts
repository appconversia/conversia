/**
 * Actualiza en producción el flujo principal del bot con la bienvenida Conversia.
 * Ejecutar: DATABASE_URL="postgresql://...neon.../neondb?sslmode=require" npx tsx scripts/update-production-flow.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const WELCOME_TEXT =
  "Bienvenido a Conversia. Soy tu asesor y estoy aquí para ayudarte. ¿En qué puedo ayudarte hoy?";

const FLOW_JSON = {
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
      data: { label: "Saludo", text: WELCOME_TEXT },
    },
    { id: "ai-chat-1", type: "ai_chat", data: { label: "Asistente IA" } },
  ],
  edges: [
    { source: "trigger-1", target: "cond-1" },
    { source: "cond-1", target: "respond-saludo" },
    { source: "cond-1", target: "ai-chat-1" },
  ],
};

async function main() {
  const dbUrl = process.env.DATABASE_URL ?? "";
  if (!dbUrl || !dbUrl.includes("neon")) {
    console.error("Usar DATABASE_URL de Neon. Ejemplo:");
    console.error(
      '  DATABASE_URL="postgresql://user:pass@host/neondb?sslmode=require" npx tsx scripts/update-production-flow.ts'
    );
    process.exit(1);
  }

  let flow = await prisma.botFlow.findFirst({
    where: { name: "Flujo principal Conversia" },
  });

  if (flow) {
    await prisma.botFlow.update({
      where: { id: flow.id },
      data: {
        flowJson: JSON.stringify(FLOW_JSON),
        isActive: true,
      },
    });
    console.log("Flujo principal actualizado con la bienvenida Conversia.");
  } else {
    await prisma.botFlow.create({
      data: {
        name: "Flujo principal Conversia",
        description: "Primer mensaje: saludo. Resto: IA conversacional, catálogo, interés y handoff.",
        flowJson: JSON.stringify(FLOW_JSON),
        isActive: true,
      },
    });
    console.log("Flujo principal creado con la bienvenida Conversia.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
