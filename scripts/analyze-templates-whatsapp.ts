/**
 * Análisis de conversaciones para plantillas de reactivación WhatsApp
 * Uso: DATABASE_URL="postgresql://..." npx tsx scripts/analyze-templates-whatsapp.ts
 * NO modifica la BD - solo lectura
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PATRONES = {
  teEscribo: /te escribo|te escribo luego|después te escribo|más tarde|en un rato|ahorita te escribo|te contacto|te hablo|ya te escribo/i,
  interesProducto: /precio|cotización|cotizar|cuánto cuesta|cuánto vale|información del|info del|quiero (el|la|los|las)|me interesa|me gustaría|dame información|envíame|mándame|fotos?|video|vídeo|catálogo|barril|barriles|producto/i,
  pidioProducto: /el (primero|segundo|tercero|1|2|3)|número \d|aventurero|tierno|mlp|brochetero|grande|mediano|pequeño|delantal|gorras|carbón|cuál|cuáles/i,
  dudasCierre: /comprar|quiero comprar|cómo compro|dónde compro|envío|despacho|entrega|pago|formas de pago|transferencia|datos para|nombre|celular|dirección|pedido|orden/i,
  despedida: /gracias|chao|adiós|hasta luego|nos vemos|ok gracias|perfecto gracias|bye/i,
  saludo: /^hola|buenos días|buenas tardes|buenas noches|buen día|buena tarde|buenas/i,
};

type PatronKey = keyof typeof PATRONES;

interface ConvSummary {
  id: string;
  phone: string;
  name: string | null;
  msgCount: number;
  lastMsgFrom: "contact" | "bot";
  lastContactMsg: string | null;
  lastBotMsg: string | null;
  daysSinceLastContact: number;
  patronesContacto: PatronKey[];
  etapa: "saludo" | "interes" | "producto" | "cierre" | "te_escribo" | "despedida" | "otro";
}

function clasificarMensaje(texto: string): PatronKey[] {
  const found: PatronKey[] = [];
  for (const [k, re] of Object.entries(PATRONES)) {
    if (re.test(texto)) found.push(k as PatronKey);
  }
  return found;
}

function inferirEtapa(patrones: PatronKey[]): ConvSummary["etapa"] {
  if (patrones.includes("teEscribo")) return "te_escribo";
  if (patrones.includes("despedida") && !patrones.includes("interesProducto")) return "despedida";
  if (patrones.includes("dudasCierre")) return "cierre";
  if (patrones.includes("pidioProducto") || patrones.includes("interesProducto")) {
    return patrones.includes("dudasCierre") ? "cierre" : "producto";
  }
  if (patrones.includes("saludo") && patrones.length <= 1) return "saludo";
  return "otro";
}

async function main() {
  const LIMIT = 550;
  const MSGS_PER_CONV = 40;

  const convs = await prisma.conversation.findMany({
    where: { contactId: { not: null } },
    take: LIMIT,
    orderBy: { createdAt: "desc" },
    include: {
      contact: { select: { phone: true, name: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        take: MSGS_PER_CONV,
        select: { content: true, senderContactId: true, senderId: true, createdAt: true },
      },
    },
  });

  const summaries: ConvSummary[] = [];
  const ahora = new Date();

  for (const c of convs) {
    const msgs = c.messages;
    const fromContact = msgs.filter((m) => m.senderContactId);
    const fromBot = msgs.filter((m) => m.senderId);
    const lastContact = fromContact[fromContact.length - 1];
    const lastBot = fromBot[fromBot.length - 1];
    const lastMsgFrom =
      lastContact && lastBot
        ? lastContact.createdAt > lastBot.createdAt
          ? "contact"
          : "bot"
        : lastContact
          ? "contact"
          : "bot";
    const lastContactMsg = lastContact?.content ?? null;
    const lastBotMsg = lastBot?.content ?? null;
    const daysSinceLastContact = lastContact
      ? Math.floor((ahora.getTime() - lastContact.createdAt.getTime()) / (24 * 60 * 60 * 1000))
      : 999;

    const allContactText = fromContact.map((m) => m.content || "").join(" ");
    const patronesContacto = [...new Set(clasificarMensaje(allContactText))];
    const etapa = inferirEtapa(patronesContacto);

    summaries.push({
      id: c.id,
      phone: c.contact?.phone ?? "",
      name: c.contact?.name ?? null,
      msgCount: msgs.length,
      lastMsgFrom,
      lastContactMsg: lastContactMsg?.slice(0, 250) ?? null,
      lastBotMsg: lastBotMsg?.slice(0, 250) ?? null,
      daysSinceLastContact,
      patronesContacto,
      etapa,
    });
  }

  const porEtapa = Object.fromEntries(
    (["saludo", "interes", "producto", "cierre", "te_escribo", "despedida", "otro"] as const).map((e) => [
      e,
      summaries.filter((s) => s.etapa === e).length,
    ])
  );
  const porUltimoMensaje = {
    contacto: summaries.filter((s) => s.lastMsgFrom === "contact").length,
    bot: summaries.filter((s) => s.lastMsgFrom === "bot").length,
  };
  const teEscribo = summaries.filter((s) => s.patronesContacto.includes("teEscribo")).length;
  const conInteres = summaries.filter((s) =>
    s.patronesContacto.some((p) => ["interesProducto", "pidioProducto", "dudasCierre"].includes(p))
  ).length;
  const inactivas7d = summaries.filter((s) => s.daysSinceLastContact >= 7).length;
  const inactivas24h = summaries.filter((s) => s.daysSinceLastContact >= 1).length;
  const inactivas3d = summaries.filter((s) => s.daysSinceLastContact >= 3).length;

  const report = {
    totalAnalizadas: summaries.length,
    porEtapa,
    porUltimoMensaje,
    teEscribo,
    conInteres,
    inactivas24h,
    inactivas3d,
    inactivas7d,
    muestras: summaries.slice(0, 30).map((s) => ({
      phone: s.phone,
      etapa: s.etapa,
      lastContactMsg: s.lastContactMsg?.slice(0, 100),
      daysSince: s.daysSinceLastContact,
    })),
  };

  console.log(JSON.stringify(report, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
