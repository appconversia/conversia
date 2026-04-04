import { callAIMultimodal, type ContentPart, type AIMessageMultimodal } from "@/lib/ai-multimodal";
import { getBotAICredentials, type BotProvider } from "@/lib/config";
import { getProductsTrainingText } from "@/lib/products/sync-bot";
import { DEFAULT_BOT_SYSTEM_PROMPT } from "../default-system-prompt";
import { classifyIsGreeting } from "../greeting-classifier";
import { getProductCatalog, type ProductMedia } from "../product-catalog";
import { buildProductResponses, fixWhatsAppFormat } from "./product-response-brain";
import { sendWhatsAppImage, sendWhatsAppVideo } from "../whatsapp-send";
import { botLog } from "../bot-logger";

/** Preferencia de media: solo video, solo imagen, o ambos (por defecto) */
export type MediaPreference = "video_only" | "image_only" | "both";

export type SalesFlowOutput = {
  reply: string;
  sendImages: boolean;
  handoffRequired: boolean;
  /** Si true: NO_ENTIENDO o FUERA_DE_ALCANCE → main-brain usa scope-guard (mensaje límite + lista) */
  scopeGuardTriggered?: boolean;
  interestLevel?: "alto" | "medio" | "bajo" | null;
  leadNotes?: string | null;
  productInterest?: string | null;
  /** Filtro para sendProductImages: null = enviar todos, string | string[] = filtrar por nombre(s) */
  productFilter?: string | string[] | null;
  /** Si pide descripción completa de un producto (tras imagen/video): enviar ficha completa, no media */
  sendFullDescription?: string | null;
  /** CTA personalizado por IA para enviar después de las imágenes (emojis, nombre, no genérico) */
  ctaMessage?: string | null;
  /** Solo video, solo imagen o ambos. Por defecto: both. */
  mediaPreference?: MediaPreference;
};

function lastMessageAsText(lastMessage: string | ContentPart[]): string {
  if (typeof lastMessage === "string") return lastMessage;
  return lastMessage
    .filter((p): p is ContentPart & { type: "text" } => p.type === "text")
    .map((p) => p.text)
    .join(" ");
}

const MEDIA_DELAY_MS = 600;
/** Pausa entre productos (video+imagen) en la cola de envío */
const PRODUCT_DELAY_MS = 1200;

const GENERIC_WORDS = /^(producto|productos|item|items|grande|mediano|pequeño|con|el|la|de|del|y)$/i;

/** Valida y corrige nombres inventados por la IA (extensible por negocio) */
function validateAndCorrectProductResponse(text: string): string {
  return text;
}

/** Normaliza para matcheo: MLP/M.L.P. → mlp. Permite que "el mlp" matchee "El Barril M.L.P." */
function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/_/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Híbrido 2: cuando la IA no devuelve PRODUCT_INTEREST, infiere por palabra distintiva. Solo 1 match → ese producto. */
/** Deduplica por nombre: el catálogo tiene video+imagen por producto, evita matched.length===2 con mismo producto. */
function findSingleProductMatch(
  lastText: string,
  catalog: { name: string }[]
): string | null {
  const textNorm = normalizeForMatch(lastText);
  const matched: string[] = [];
  for (const product of catalog) {
    const words = product.name
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2 && !GENERIC_WORDS.test(w));
    if (words.some((w) => textNorm.includes(normalizeForMatch(w)))) {
      matched.push(product.name);
    }
  }
  const uniqueMatched = [...new Set(matched)];
  return uniqueMatched.length === 1 ? uniqueMatched[0]! : null;
}

/** Resolución por nombre: "video del barril X", "imagen del X" → busca producto cuyo nombre esté en el texto. */
function resolveByNameReference(lastText: string, catalog: { name: string }[]): string | null {
  if (catalog.length === 0) return null;
  const textLower = lastText.toLowerCase().trim();
  if (!textLower) return null;
  const uniqueNames = getUniqueProductNames(catalog);
  const matched = uniqueNames.filter((name) => textLower.includes(name.toLowerCase()));
  return matched.length === 1 ? matched[0]! : null;
}

const ORDINALES: { re: RegExp; index: number }[] = [
  { re: /\b(el\s+)?(primero|1ro|1ero|numero\s*1|n[úu]mero\s*1|el\s+1)\b/i, index: 0 },
  { re: /\b(el\s+)?(segundo|2do|numero\s*2|n[úu]mero\s*2|el\s+2)\b/i, index: 1 },
  { re: /\b(el\s+)?(tercero|3ro|3ero|numero\s*3|n[úu]mero\s*3|el\s+3)\b/i, index: 2 },
  { re: /\b(el\s+)?(cuarto|4to|numero\s*4|n[úu]mero\s*4|el\s+4)\b/i, index: 3 },
  { re: /\b(el\s+)?(quinto|5to|numero\s*5|n[úu]mero\s*5|el\s+5)\b/i, index: 4 },
  { re: /\b(el\s+)?(sexto|6to|numero\s*6|n[úu]mero\s*6|el\s+6)\b/i, index: 5 },
  { re: /\b(el\s+)?(s[eé]ptimo|7mo|numero\s*7|n[úu]mero\s*7|el\s+7)\b/i, index: 6 },
  { re: /\b(el\s+)?(octavo|8vo|numero\s*8|n[úu]mero\s*8|el\s+8)\b/i, index: 7 },
  { re: /\b(el\s+)?(noveno|9no|numero\s*9|n[úu]mero\s*9|el\s+9)\b/i, index: 8 },
  { re: /\b(el\s+)?(d[eé]cimo|10mo|numero\s*10|n[úu]mero\s*10|el\s+10)\b/i, index: 9 },
  { re: /\b(el\s+)?(und[eé]cimo|11vo|numero\s*11|n[úu]mero\s*11|el\s+11)\b/i, index: 10 },
  { re: /\b(el\s+)?(duod[eé]cimo|12vo|numero\s*12|n[úu]mero\s*12|el\s+12)\b/i, index: 11 },
  { re: /\b(el\s+)?(decimotercero|13ro|numero\s*13|n[úu]mero\s*13|el\s+13)\b/i, index: 12 },
  { re: /\b(el\s+)?(decimocuarto|14to|numero\s*14|n[úu]mero\s*14|el\s+14)\b/i, index: 13 },
  { re: /\b(el\s+)?(decimoquinto|15to|numero\s*15|n[úu]mero\s*15|el\s+15)\b/i, index: 14 },
  { re: /\b(el\s+)?(decimosexto|16to|numero\s*16|n[úu]mero\s*16|el\s+16)\b/i, index: 15 },
  { re: /\b(el\s+)?(decimos[eé]ptimo|17mo|numero\s*17|n[úu]mero\s*17|el\s+17)\b/i, index: 16 },
  { re: /\b(el\s+)?(decimoctavo|18vo|numero\s*18|n[úu]mero\s*18|el\s+18)\b/i, index: 17 },
  { re: /\b(el\s+)?(decimonoveno|19no|numero\s*19|n[úu]mero\s*19|el\s+19)\b/i, index: 18 },
  { re: /\b(el\s+)?(vig[eé]simo|20vo|numero\s*20|n[úu]mero\s*20|el\s+20)\b/i, index: 19 },
];
const ULTIMO_RE = /\b(el\s+)?[úu]ltimo\b/i;
const NUMERO_GEN_RE = /\b(?:el\s+)?(?:numero|n[úu]mero)\s*([1-9]\d{0,2})\b|\bel\s+([1-9]\d{0,2})\b/i;
const NUMERO_UNO_RE = /\b(?:numero|n[úu]mero)\s+uno\b|\bel\s+uno\b|\b(?:producto|item)\s+numero\s+uno\b|\b(?:producto|item)\s+n[úu]mero\s+uno\b/i;

/** Lista única de productos por orden (para posiciones). */
function getUniqueProductNames(catalog: { name: string }[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const c of catalog) {
    if (!seen.has(c.name)) {
      seen.add(c.name);
      out.push(c.name);
    }
  }
  return out;
}

/** Fallback por posición: "el tercero", "el sexto", "numero 15", "numero uno", "el 99" → producto de la lista. Hasta 100. */
function resolvePositionalReference(
  lastText: string,
  catalog: { name: string }[]
): string | null {
  if (catalog.length === 0) return null;
  const text = lastText.trim();
  if (!text) return null;
  if (NUMERO_UNO_RE.test(text)) {
    return catalog[0]!.name;
  }
  if (ULTIMO_RE.test(text)) {
    return catalog[catalog.length - 1]!.name;
  }
  const numMatch = text.match(NUMERO_GEN_RE);
  if (numMatch) {
    const num = parseInt(numMatch[1] || numMatch[2] || "0", 10);
    if (num >= 1 && num <= catalog.length) return catalog[num - 1]!.name;
  }
  for (const { re, index } of ORDINALES) {
    if (re.test(text) && index < catalog.length) {
      return catalog[index]!.name;
    }
  }
  return null;
}

/** Fallback por tamaño: "del mediano", "el mediano", "vídeos del grande", "smallest barrel" → producto que contenga esa palabra en el nombre */
function resolveSizeReference(
  lastText: string,
  catalog: { name: string }[]
): string | null {
  if (catalog.length === 0) return null;
  const text = lastText.toLowerCase();
  // smallest/largest en inglés → mapear a pequeño/grande
  const sizeMap: Array<{ pattern: RegExp; searchWords: string[] }> = [
    { pattern: /\bsmallest\b|\bsmaller\b/i, searchWords: ["pequeño", "pequeno", "15-20"] },
    { pattern: /\blargest\b|\bbiggest\b|\bbigger\b/i, searchWords: ["grande", "45-55", "55"] },
    { pattern: /\bmediano\b|\bmedium\b/i, searchWords: ["mediano"] },
    { pattern: /\bgrande\b|\blarge\b/i, searchWords: ["grande"] },
    { pattern: /\bpequeño\b|\bpequeno\b|\bsmall\b/i, searchWords: ["pequeño", "pequeno", "15-20"] },
    { pattern: /\bcompacto\b/i, searchWords: ["compacto"] },
  ];
  for (const { pattern, searchWords } of sizeMap) {
    if (!pattern.test(text)) continue;
    const matched = catalog.filter((c) => {
      const nameLower = c.name.toLowerCase();
      return searchWords.some((w) => nameLower.includes(w));
    });
    const uniqueNames = [...new Set(matched.map((c) => c.name))];
    if (uniqueNames.length === 1) return uniqueNames[0]!;
    if (uniqueNames.length > 1) {
      // Priorizar "Barril X" genérico sobre "EL AVENTURERO Barril X"
      const generic = uniqueNames.find((n) => /^Barril\s+/i.test(n) && !/^EL\s+/i.test(n));
      return generic ?? uniqueNames[0]!;
    }
  }
  return null;
}

/** Varios productos por posición: "el 1, el 3 y el 5", "primero tercero y quinto" → array de nombres */
function resolveMultiplePositions(
  lastText: string,
  catalog: { name: string }[]
): string[] | null {
  if (catalog.length === 0) return null;
  const unique = getUniqueProductNames(catalog);
  const indices: number[] = [];
  const text = lastText.toLowerCase();
  for (const { re, index } of ORDINALES) {
    if (re.test(text) && index < unique.length) indices.push(index);
  }
  const numMatches = text.matchAll(/\b(?:el\s+)?(?:numero|n[úu]mero)\s*([1-9]\d{0,2})\b|\b(?:el\s+)([1-9]\d{0,2})\b/gi);
  for (const m of numMatches) {
    const num = parseInt(m[1] || m[2] || "0", 10);
    if (num >= 1 && num <= unique.length && !indices.includes(num - 1)) indices.push(num - 1);
  }
  if (ULTIMO_RE.test(text)) indices.push(unique.length - 1);
  if (NUMERO_UNO_RE.test(text)) indices.push(0);
  const deduped = [...new Set(indices)].sort((a, b) => a - b);
  if (deduped.length === 0) return null;
  if (deduped.length === 1) return [unique[deduped[0]!]!];
  return deduped.map((i) => unique[i]!);
}

/** Referencias al último producto enviado en fotos: "él que me enviaste", "el que mostraste", etc. */
const REFERENCIA_ULTIMO_ENVIADO = /\b(él?\s+que\s+me\s+enviaste|el\s+que\s+me\s+enviaste|el\s+que\s+mostraste|el\s+que\s+enviaste|el\s+de\s+las\s+fotos|ese\s+mismo|el\s+de\s+(las\s+)?fotos)\b/i;

/** Bot promete enviar fotos/videos: "te enviaré las fotos", "aquí tienes las fotos", etc. */
const PROMESA_FOTOS =
  /\b(te\s+env[ií]ar[eé]\s+(las\s+)?(fotos?|im[aá]genes?|v[ií]deos?)|aqu[ií]\s+tienes\s+(las\s+)?(fotos?|im[aá]genes?|v[ií]deos?)|te\s+mando\s+(las\s+)?(fotos?|im[aá]genes?|v[ií]deos?)|un\s+momento[^.]*(fotos?|im[aá]genes?|v[ií]deos?)|(fotos?|im[aá]genes?|v[ií]deos?)\s+(del|de)\s+\*?[A-Za-z])/i;

/** Cliente pide/confirma fotos: respuesta coherente con bot que prometió fotos */
const CLIENTE_PIDE_FOTOS =
  /^(las?\s+)?(fotos?|im[aá]genes?|v[ií]deos?|dale|si|s[ií]|sii|ok|okay|claro|env[ií]a|m[aá]ndalas?|m[aá]ndamelas?|mu[eé]strame|quiero\s+ver|por\s+favor)[\s.!?]*$/i;

/** Extrae nombre de producto del mensaje del bot cuando prometió fotos. Busca entre * * o "fotos del X". */
function extractProductFromBotMessage(
  botMessage: string,
  catalog: { name: string }[]
): string | null {
  if (catalog.length === 0) return null;
  const uniqueNames = getUniqueProductNames(catalog);
  const msgNorm = botMessage.replace(/\*/g, " ").toLowerCase();

  // 1. Buscar nombres entre asteriscos: *Barril Brochetero 15 LB*
  const asteriskMatches = botMessage.matchAll(/\*([^*]+)\*/g);
  for (const m of asteriskMatches) {
    const candidate = m[1]!.trim();
    const match = uniqueNames.find(
      (n) => n.toLowerCase() === candidate.toLowerCase() || candidate.toLowerCase().includes(n.toLowerCase())
    );
    if (match) return match;
    const reverse = uniqueNames.find((n) => n.toLowerCase().includes(candidate.toLowerCase()));
    if (reverse) return reverse;
  }

  // 2. Buscar "fotos del X" / "fotos de X" - X debe coincidir con catálogo
  const fotosDelMatch = botMessage.match(/(?:fotos?|im[aá]genes?|v[ií]deos?)\s+(?:del|de)\s+(?:las?\s+)?\*?([^*\n]+?)(?:\*|[\s.,]|$)/i);
  if (fotosDelMatch) {
    const candidate = fotosDelMatch[1]!.trim().replace(/\*/g, "");
    const match = uniqueNames.find((n) => n.toLowerCase().includes(candidate.toLowerCase()) || candidate.toLowerCase().includes(n.toLowerCase()));
    if (match) return match;
  }

  // 3. Buscar cualquier mención de nombre del catálogo en el mensaje (priorizar nombres más largos)
  const sortedByLength = [...uniqueNames].sort((a, b) => b.length - a.length);
  for (const name of sortedByLength) {
    if (normalizeForMatch(msgNorm).includes(normalizeForMatch(name))) return name;
  }
  return null;
}

/** Híbrido handoff: confirmaciones cortas que responden al CTA de asesor */
const CONFIRMACION_CORTA =
  /^(si|s[ií]|sii|dale|ok|okay|claro|por\s+favor|bueno|listo|adelante|perfecto|genial|excelente)$/i;
const CTA_ASESOR =
  /\b(asesor|te\s+ayude|te\s+atiende|te\s+contacte|tienes\s+dudas|te\s+interesa|¿te\s+interesa|un\s+asesor)/i;

function getLastAssistantMessage(history: { role: string; content: string }[]): string {
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i]?.role === "assistant" && typeof history[i].content === "string") {
      return history[i].content;
    }
  }
  return "";
}

function isCtaAsesor(text: string): boolean {
  return text.length > 0 && text.length < 300 && CTA_ASESOR.test(text);
}

function isConfirmacionCorta(text: string): boolean {
  const t = text.trim();
  return t.length >= 1 && t.length <= 50 && CONFIRMACION_CORTA.test(t);
}

/**
 * Clasificador de coherencia CTA: interpreta si la respuesta del usuario encaja
 * con el CTA del bot (oferta de asesor). Usado cuando el bot invitó a contactar un asesor.
 * Devuelve true si el usuario acepta/quiere esa ayuda; false si no; null si falla la IA.
 */
async function checkCtaResponseCoherence(
  botMessage: string,
  userMessage: string,
  creds: {
    provider: BotProvider;
    openaiKey: string | null;
    anthropicKey: string | null;
    googleKey: string | null;
    model: string;
    temperature: number;
    maxTokens: number;
  }
): Promise<boolean | null> {
  const userTrim = userMessage.trim();
  if (!userTrim || userTrim.length > 200) return null;
  try {
    const systemPrompt = `Eres un clasificador binario. Solo responde SI o NO.
Contexto: El bot (asesor virtual) envió un mensaje que invita al usuario a contactar un asesor humano (ej. "¿Te interesa? Un asesor te ayuda", "Si tienes dudas, un asesor te atiende").
Tarea: ¿La respuesta del usuario indica que ACEPTA o QUIERE esa ayuda de asesor? Es decir: ¿está confirmando que sí quiere hablar con un asesor, que le interesa, que necesita ayuda?
- SI: cuando el usuario acepta, confirma interés, pide asesor, dice que sí, que le interesa, que quiere ayuda, "ayuda", "dale", "sí", "necesito un asesor", etc.
- NO: cuando es pregunta sobre productos/precios, duda genérica, cambio de tema, o respuesta que NO indica aceptar la oferta de asesor.`;
    const userPrompt = `Mensaje del bot: "${botMessage.slice(0, 280)}"
Respuesta del usuario: "${userTrim}"
¿El usuario acepta/quiere ayuda del asesor? Responde solo SI o NO.`;
    const res = await callAIMultimodal(creds.provider, [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ], {
      openaiKey: creds.openaiKey,
      anthropicKey: creds.anthropicKey,
      googleKey: creds.googleKey,
      model: creds.model,
      temperature: 0.1,
      maxTokens: 8,
    });
    const normalized = res.trim().toUpperCase().replace(/[^SI NO]/g, "");
    if (normalized.includes("SI") && !normalized.startsWith("NO")) return true;
    if (normalized.includes("NO")) return false;
    return null;
  } catch {
    return null;
  }
}

export async function processSalesFlow(
  tenantId: string,
  contactPhone: string,
  lastMessage: string | ContentPart[],
  recentHistory: { role: "user" | "assistant"; content: string }[],
  contactName?: string,
  lastProductSent?: string,
  isFirstMessage?: boolean,
  conversationId?: string,
  quotedMessage?: string
): Promise<SalesFlowOutput> {
  const creds = await getBotAICredentials(tenantId);
  if (!creds) {
    void botLog("warn", "sales_flow", "Credenciales IA no configuradas: handoff directo", {
      conversationId,
      phone: contactPhone,
      metadata: { fallback: "handoff_required" },
    });
    return {
      reply: "En este momento no puedo atender. Un asesor te contactará pronto.",
      sendImages: false,
      handoffRequired: true,
    };
  }

  const catalog = await getProductCatalog(tenantId);
  const productsTraining = await getProductsTrainingText(tenantId);
  const nameContext = contactName?.trim()
    ? `\n[El cliente se llama ${contactName.trim()}. Puedes usarlo para personalizar el saludo si es apropiado.]`
    : "";
  const uniqueProductNames = getUniqueProductNames(catalog);
  const catalogNamesList =
    catalog.length > 0
      ? uniqueProductNames
          .map((name, i) => `  ${i + 1}. ${name}`)
          .join("\n")
          .concat("\n  10. Otros (gorras, ponchos, carbón, etc.)")
      : "";
  let firstMessageHint = isFirstMessage
    ? `\n[ES PRIMER MENSAJE: Escribe un saludo variado y cálido. Usa el nombre si está disponible. No repitas el mismo texto.]`
    : "";
  // Híbrido: si NO es primer mensaje pero la IA clasifica el mensaje como saludo → inyectar hint de saludo profesional
  if (!isFirstMessage) {
    const lastTextForClassify = lastMessageAsText(lastMessage).trim();
    if (lastTextForClassify.length >= 2) {
      const isGreeting = await classifyIsGreeting(
        lastTextForClassify,
        {
          provider: creds.provider,
          openaiKey: creds.openaiKey,
          anthropicKey: creds.anthropicKey,
          googleKey: creds.googleKey,
          model: creds.model,
        },
        conversationId
      );
      if (isGreeting) {
        firstMessageHint = `\n[SALUDO DETECTADO: El cliente envió un saludo. Responde con un saludo que: 1) Use su nombre si lo conoces. 2) Invita a que cuente en qué puedes ayudarle hoy. Tono cálido y profesional. Ejemplo: "Hola [nombre], ¿en qué puedo ayudarte hoy?" Varía la redacción.]`;
      }
    }
  }
  const otrosProductNames = uniqueProductNames;
  const otrosListExplicito =
    otrosProductNames.length > 0
      ? `\n\nProductos adicionales (nombres EXACTOS): ${otrosProductNames.join(", ")}. Si preguntan "qué otros productos tienen", lista estos.`
      : "";

  const quotedContext = quotedMessage?.trim()
    ? `\n[RESPUESTA CITADA: El usuario está respondiendo al mensaje: "${quotedMessage.slice(0, 200)}". Interpreta "este", "esto", "de este", "de ese" en ese contexto.]`
    : "";
  const catalogContext =
    catalog.length > 0
      ? `[Contexto actual] Catálogo (${catalog.length} productos) - usa el ORDEN de esta lista para "el primero", "el segundo", etc:${quotedContext}
${catalogNamesList}
${otrosListExplicito}

CRÍTICO NOMBRES: Usa SOLO los nombres EXACTOS de la lista. NUNCA inventes variaciones. Copia el nombre carácter por carácter.

OBLIGATORIO: Si el usuario elige un producto, incluye al inicio de tu respuesta: PRODUCT_INTEREST: [nombre EXACTO de la lista]. Sin esto el sistema NO enviará imagen ni video.
- NUNCA digas "cannot send", "can't send", "no puedo enviar". El sistema SÍ envía. Di que se los envías e incluye PRODUCT_INTEREST.
- "video/vídeos de X", "envíame el video del X", "quiero vídeos del mediano", "imagen de X" = PRODUCT_INTEREST: [nombre exacto]. Si prometes enviar y no pones el tag, NO se enviará.
- "el primero" hasta "el vigésimo", "el 1" hasta "el 100", "el 1, 3 y 5" = uno o varios productos por posición
- "el último" = último de la lista
- "el aventurero", "el desmadre", etc = busca el nombre en la lista
- "todos los productos/videos", "catálogo completo", "all products" = PRODUCT_INTEREST: todos (envía todo)
- "enviame informacion de todos", "informacion de todos los productos", "datos de todo el catálogo", "info de todos" = PRODUCT_INTEREST: todos
- Si piden "más detalles", "descripción completa", "qué incluye" de uno: SEND_FULL_DESCRIPTION: [nombre exacto]. El sistema enviará la ficha completa (sin imagen ni video).

OPCIONES PRIMERO: Si piden genéricamente ("quiero productos", "qué tienen"): lista opciones y pregunta cuál. NO prometas imágenes ni video aún.
FOTOS/VIDEOS AMBIGUOS: Si piden fotos o videos de forma genérica sin especificar producto ni decir "todos": NO prometas enviarlos. Pregunta: ¿De cuál te gustaría ver? Di el número, el nombre del modelo, o "todos" para el catálogo completo.
FUERA DE ALCANCE: Si el mensaje es claramente sobre otro tema (comida, política, otro negocio, chistes, etc.) o nada que podamos atender: emite ÚNICAMENTE FUERA_DE_ALCANCE. No inventes, no des rodeos.
Formato WhatsApp: *texto* = negrita. NUNCA ** ni # ## ###. Emojis con moderación (📦 💲 ✨).`
      : `[Contexto actual] No hay catálogo configurado. Si piden productos, imágenes o videos, invita a que un asesor les envíe la información.${quotedContext}`;
  const trainingBlock = productsTraining
    ? `\n\n${productsTraining}\n\nUsa ÚNICAMENTE la información anterior para responder sobre productos, precios, disponibilidad e inventario. NUNCA inventes precios ni nombres; los datos exactos están arriba.`
    : "";

  const systemPrompt =
    creds.systemPrompt?.trim() || DEFAULT_BOT_SYSTEM_PROMPT;

  const lastTextForHybrid = lastMessageAsText(lastMessage).trim();
  const lastAssistantContent = getLastAssistantMessage(recentHistory);
  const ctaAsesorDetectado = isCtaAsesor(lastAssistantContent);
  const confirmacionCortaDetectada = isConfirmacionCorta(lastTextForHybrid);

  // Clasificador semántico: IA interpreta CTA del bot + respuesta del usuario → ¿coherente?
  let confirmacionParaHandoff = confirmacionCortaDetectada;
  if (ctaAsesorDetectado && lastTextForHybrid) {
    const aiCoherente = await checkCtaResponseCoherence(lastAssistantContent, lastTextForHybrid, creds);
    confirmacionParaHandoff = aiCoherente === true || (aiCoherente === null && confirmacionCortaDetectada);
    void botLog("info", "sales_flow", "Clasificador coherencia CTA evaluado", {
      conversationId,
      phone: contactPhone,
      metadata: {
        aiCoherente: aiCoherente === true ? "yes" : aiCoherente === false ? "no" : "fallback",
        confirmacionParaHandoff,
        confirmacionCortaDetectada,
      },
    });
  }

  void botLog("info", "sales_flow", "Híbrido handoff: condiciones evaluadas", {
    conversationId,
    phone: contactPhone,
    metadata: {
      lastTextForHybrid: lastTextForHybrid.slice(0, 50),
      lastTextLength: lastTextForHybrid.length,
      lastAssistantContentPreview: lastAssistantContent.slice(0, 120),
      lastAssistantLength: lastAssistantContent.length,
      recentHistoryLength: recentHistory.length,
      ctaAsesorDetectado,
      confirmacionCortaDetectada,
      confirmacionParaHandoff,
      hybridConditionsMet: confirmacionParaHandoff && ctaAsesorDetectado,
      reasonNotMet: !(confirmacionParaHandoff && ctaAsesorDetectado)
        ? (!confirmacionParaHandoff ? "confirmacionParaHandoff=false" : "ctaAsesor=false")
        : undefined,
    },
  });

  // Híbrido handoff Capa A: inyectar contexto cuando usuario confirma CTA de asesor
  let handoffContextBlock = "";
  if (confirmacionParaHandoff && ctaAsesorDetectado) {
    handoffContextBlock = `\n[CONTEXTO URGENTE: Tu último mensaje invitaba al usuario a contactar un asesor. El usuario respondió "${lastTextForHybrid}" — es confirmación de querer asesor. Debes emitir HANDOFF_REQUIRED. Responde brevemente que un asesor lo contactará.]`;
    void botLog("info", "sales_flow", "Híbrido handoff Capa A: contexto CTA inyectado en prompt", {
      conversationId,
      phone: contactPhone,
      metadata: { lastText: lastTextForHybrid, lastAssistantSlice: lastAssistantContent.slice(0, 150) },
    });
  }

  const historyAsMultimodal: AIMessageMultimodal[] = recentHistory.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const lastUserMessage: AIMessageMultimodal = {
    role: "user",
    content: (() => {
      if (typeof lastMessage === "string") return lastMessage;
      if (lastMessage.length === 0) return "";
      const hasText = lastMessage.some((p) => p.type === "text" && p.text.trim());
      if (!hasText) {
        const mediaTypes = lastMessage.map((p) => p.type).filter((t) => t !== "text");
        const hint = `[El cliente ha enviado: ${mediaTypes.join(", ")}. Analízalo y responde de forma conversacional.]`;
        return [{ type: "text" as const, text: hint }, ...lastMessage];
      }
      return lastMessage;
    })(),
  };

  const messages: AIMessageMultimodal[] = [
    {
      role: "system",
      content: `${systemPrompt}\n\n${nameContext}${firstMessageHint}\n\n${catalogContext}${trainingBlock}${handoffContextBlock}`,
    },
    ...historyAsMultimodal,
    lastUserMessage,
  ];

  const response = await callAIMultimodal(creds.provider, messages, {
    openaiKey: creds.openaiKey,
    anthropicKey: creds.anthropicKey,
    googleKey: creds.googleKey,
    model: creds.model,
    temperature: creds.temperature,
    maxTokens: creds.maxTokens,
  });

  let handoffRequired = /HANDOFF_REQUIRED/i.test(response);
  let cleanReply = response.replace(/HANDOFF_REQUIRED/gi, "").trim();

  cleanReply = validateAndCorrectProductResponse(cleanReply);

  // Post-proceso: si la IA listó productos numerados pero omitió el último, inyectar opción "Otros" si hay más de 9 productos
  const tieneLista9 = /\n9\.\s+\*[^*]+\*[^\n]*/i.test(cleanReply);
  const careceOpcion10 = !/10\.\s+(\*)?[^*]+/i.test(cleanReply);
  const hayMasDe9 = catalog.length > 9;
  if (tieneLista9 && careceOpcion10 && hayMasDe9) {
    cleanReply = cleanReply.replace(
      /(\n9\.\s+\*[^*]+\*[^\n]*)(\n+\s*¿Cuál de estos productos te interesa\?)/i,
      "$1\n\n10. *Otros productos*$2"
    );
  }

  void botLog("info", "sales_flow", "Respuesta IA procesada", {
    conversationId,
    phone: contactPhone,
    metadata: {
      handoffFromIA: handoffRequired,
      responsePreview: response.slice(0, 150),
      hasProductInterest: /PRODUCT_INTEREST:/i.test(response),
    },
  });

  // Híbrido handoff Capa B: fallback si IA no emitió HANDOFF pero el contexto es claro (confirmación coherente + CTA asesor)
  if (!handoffRequired && confirmacionParaHandoff && ctaAsesorDetectado) {
    handoffRequired = true;
    cleanReply =
      "Perfecto. En unos momentos uno de nuestros asesores te contactará para ayudarte. ¡Gracias por tu interés! ✨";
    void botLog("info", "sales_flow", "Híbrido handoff Capa B: forzando handoff (IA no emitió HANDOFF)", {
      conversationId,
      phone: contactPhone,
      metadata: { lastText: lastTextForHybrid, reason: "confirmacion+cta_asesor" },
    });
  }

  // Capa coherencia: si la respuesta de la IA promete asesor, cumplir (handoff).
  // Solo aplicar cuando el usuario dio confirmación coherente con el CTA — evita falsos handoffs
  // cuando el CTA estándar "un asesor te atiende" aparece en respuestas de solo información (ej. Pixel Hub).
  const PROMESA_ASESOR =
    /\b(asesor\s+(te|se)\s+(contactar[aá]|comunicar[aá]|comunique|ayudar[aá]|atiende|va\s+a|contacte|ayude)|un\s+asesor\s+(te|se)\s+|para\s+que\s+(un\s+)?asesor\s+(te|se)\s+|registrado\s+.*asesor|asesor\s+se\s+comunicar[aá]|asesor\s+te\s+contactar[aá])/i;
  if (!handoffRequired && confirmacionParaHandoff && PROMESA_ASESOR.test(cleanReply)) {
    handoffRequired = true;
    void botLog("info", "sales_flow", "Capa coherencia: respuesta promete asesor → handoff forzado", {
      conversationId,
      phone: contactPhone,
      metadata: { cleanReplyPreview: cleanReply.slice(0, 150), confirmacionParaHandoff: true },
    });
  }

  // NO_ENTIENDO: cuando la IA no comprende (??, caracteres sueltos, incoherencia)
  if (/NO_ENTIENDO/i.test(cleanReply) || /^(?:NO_ENTIENDO|no\s+entiendo)[\s.]*$/i.test(cleanReply.trim())) {
    void botLog("info", "sales_flow", "IA indicó NO_ENTIENDO → scope_guard", {
      conversationId,
      phone: contactPhone,
      metadata: { lastText: lastMessageAsText(lastMessage).slice(0, 50) },
    });
    return {
      reply: "",
      sendImages: false,
      handoffRequired: false,
      ctaMessage: undefined,
      scopeGuardTriggered: true,
    };
  }

  // FUERA_DE_ALCANCE: mensaje entendible pero no sobre nuestros productos
  if (/FUERA_DE_ALCANCE/i.test(cleanReply)) {
    void botLog("info", "sales_flow", "IA indicó FUERA_DE_ALCANCE → scope_guard", {
      conversationId,
      phone: contactPhone,
      metadata: { lastText: lastMessageAsText(lastMessage).slice(0, 50) },
    });
    return {
      reply: "",
      sendImages: false,
      handoffRequired: false,
      ctaMessage: undefined,
      scopeGuardTriggered: true,
    };
  }

  const interestMatch = cleanReply.match(/INTEREST_LEVEL:\s*(alto|medio|bajo)/i);
  const interestLevel = interestMatch ? (interestMatch[1].toLowerCase() as "alto" | "medio" | "bajo") : null;
  const notesMatch = cleanReply.match(/LEAD_NOTES:\s*([\s\S]+?)(?=\n|$)/);
  const leadNotes = notesMatch ? notesMatch[1].trim() : null;
  const productMatch = cleanReply.match(/PRODUCT_INTEREST:\s*([^\n]+)/i);
  const productInterestRaw = productMatch ? productMatch[1].trim() : null;
  let productInterest =
    productInterestRaw?.toLowerCase() === "todos"
      ? "todos"
      : productInterestRaw || null;

  /** Fallback: IA prometió enviar pero no puso tag → extraer productos del texto */
  let extractedProductFilter: string | string[] | null = null;
  const PROMESA_ENVIO =
    /\b(te\s+env[ií]o|te\s+env[ií]ar[eé]|en\s+un\s+momento\s+te\s+(mando|env[ií]o)|i'll\s+send\s+you|i'll\s+send\s+the|here\s+are\s+the|aqu[ií]\s+te\s+van|te\s+mando|se\s+los\s+env[ií]o|voy\s+a\s+enviart[eo])\b/i;
  if (!productInterest && catalog.length > 0 && PROMESA_ENVIO.test(cleanReply)) {
    const replyNorm = cleanReply.replace(/[*_"']/g, "").toLowerCase();
    const mentionedProducts = catalog.filter((c) => {
      const nameNorm = c.name.replace(/[*_"']/g, "").toLowerCase();
      return replyNorm.includes(nameNorm) || cleanReply.includes(c.name);
    });
    const uniqueByName = Array.from(new Map(mentionedProducts.map((p) => [p.name, p])).values());
    if (uniqueByName.length === 1) {
      extractedProductFilter = uniqueByName[0]!.name;
      productInterest = extractedProductFilter;
      void botLog("info", "sales_flow", "Fallback híbrido: producto extraído de promesa de envío", {
        conversationId,
        phone: contactPhone,
        metadata: { extracted: extractedProductFilter },
      });
    } else if (uniqueByName.length > 1) {
      extractedProductFilter = uniqueByName.map((p) => p.name);
      productInterest = extractedProductFilter[0]!;
      void botLog("info", "sales_flow", "Fallback híbrido: múltiples productos en promesa", {
        conversationId,
        phone: contactPhone,
        metadata: { count: uniqueByName.length, names: extractedProductFilter },
      });
    }
  }
  const ctaMatch = cleanReply.match(/CTA_MESSAGE:\s*([^\n]+)/i);
  const ctaMessageFromIA =
    ctaMatch && typeof ctaMatch[1] === "string" ? ctaMatch[1].trim().slice(0, 150) : null;

  cleanReply = cleanReply
    .replace(/\n?INTEREST_LEVEL:\s*(alto|medio|bajo)\s*/gi, "")
    .replace(/\n?LEAD_NOTES:\s*[\s\S]+/, "")
    .replace(/\n?PRODUCT_INTEREST:\s*[^\n]+/, "")
    .replace(/\n?CTA_MESSAGE:\s*[^\n]+/gi, "")
    .trim();

  const lastText = lastMessageAsText(lastMessage).toLowerCase();
  const pideTodos =
    /todos\s*(los\s+)?(productos?|items?|v[ií]deos?|fotos?|im[aá]genes?)|todo\s+(el\s+)?(cat[aá]logo|lo\s+que\s+tienen)|cat[aá]logo\s+completo|env[ií]ame\s+(todo|todos)|env[ií]o\s+todo|mu[eé]strame\s+todos?|quiero\s+ver\s+todos?|quiero\s+todos?|m[aá]ndame\s+todos?|all\s+(the\s+)?(products?|items?|videos?|photos?)|show\s+me\s+all|send\s+me\s+all|full\s+catalog|everything|todo\s+lo\s+que\s+tienen/i.test(
      lastText
    );
  const matchByCatalogName =
    catalog.length > 0 &&
    catalog.some((c) => {
      const words = c.name
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 2 && !GENERIC_WORDS.test(w));
      return words.some((w) => normalizeForMatch(lastText).includes(normalizeForMatch(w)));
    });
  const referenciaUltimoEnviado = REFERENCIA_ULTIMO_ENVIADO.test(lastText) && !!lastProductSent;
  const pideVideoOImagen =
    /\b(video[s]?\s+de|video[s]?\s+del|v[ií]deos?\s+de|v[ií]deos?\s+del|quiero\s+(un\s+)?v[ií]deo[s]?|env[ií]ame\s+(el\s+)?v[ií]deo[s]?|me\s+puedes\s+enviar\s+(un\s+)?v[ií]deo[s]?|imagen(es)?\s+de|imagen(es)?\s+del|solo\s+(la\s+)?imagen|env[ií]ame\s+(la\s+)?imagen|foto[s]?\s+de|foto[s]?\s+del|show\s+me\s+(the\s+)?(photo[s]?|picture[s]?|image[s]?|video[s]?)|picture[s]?\s+of|photo[s]?\s+of|video\s+of\s+the|send\s+me\s+(the\s+)?(photo[s]?|picture[s]?|video[s]?)|do\s+you\s+have\s+(any\s+)?(photo[s]?|picture[s]?|image[s]?|video[s]?)|(any\s+)?picture[s]?\s+of|(any\s+)?photo[s]?\s+of|(any\s+)?video[s]?\s+of|i\s+want\s+to\s+see\s+(the\s+)?(photo[s]?|picture[s]?|video[s]?))\b/i.test(
      lastText
    );
  const pideEspecifico =
    /el premium|el primero|el segundo|el tercero|el cuarto|el quinto|el sexto|el s[eé]ptimo|el octavo|el noveno|el d[eé]cimo|el und[eé]cimo|el duod[eé]cimo|el vig[eé]simo|ese|esa|ese mismo|el [0-9]+|el \d+l|el grande|el pequeño|el compacto|todos|todo el|catálogo completo|envíame todo|envio todo|numero\s*[1-9]\d*|n[úu]mero\s*[1-9]\d*|(numero|n[úu]mero)\s+uno|el\s+uno|el [úu]ltimo|show\s+me\s+(the\s+)?(photo[s]?|picture[s]?|video[s]?)|picture[s]?\s+of|photo[s]?\s+of|send\s+me\s+(the\s+)?(photo[s]?|picture[s]?|video[s]?)|do\s+you\s+have\s+(any\s+)?(photo[s]?|picture[s]?|video[s]?)|recommend/i.test(
      lastText
    ) || productInterest != null || matchByCatalogName || referenciaUltimoEnviado || pideVideoOImagen;

  // Híbrido 2 ("cuál"): IA primero; si falla, fallback determinista.
  let productFilterForImages: string | string[] | null;
  let sendImages = catalog.length > 0 && (pideEspecifico || !!extractedProductFilter);

  if (extractedProductFilter) {
    productFilterForImages = extractedProductFilter;
  } else if (productInterest === "todos") {
    productFilterForImages = null; // enviar todos
  } else if (productInterest != null) {
    productFilterForImages = productInterest; // IA devolvió nombre
  } else if (pideEspecifico && catalog.length > 0) {
    if (pideTodos) {
      productFilterForImages = null; // "todos" explícito → enviar todos
    } else {
      const resolvedMulti = resolveMultiplePositions(lastText, catalog);
      const resolved =
        referenciaUltimoEnviado && lastProductSent
          ? lastProductSent
          : resolvedMulti && resolvedMulti.length > 0
            ? resolvedMulti.length === 1
              ? resolvedMulti[0]!
              : resolvedMulti
            : findSingleProductMatch(lastText, catalog) ??
              resolveByNameReference(lastText, catalog) ??
              resolvePositionalReference(lastText, catalog) ??
              resolveSizeReference(lastText, catalog);
      if (resolved) {
        productFilterForImages = Array.isArray(resolved) ? resolved : resolved;
      } else {
        sendImages = false;
        productFilterForImages = null;
      }
    }
  } else {
    productFilterForImages = null;
  }

  // Preferencia de media: solo video, solo imagen, o ambos
  const pideSoloVideo =
    /\b(solo\s+(el\s+)?v[ií]deo[s]?|solo\s+v[ií]deo[s]?)\b/i.test(lastText) ||
    (/\b(v[ií]deo[s]?\s+de|v[ií]deo[s]?\s+del|quiero\s+v[ií]deo[s]?|env[ií]ame\s+(el\s+)?v[ií]deo[s]?|me\s+puedes\s+enviar\s+(un\s+)?v[ií]deo[s]?)\b/i.test(lastText) &&
      !/\b(imagen|foto)\b/i.test(lastText));
  const pideSoloImagen =
    /\b(solo\s+(la\s+)?imagen|solo\s+(la\s+)?foto|solo\s+imagen)\b/i.test(lastText) ||
    (/\b(imagen\s+de|imagen\s+del|foto\s+de|foto\s+del|env[ií]ame\s+(la\s+)?imagen)\b/i.test(lastText) &&
      !/\b(video)\b/i.test(lastText));
  let mediaPreference: MediaPreference = "both";
  if (pideSoloVideo && !pideSoloImagen) mediaPreference = "video_only";
  else if (pideSoloImagen && !pideSoloVideo) mediaPreference = "image_only";

  // Híbrido descripción completa: pide más detalles/info completa → enviar ficha, no fotos (no toca híbridos producto)
  const PIDE_DESCRIPCION = /\b(m[aá]s\s+detalles|m[aá]s\s+informaci[oó]n|descripci[oó]n\s+completa|qu[eé]\s+incluye|caracter[ií]sticas|info\s+completa|expl[ií]came\s+m[aá]s|dame\s+m[aá]s\s+info|ficha\s+completa|informaci[oó]n\s+detallada)\b/i;
  const pideDescripcionCompleta = PIDE_DESCRIPCION.test(lastText);
  let sendFullDescription: string | null = null;
  if (pideDescripcionCompleta && catalog.length > 0) {
    const fullDescFromIA = cleanReply.match(/SEND_FULL_DESCRIPTION:\s*([^\n]+)/i)?.[1]?.trim();
    const resolvedForDesc =
      fullDescFromIA ??
      productInterest ??
      (referenciaUltimoEnviado && lastProductSent ? lastProductSent : null) ??
      findSingleProductMatch(lastText, catalog) ??
      resolveByNameReference(lastText, catalog) ??
      resolvePositionalReference(lastText, catalog);
    if (resolvedForDesc && resolvedForDesc.toLowerCase() !== "todos") {
      sendFullDescription = resolvedForDesc;
      sendImages = false; // prioridad: descripción completa, no imagen ni video
    }
  }

  // Coherencia promesa de fotos: bot prometió fotos + cliente responde coherente (Fotos, Dale, Sí...) → enviar fotos
  // Usa cleanReply (respuesta IA) además de lastAssistantContent: cuando usuario dice "Fotos", la promesa está en cleanReply
  if (!sendImages && catalog.length > 0 && lastTextForHybrid) {
    const promesaFotosDetectada =
      PROMESA_FOTOS.test(lastAssistantContent) || PROMESA_FOTOS.test(cleanReply);
    const clientePideFotosDetectada = CLIENTE_PIDE_FOTOS.test(lastTextForHybrid.trim());
    if (promesaFotosDetectada && clientePideFotosDetectada) {
      const productoDesdeBot =
        extractProductFromBotMessage(cleanReply, catalog) ??
        extractProductFromBotMessage(lastAssistantContent, catalog) ??
        (lastProductSent || null);
      if (productoDesdeBot) {
        sendImages = true;
        productFilterForImages = productoDesdeBot;
        void botLog("info", "sales_flow", "Coherencia promesa fotos: enviando fotos", {
          conversationId,
          phone: contactPhone,
          metadata: {
            lastAssistantPreview: lastAssistantContent.slice(0, 80),
            lastUserText: lastTextForHybrid.slice(0, 30),
            productFilterForImages: productoDesdeBot,
          },
        });
      }
    }
  }

  void botLog("info", "sales_flow", "Decisión final sales_flow", {
    conversationId,
    phone: contactPhone,
    metadata: {
      lastText: lastText.slice(0, 80),
      pideEspecifico,
      catalogLength: catalog.length,
      productInterestFromIA: productInterest,
      productFilterForImages: productFilterForImages ?? "todos",
      sendImages,
      sendFullDescription: sendFullDescription ?? undefined,
      mediaPreference,
      handoffRequired,
      interestLevel: interestLevel ?? undefined,
      cleanReplyPreview: cleanReply.slice(0, 80),
    },
  });

  // Post-proceso: IA prometió enviar fotos/videos pero no pudimos resolver qué enviar → pedir claridad (evitar promesa rota)
  if (
    !sendImages &&
    catalog.length > 0 &&
    PROMESA_ENVIO.test(cleanReply)
  ) {
    cleanReply =
      "¿De cuál te gustaría ver fotos? Di el número, el nombre del producto, o *todos* para el catálogo completo.";
    void botLog("info", "sales_flow", "Clarificación: reemplazando promesa rota por pedido de especificación", {
      conversationId,
      phone: contactPhone,
    });
  }

  return {
    reply: fixWhatsAppFormat(cleanReply.replace(/\n?SEND_FULL_DESCRIPTION:\s*[^\n]+/gi, "").trim()),
    sendImages,
    handoffRequired,
    interestLevel: interestLevel ?? undefined,
    leadNotes: leadNotes ?? undefined,
    productInterest: (() => {
      const pf = productFilterForImages;
      const fromFilter = Array.isArray(pf) ? pf[0] ?? "Varios productos" : pf;
      return fromFilter ?? (productInterest === "todos" ? "Catálogo completo" : null) ?? leadNotes ?? undefined;
    })(),
    productFilter: productFilterForImages,
    sendFullDescription: sendFullDescription ?? undefined,
    ctaMessage: ctaMessageFromIA ? fixWhatsAppFormat(ctaMessageFromIA) : undefined,
    mediaPreference,
  };
}

export type SentProductItem = { url: string; description: string; type: "image" | "video"; whatsappMessageId?: string };

export type SendProductImagesResult = {
  sent: SentProductItem[];
  failedCount: number;
  totalAttempted: number;
  ctaMessage: string;
  /** Último producto enviado (para "él que me enviaste") */
  lastProductName: string | null;
};

/** Extrae id base del producto desde catalog item id (ej: "clxxx-img-0" → "clxxx") */
function productIdFromCatalogId(id: string): string {
  const m = id.match(/^(.+?)-(?:img|vid)-\d+$/);
  return m ? m[1]! : id;
}

/** Agrupa items por producto y mantiene orden. Por producto: video (opcional) + imagen (opcional). */
function groupCatalogByProduct(catalog: ProductMedia[]): Array<{ productId: string; name: string; video?: ProductMedia; image?: ProductMedia }> {
  const byProduct = new Map<string, { name: string; videos: ProductMedia[]; images: ProductMedia[] }>();
  for (const item of catalog) {
    const pid = productIdFromCatalogId(item.id);
    let group = byProduct.get(pid);
    if (!group) {
      group = { name: item.name, videos: [], images: [] };
      byProduct.set(pid, group);
    }
    if (item.type === "video") group.videos.push(item);
    else group.images.push(item);
  }
  const ordered: Array<{ productId: string; name: string; video?: ProductMedia; image?: ProductMedia }> = [];
  for (const [pid, g] of byProduct.entries()) {
    if (g.videos.length > 0 || g.images.length > 0) {
      ordered.push({
        productId: pid,
        name: g.name,
        video: g.videos[0],
        image: g.images[0],
      });
    }
  }
  ordered.sort((a, b) => {
    const aMin = Math.min(
      a.video?.order ?? 99999,
      a.image?.order ?? 99999
    );
    const bMin = Math.min(
      b.video?.order ?? 99999,
      b.image?.order ?? 99999
    );
    return aMin - bMin;
  });
  return ordered;
}

export async function sendProductImages(
  tenantId: string,
  contactPhone: string,
  productFilter?: string | string[] | null,
  contactName?: string | null,
  mediaPreference: MediaPreference = "both"
): Promise<SendProductImagesResult> {
  let catalog = await getProductCatalog(tenantId);
  if (productFilter != null) {
    if (Array.isArray(productFilter) && productFilter.length > 0) {
      const filterLowers = productFilter.map((f) => f.toLowerCase().trim()).filter(Boolean);
      const filtered = catalog.filter((item) => {
        const nameLower = item.name.toLowerCase();
        return filterLowers.some(
          (f) => nameLower === f || nameLower.includes(f) || item.description.toLowerCase().includes(f)
        );
      });
      catalog = filtered.length > 0 ? filtered : catalog;
    } else if (typeof productFilter === "string" && productFilter.trim()) {
      const filter = productFilter.toLowerCase();
      const filtered = catalog.filter(
        (item) =>
          item.name.toLowerCase().includes(filter) ||
          item.description.toLowerCase().includes(filter)
      );
      catalog = filtered.length > 0 ? filtered : catalog;
    }
  }

  const groups = groupCatalogByProduct(catalog);
  const imageItems = groups.filter((g) => g.image).map((g) => g.image!);
  const { captions, ctaMessage } = await buildProductResponses(tenantId, imageItems, contactName);
  let captionIdx = 0;

  const sent: SentProductItem[] = [];
  let failedCount = 0;
  const sendVideo = mediaPreference !== "image_only";
  const sendImage = mediaPreference !== "video_only";

  for (const group of groups) {
    if (sendVideo && group.video) {
      const result = await sendWhatsAppVideo(tenantId, contactPhone, group.video.url, undefined);
      if (!result.ok) {
        await new Promise((r) => setTimeout(r, 500));
        const retry = await sendWhatsAppVideo(tenantId, contactPhone, group.video.url, undefined);
        if (!retry.ok) {
          failedCount++;
          void botLog("error", "send_image", `Envío video falló: ${group.name}`, {
            phone: contactPhone,
            error: retry.error,
            metadata: { itemName: group.name, type: "video", url: group.video.url?.slice(0, 80) },
          });
        } else {
          sent.push({ url: group.video.url, description: "", type: "video", whatsappMessageId: retry.messageId });
        }
      } else {
        sent.push({ url: group.video.url, description: "", type: "video", whatsappMessageId: result.messageId });
      }
      await new Promise((r) => setTimeout(r, MEDIA_DELAY_MS));
    }
    if (sendImage && group.image) {
      const caption = captions[captionIdx] ?? group.image.description ?? group.name;
      captionIdx++;
      let result = await sendWhatsAppImage(tenantId, contactPhone, group.image.url, caption);
      if (!result.ok) {
        await new Promise((r) => setTimeout(r, 500));
        result = await sendWhatsAppImage(tenantId, contactPhone, group.image.url, caption);
      }
      if (result.ok) {
        sent.push({ url: group.image.url, description: caption, type: "image", whatsappMessageId: result.messageId });
      } else {
        failedCount++;
        void botLog("error", "send_image", `Envío imagen falló: ${group.name}`, {
          phone: contactPhone,
          error: result.error,
          metadata: { itemName: group.name, type: "image", url: group.image.url?.slice(0, 80) },
        });
      }
      await new Promise((r) => setTimeout(r, MEDIA_DELAY_MS));
    }
    await new Promise((r) => setTimeout(r, PRODUCT_DELAY_MS));
  }
  const lastProductName = groups.length > 0 ? groups[groups.length - 1]!.name : null;
  return { sent, failedCount, totalAttempted: groups.length, ctaMessage, lastProductName };
}
