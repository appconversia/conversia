/**
 * Sub-cerebro híbrido: detecta cuando el usuario pide "algunos" productos (varios específicos)
 * y resuelve la lista de forma determinista. Envía imagen y video de esos productos.
 * Aditivo: no modifica el flujo de "uno" ni "todos".
 */
import { getProductCatalog } from "../product-catalog";
import { botLog } from "../bot-logger";

const GENERIC_WORDS = /^(producto|productos|item|items|grande|mediano|pequeño|con|el|la|de|del|y)$/i;

/** Normaliza para matcheo: MLP/M.L.P. → mlp */
function normalizeForMatch(s: string): string {
  return s.toLowerCase().replace(/\./g, "").replace(/_/g, "").replace(/\s+/g, " ").trim();
}

const ORDINALES: { re: RegExp; index: number }[] = [
  { re: /\b(el\s+)?(primero|1ro|1ero|numero\s*1|n[úu]mero\s*1|el\s+1)\b/i, index: 0 },
  { re: /\b(el\s+)?(segundo|2do|numero\s*2|n[úu]mero\s*2|el\s+2)\b/i, index: 1 },
  { re: /\b(el\s+)?(tercero|3ro|3ero|numero\s*3|n[úu]mero\s*3|el\s+3)\b/i, index: 2 },
  { re: /\b(el\s+)?(cuarto|4to|numero\s*4|el\s+4)\b/i, index: 3 },
  { re: /\b(el\s+)?(quinto|5to|numero\s*5|el\s+5)\b/i, index: 4 },
  { re: /\b(el\s+)?(sexto|6to|numero\s*6|el\s+6)\b/i, index: 5 },
  { re: /\b(el\s+)?(s[eé]ptimo|7mo|numero\s*7|el\s+7)\b/i, index: 6 },
  { re: /\b(el\s+)?(octavo|8vo|numero\s*8|el\s+8)\b/i, index: 7 },
  { re: /\b(el\s+)?(noveno|9no|numero\s*9|el\s+9)\b/i, index: 8 },
  { re: /\b(el\s+)?(d[eé]cimo|10mo|numero\s*10|el\s+10)\b/i, index: 9 },
];

/** Detecta si pide varios productos: "el 2, 5 y 7", "aventurero y tierno", "el 1, 3 y 6" */
const PIDE_ALGUNOS = /\b(el\s+)?\d+\s*(,|y)\s*(\d+|el\s+\w+)|(\w+)\s+y\s+(\w+)|,\s*el\s+|\b(el\s+)?[123456789]\s*(,|y)\b/i;

function lastMessageAsText(lastMessage: unknown): string {
  if (typeof lastMessage === "string") return lastMessage.trim();
  if (Array.isArray(lastMessage)) {
    return lastMessage
      .filter((p): p is { type: "text"; text: string } => p && (p as { type?: string; text?: string }).type === "text" && typeof (p as { text?: string }).text === "string")
      .map((p) => (p as { text: string }).text)
      .join(" ")
      .trim();
  }
  return "";
}

/** Obtiene lista única de nombres de productos en orden del catálogo */
function getUniqueProductNames(catalog: { name: string }[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of catalog) {
    if (!seen.has(item.name)) {
      seen.add(item.name);
      result.push(item.name);
    }
  }
  return result;
}

/** Extrae números del texto: "el 2, 5 y 7" → [2,5,7] */
function extractOrdinalNumbers(text: string): number[] {
  const nums: number[] = [];
  let m: RegExpExecArray | null;
  const re = /\b(?:el\s+)?(?:numero\s*)?([1-9]\d{0,2})\b|\b([1-9]\d{0,2})\b/gi;
  while ((m = re.exec(text)) !== null) {
    const n = parseInt(m[1] || m[2] || "0", 10);
    if (n >= 1 && n <= 100 && !nums.includes(n)) nums.push(n);
  }
  return nums;
}

/** Extrae ordinales por nombre: "primero", "tercero" etc. */
function extractOrdinalNames(text: string): number[] {
  const nums: number[] = [];
  for (const { re, index } of ORDINALES) {
    if (re.test(text)) nums.push(index + 1);
  }
  return nums;
}

/** Encuentra todos los productos cuyo nombre matchea palabras del texto */
function findProductNamesByWords(text: string, productNames: string[]): string[] {
  const textNorm = normalizeForMatch(text);
  const matched: string[] = [];
  for (const name of productNames) {
    const words = name
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2 && !GENERIC_WORDS.test(w));
    if (words.some((w) => textNorm.includes(normalizeForMatch(w)))) matched.push(name);
  }
  return matched;
}

export type ProductSelectionResult = {
  handled: boolean;
  productNames?: string[];
  reply?: string;
};

/**
 * Detecta "pide algunos" (varios productos), resuelve la lista de forma determinista.
 * Retorna handled: true solo si detecta y resuelve exactamente 2+ productos (no 0, no 1).
 */
export async function processProductSelection(
  lastMessage: unknown,
  conversationId?: string
): Promise<ProductSelectionResult> {
  const lastText = lastMessageAsText(lastMessage).trim();
  if (!lastText || lastText.length < 4) return { handled: false };

  if (!PIDE_ALGUNOS.test(lastText)) return { handled: false };

  const catalog = await getProductCatalog();
  const productNames = getUniqueProductNames(catalog);
  if (productNames.length === 0) return { handled: false };

  const resolved: string[] = [];
  const seen = new Set<string>();

  // 1. Extraer números: "el 2, 5 y 7" o "2 5 7" o "el numero 3 y el 6"
  const numsFromText = extractOrdinalNumbers(lastText);
  const numsFromOrdinals = extractOrdinalNames(lastText);
  const allNums = [...new Set([...numsFromText, ...numsFromOrdinals])].filter(
    (n) => n >= 1 && n <= productNames.length
  );
  for (const n of allNums) {
    const name = productNames[n - 1];
    if (name && !seen.has(name)) {
      seen.add(name);
      resolved.push(name);
    }
  }

  // 2. Extraer por nombres: "aventurero y tierno", "el tierno y el desmadre"
  const byName = findProductNamesByWords(lastText, productNames);
  for (const name of byName) {
    if (!seen.has(name)) {
      seen.add(name);
      resolved.push(name);
    }
  }

  if (resolved.length < 2) return { handled: false };

  const reply = `Te envío la imagen y video de ${resolved.slice(0, 3).join(", ")}${resolved.length > 3 ? ` y ${resolved.length - 3} más` : ""}. Un momento ✨`;

  void botLog("info", "product_selection", "Pide algunos: lista resuelta", {
    conversationId,
    metadata: { count: resolved.length, names: resolved.slice(0, 5), lastText: lastText.slice(0, 60) },
  });

  return {
    handled: true,
    productNames: resolved,
    reply,
  };
}
