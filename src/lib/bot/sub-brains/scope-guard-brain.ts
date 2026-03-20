/**
 * Cerebrito Scope Guard: cuando nada de lo entrenado cumple, redirige al usuario
 * con mensaje de límite y lista de productos (inductivo).
 * Estricto: no permite temas fuera de alcance; siempre devuelve al inicio del flujo.
 */
import { prisma } from "@/lib/db";
import { botLog } from "../bot-logger";

const SCOPE_MESSAGE = `Estamos aquí para servirte y brindarte toda la ayuda que necesitas con nuestros productos ❤️

Pero no podemos ayudarte con eso que mencionaste. Aquí te comparto nuestro catálogo:`;

export type ScopeGuardResult = {
  reply: string;
};

/**
 * Genera respuesta inductiva: mensaje de límite + lista de productos.
 * Siempre devuelve al usuario al inicio del flujo (lista para que elija).
 */
export async function buildScopeGuardReply(
  contactName?: string | null,
  conversationId?: string,
  showOtrosMenu?: boolean
): Promise<ScopeGuardResult> {
  void botLog("info", "scope_guard", "Scope Guard activado: redirección inductiva al catálogo", {
    conversationId,
    metadata: { reason: showOtrosMenu ? "menu_otros" : "no_entiendo_o_fuera_de_alcance" },
  });

  if (showOtrosMenu) {
    const otrosProducts = await prisma.product.findMany({
      where: { available: true },
      orderBy: { order: "asc" },
      select: { name: true, price: true },
    });
    let listBlock = "";
    if (otrosProducts.length > 0) {
      const lines = otrosProducts.map(
        (p, i) => `${i + 1}. *${p.name}* - $${Number(p.price).toLocaleString()}`
      );
      listBlock = `\n\nAquí están nuestros otros productos:\n\n${lines.join("\n")}\n\n¿Cuál te interesa conocer?`;
    } else {
      listBlock = "\n\nPor el momento no tenemos otros productos disponibles. ¿Te gustaría ver el catálogo?";
    }
    return { reply: `Estamos aquí para servirte ❤️${listBlock}` };
  }

  const products = await prisma.product.findMany({
    where: { available: true },
    orderBy: { order: "asc" },
    select: { name: true, price: true },
  });

  let listBlock = "";
  if (products.length > 0) {
    const lines = products.map(
      (p, i) => `${i + 1}. *${p.name}* - $${Number(p.price).toLocaleString()}`
    );
    listBlock = `\n\n${lines.join("\n")}\n\n¿Cuál te interesa conocer?`;
  } else {
    const allProducts = await prisma.product.findMany({
      where: { available: true },
      orderBy: { order: "asc" },
      select: { name: true, price: true },
    });
    if (allProducts.length > 0) {
      const lines = allProducts.map(
        (p, i) => `${i + 1}. *${p.name}* - $${Number(p.price).toLocaleString()}`
      );
      listBlock = `\n\n${lines.join("\n")}\n\n¿Cuál te interesa conocer?`;
    } else {
      listBlock =
        "\n\nEn este momento no tenemos el catálogo cargado. Un asesor te enviará la información en breve. 📦";
    }
  }

  const reply = `${SCOPE_MESSAGE}${listBlock}`;

  return { reply };
}
