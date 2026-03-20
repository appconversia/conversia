import { callAI } from "@/lib/ai";
import { getBotAICredentials } from "@/lib/config";
import type { ProductMedia } from "@/lib/bot/product-catalog";
import { botLog } from "../bot-logger";
import { prisma } from "@/lib/db";

export type ProductCaptionResult = {
  captions: string[];
  ctaMessage: string;
};

const WHATSAPP_CAPTION_MAX = 1024;

/**
 * Cerebro de productos: construye descripciones personalizadas y CTA para cada cliente.
 * - Formato WhatsApp: *negrita* con un asterisco, _cursiva_ con guion bajo. NUNCA **
 * - Personaliza con nombre del cliente cuando esté disponible
 * - Valida que las descripciones sean aptas para envío
 */
export async function buildProductResponses(
  products: ProductMedia[],
  contactName?: string | null
): Promise<ProductCaptionResult> {
  const creds = await getBotAICredentials();
  if (!creds || products.length === 0) {
    void botLog("info", "product_response", "Fallback: sin creds o sin productos", {
      metadata: { productsCount: products.length },
    });
    return {
      captions: products.map((p) => fixWhatsAppFormat(p.description)),
      ctaMessage: "¿Te interesa alguno? Si tienes dudas, quieres más detalles o ayuda de un asesor, escríbenos ✨",
    };
  }

  const nameHint = contactName?.trim()
    ? `El cliente se llama ${contactName.trim()}. Personaliza las descripciones para él/ella cuando sea natural (ej: "Para ti, ${contactName.trim()}, este producto...").`
    : "No tenemos el nombre del cliente. Redacta de forma amable y directa.";

  const productList = products
    .map(
      (p, i) =>
        `[${i}] ${p.name}\nDescripción base: ${(p.description || "").slice(0, 300)}`
    )
    .join("\n\n");

  const systemPrompt = `Eres un redactor de mensajes de WhatsApp. Tu única tarea es generar descripciones cortas para acompañar las imágenes de productos (el bot envía imagen + video por producto; la descripción va solo con la imagen).

REGLAS OBLIGATORIAS:
1. Formato WhatsApp: *texto* = negrita (UN asterisco por lado). NUNCA uses ** ni # ## ###. WhatsApp no soporta Markdown.
2. Emojis: usa con moderación para dar calidez (ej: 📦 💲 ✨). No satures.
3. Cada descripción máximo ${WHATSAPP_CAPTION_MAX} caracteres (límite WhatsApp para captions).
4. Sé conciso: nombre, precio destacado, 1-2 beneficios clave. Sin listas largas.
5. ${nameHint}
6. Responde ÚNICAMENTE un JSON válido con este formato exacto (sin markdown, sin \`\`\`):
{"captions":["caption1","caption2",...],"ctaMessage":"pregunta o invitación corta"}
El array captions debe tener exactamente ${products.length} elementos, uno por cada producto en el mismo orden.
ctaMessage: OBLIGATORIO que se envíe SIEMPRE DESPUÉS de las imágenes con su descripción (como mensaje separado al final). Debe invitar explícitamente a: si tiene dudas, quiere más detalles o quiere ayuda de un asesor. Incluye emojis (📦 ✨ 💬). Personaliza con el nombre del cliente si lo conoces. Ej: "¿Alguna duda o quieres más detalles? Un asesor te ayuda ✨" o "¿Te interesa? Si tienes dudas o quieres ayuda, un asesor te atiende 📦"`;

  const userPrompt = `Productos a describir (en orden):\n\n${productList}\n\nGenera el JSON con captions y ctaMessage.`;

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
      maxTokens: 2048,
    });

    const cleaned = response.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const parsed = JSON.parse(cleaned) as { captions?: string[]; ctaMessage?: string };

    if (!Array.isArray(parsed.captions) || parsed.captions.length !== products.length) {
      void botLog("warn", "product_response", "IA devolvió captions inválidas: fallback", {
        metadata: { expected: products.length, got: parsed.captions?.length },
      });
      return fallbackResult(products);
    }

    const captions = parsed.captions.map((c) =>
      fixWhatsAppFormat(String(c ?? "").slice(0, WHATSAPP_CAPTION_MAX))
    );
    const ctaMessage =
      typeof parsed.ctaMessage === "string" && parsed.ctaMessage.trim()
        ? fixWhatsAppFormat(parsed.ctaMessage.trim().slice(0, 256))
        : "¿Te interesa alguno? Si tienes dudas, quieres más detalles o ayuda de un asesor, escríbenos ✨";

    void botLog("info", "product_response", "buildProductResponses: captions + CTA generados", {
      metadata: { productsCount: products.length, ctaPreview: ctaMessage.slice(0, 80), contactName: contactName ?? undefined },
    });
    return { captions, ctaMessage };
  } catch (e) {
    void botLog("error", "product_response", "Error IA al generar captions: fallback", {
      error: e instanceof Error ? e.message : String(e),
      metadata: { productsCount: products.length },
    });
    console.error("[product-response-brain] IA error, using fallback:", e);
    return fallbackResult(products);
  }
}

/**
 * Sanitiza para WhatsApp: quita Markdown no soportado, convierte ** a *, permite emojis.
 * WhatsApp solo entiende *negrita* y _cursiva_. No # ## ###.
 */
export function fixWhatsAppFormat(text: string): string {
  return (
    text
      .replace(/^#{1,6}\s*/gm, "") // quitar # ## ### al inicio de línea
      .replace(/\*\*([^*]*)\*\*/g, "*$1*") // **texto** → *texto*
      .trim()
  );
}

function fallbackResult(products: ProductMedia[]): ProductCaptionResult {
  return {
    captions: products.map((p) => fixWhatsAppFormat((p.description || p.name).slice(0, WHATSAPP_CAPTION_MAX))),
    ctaMessage: "¿Te interesa alguno? Si tienes dudas, quieres más detalles o ayuda de un asesor, escríbenos ✨",
  };
}

/** Busca Product por nombre (fuzzy: contiene) */
async function findProductByName(productName: string): Promise<{ name: string; description: string; price: unknown; characteristics: string | null } | null> {
  const p = await prisma.product.findFirst({
    where: {
      name: { contains: productName, mode: "insensitive" },
      available: true,
    },
    select: { name: true, description: true, price: true, characteristics: true },
  });
  return p;
}

/**
 * Construye descripción completa de un producto: redacción IA optimizada,
 * basada en la original (sin omitir nada), bien organizada para WhatsApp.
 */
export async function buildFullProductDescription(
  productName: string,
  contactName?: string | null
): Promise<string | null> {
  const product = await findProductByName(productName);
  if (!product) {
    void botLog("warn", "product_response", "Producto no encontrado para descripción completa", {
      metadata: { productName },
    });
    return null;
  }

  const creds = await getBotAICredentials();
  if (!creds) {
    return buildFallbackFullDescription(product);
  }

  const char = product.characteristics
    ? (() => {
        try {
          const o = JSON.parse(product.characteristics) as Record<string, string>;
          return Object.entries(o).map(([k, v]) => `${k}: ${v}`).join("\n");
        } catch {
          return product.characteristics;
        }
      })()
    : "";

  const nameHint = contactName?.trim()
    ? `\n6. El cliente se llama ${contactName.trim()}. Puedes personalizar brevemente si es natural.`
    : "";
  const systemPrompt = `Eres un redactor. Genera una *ficha completa* del producto para WhatsApp.
REGLAS:
1. Formato WhatsApp: *texto* = negrita (UN asterisco). NUNCA uses ** ni # ## ###. WhatsApp no soporta Markdown.
2. Emojis: usa con moderación (📦 💲 ✨ ℹ️) para dar calidez. No satures.
3. Incluye TODO de la descripción y características originales. No omitas nada.
4. Usa el nombre exacto del producto. Organiza con *Características*, *Precio*, *Descripción* (solo asteriscos simples).
5. Tono cercano, profesional. Máximo ~1200 caracteres.${nameHint}`;

  const userPrompt = `Producto: ${product.name}
Descripción original: ${product.description}
Precio: $${Number(product.price).toLocaleString()}
${char ? `Características:\n${char}` : ""}

Genera la ficha completa optimizada. Al final añade una línea: "¿Te gustaría que un asesor te ayude con la compra?"`;

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
      maxTokens: 1024,
    });
    return fixWhatsAppFormat((response || "").trim().slice(0, 1500));
  } catch (e) {
    void botLog("error", "product_response", "Error IA al generar descripción completa: fallback", {
      error: e instanceof Error ? e.message : String(e),
      metadata: { productName },
    });
    return buildFallbackFullDescription(product);
  }
}

function buildFallbackFullDescription(
  product: { name: string; description: string; price: unknown; characteristics: string | null }
): string {
  const lines: string[] = [
    `*${product.name}*`,
    "",
    product.description,
    "",
    `*Precio:* $${Number(product.price).toLocaleString()}`,
  ];
  if (product.characteristics) {
    try {
      const o = JSON.parse(product.characteristics) as Record<string, string>;
      lines.push("", "*Características:*");
      for (const [k, v] of Object.entries(o)) lines.push(`• ${k}: ${v}`);
    } catch {
      lines.push("", `*Características:* ${product.characteristics}`);
    }
  }
  lines.push("", "¿Te gustaría que un asesor te ayude con la compra?");
  return fixWhatsAppFormat(lines.join("\n"));
}
