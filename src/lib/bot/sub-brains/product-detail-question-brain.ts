/**
 * Cerebrito híbrido: detecta preguntas puntuales sobre productos (accesorios, características, dimensiones, etc.)
 * mediante regex, consulta la BD con datos reales, y la IA redacta la respuesta.
 * No modifica ni reemplaza el flujo existente; se invoca antes de processSalesFlow.
 */
import { prisma } from "@/lib/db";
import { callAI } from "@/lib/ai";
import { getBotAICredentials } from "@/lib/config";
import { getProductCatalog } from "../product-catalog";
import { fixWhatsAppFormat } from "./product-response-brain";
import { botLog } from "../bot-logger";

const GENERIC_WORDS = /^(producto|productos|item|items|grande|mediano|pequeño|con|el|la|de|del|y)$/i;

/** Normaliza para matcheo: MLP/M.L.P. → mlp */
function normalizeForMatch(s: string): string {
  return s.toLowerCase().replace(/\./g, "").replace(/_/g, "").replace(/\s+/g, " ").trim();
}

/** Regex: detecta si el mensaje es una pregunta puntual sobre detalles de un producto */
const PRODUCT_DETAIL_QUESTION =
  /\b(accesorios|accesorio|qu[eé]\s+(trae|incluye|tiene)|incluye|incluyen|trae|tienen|cu[aá]ntos?\s+\w+|dimensiones|dimensi[oó]n|caracter[ií]sticas|especificaciones|precio|stock|disponibilidad|obsequio|regalo|garant[ií]a|material|medidas|peso|alto|ancho|di[aá]metro)\b/i;

const ORDINALES: { re: RegExp; index: number }[] = [
  { re: /\b(el\s+)?(primero|1ro|1ero|numero\s*1|n[úu]mero\s*1|el\s+1)\b/i, index: 0 },
  { re: /\b(el\s+)?(segundo|2do|numero\s*2|n[úu]mero\s*2|el\s+2)\b/i, index: 1 },
  { re: /\b(el\s+)?(tercero|3ro|numero\s*3|n[úu]mero\s*3|el\s+3)\b/i, index: 2 },
  { re: /\b(el\s+)?(cuarto|4to|numero\s*4|el\s+4)\b/i, index: 3 },
  { re: /\b(el\s+)?(quinto|5to|numero\s*5|el\s+5)\b/i, index: 4 },
  { re: /\b(el\s+)?(sexto|6to|numero\s*6|el\s+6)\b/i, index: 5 },
  { re: /\b(el\s+)?(s[eé]ptimo|7mo|numero\s*7|el\s+7)\b/i, index: 6 },
  { re: /\b(el\s+)?(octavo|8vo|numero\s*8|el\s+8)\b/i, index: 7 },
  { re: /\b(el\s+)?(noveno|9no|numero\s*9|el\s+9)\b/i, index: 8 },
];
const ULTIMO_RE = /\b(el\s+)?[úu]ltimo\b/i;
const NUMERO_GEN_RE = /\b(?:el\s+)?(?:numero|n[úu]mero)\s*([1-9]\d{0,2})\b|\bel\s+([1-9]\d{0,2})\b/i;
const REFERENCIA_ULTIMO = /\b(él?\s+que\s+me\s+enviaste|el\s+que\s+me\s+enviaste|el\s+que\s+mostraste|el\s+de\s+las\s+fotos|ese\s+mismo)\b/i;

function lastMessageAsText(lastMessage: unknown): string {
  if (typeof lastMessage === "string") return lastMessage.trim();
  if (Array.isArray(lastMessage)) {
    return lastMessage
      .filter((p): p is { type: "text"; text: string } => p && p.type === "text" && typeof (p as { text?: string }).text === "string")
      .map((p) => (p as { text: string }).text)
      .join(" ")
      .trim();
  }
  return "";
}

function formatCharacteristicValue(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v.map(formatCharacteristicValue).join(", ");
  if (typeof v === "object") {
    return Object.entries(v)
      .map(([k, val]) => `${k}: ${formatCharacteristicValue(val)}`)
      .join("; ");
  }
  return String(v);
}

/** Serializa characteristics (JSON) a texto legible sin [object Object] */
function formatCharacteristics(charJson: string | null): string {
  if (!charJson || !charJson.trim()) return "";
  try {
    const obj = JSON.parse(charJson) as Record<string, unknown>;
    return Object.entries(obj)
      .map(([k, v]) => `${k}: ${formatCharacteristicValue(v)}`)
      .join("\n");
  } catch {
    return charJson;
  }
}

function findProductByName(productName: string) {
  return prisma.product.findFirst({
    where: {
      name: { contains: productName, mode: "insensitive" },
      available: true,
    },
    select: { name: true, description: true, price: true, characteristics: true, stock: true },
  });
}

function findSingleProductMatch(text: string, catalog: { name: string }[]): string | null {
  const textNorm = normalizeForMatch(text);
  const matched: string[] = [];
  for (const p of catalog) {
    const words = p.name
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2 && !GENERIC_WORDS.test(w));
    if (words.some((w) => textNorm.includes(normalizeForMatch(w)))) matched.push(p.name);
  }
  const uniqueMatched = [...new Set(matched)];
  return uniqueMatched.length === 1 ? uniqueMatched[0]! : null;
}

function resolveProductFromMessage(
  lastText: string,
  catalog: { name: string }[],
  lastProductSent?: string
): string | null {
  if (catalog.length === 0) return null;
  const t = lastText.trim();
  if (!t) return null;
  if (REFERENCIA_ULTIMO.test(t) && lastProductSent) return lastProductSent;
  if (ULTIMO_RE.test(t)) return catalog[catalog.length - 1]!.name;
  const numMatch = t.match(NUMERO_GEN_RE);
  if (numMatch) {
    const num = parseInt(numMatch[1] || numMatch[2] || "0", 10);
    if (num >= 1 && num <= catalog.length) return catalog[num - 1]!.name;
  }
  for (const { re, index } of ORDINALES) {
    if (re.test(t) && index < catalog.length) return catalog[index]!.name;
  }
  return findSingleProductMatch(t, catalog);
}

export type ProductDetailQuestionResult = {
  handled: boolean;
  reply?: string;
};

/**
 * Detecta preguntas puntuales sobre productos (regex), consulta BD y devuelve respuesta basada en datos reales.
 * Si no detecta o no puede resolver producto, retorna handled: false para que el flujo normal continúe.
 */
export async function processProductDetailQuestion(
  lastMessage: string | { type: string; text?: string }[],
  lastProductSent: string | undefined,
  contactName?: string | null,
  conversationId?: string,
  quotedMessage?: string
): Promise<ProductDetailQuestionResult> {
  const lastText = lastMessageAsText(lastMessage).trim();
  if (!lastText || lastText.length < 3) return { handled: false };

  if (!PRODUCT_DETAIL_QUESTION.test(lastText)) {
    return { handled: false };
  }

  const catalog = await getProductCatalog();
  // Si responden a un mensaje citado (ej. "info de este"), usar quotedMessage para resolver producto
  const textToResolve = quotedMessage?.trim() ? `${quotedMessage} ${lastText}` : lastText;
  const productName =
    lastProductSent ??
    resolveProductFromMessage(textToResolve, catalog, lastProductSent);
  if (!productName) {
    void botLog("info", "product_detail", "Pregunta puntual detectada pero no se pudo resolver producto", {
      conversationId,
      metadata: { lastText: lastText.slice(0, 60) },
    });
    return { handled: false };
  }

  const product = await findProductByName(productName);
  if (!product) {
    void botLog("warn", "product_detail", "Producto no encontrado en BD", {
      conversationId,
      metadata: { productName },
    });
    return { handled: false };
  }

  const creds = await getBotAICredentials();
  if (!creds) {
    void botLog("warn", "product_detail", "Sin credenciales IA: no se puede redactar respuesta", { conversationId });
    return { handled: false };
  }

  const charFormatted = formatCharacteristics(product.characteristics);
  const productDataBlock = `
Producto: ${product.name}
Precio: $${Number(product.price).toLocaleString()}
Stock: ${product.stock} unidades
Descripción: ${product.description}
${charFormatted ? `Características detalladas:\n${charFormatted}` : ""}
`.trim();

  const systemPrompt = `Eres el asesor de WhatsApp. El cliente hizo una pregunta puntual sobre un producto.
Tienes a continuación los datos REALES del producto (descripción, precio, características, dimensiones, incluye, accesorios, etc.).
Responde ÚNICAMENTE con la información que está en esos datos. Si algo no está, dilo brevemente. No inventes.
Formato WhatsApp: *negrita* con un asterisco. NUNCA ** ni # ## ###. Emojis con moderación (📦 ✨).
Responde en máximo 500 caracteres. Tono cercano y directo.`;

  const userPrompt = `Datos del producto (usa SOLO esta información):

${productDataBlock}

---

Pregunta del cliente: "${lastText}"

Responde basándote exclusivamente en los datos anteriores:`;

  try {
    const response = await callAI(creds.provider, [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ], {
      openaiKey: creds.openaiKey,
      anthropicKey: creds.anthropicKey,
      googleKey: creds.googleKey,
      model: creds.model,
      temperature: 0.3,
      maxTokens: 512,
    });

    const reply = fixWhatsAppFormat((response || "").trim().slice(0, 600));
    if (!reply || reply.length < 5) return { handled: false };

    void botLog("info", "product_detail", "Respuesta puntual generada desde BD", {
      conversationId,
      metadata: { productName, replyPreview: reply.slice(0, 80) },
    });
    return { handled: true, reply };
  } catch (e) {
    void botLog("warn", "product_detail", "IA falló al redactar respuesta puntual", {
      conversationId,
      metadata: { productName, error: e instanceof Error ? e.message : String(e) },
    });
    return { handled: false };
  }
}
