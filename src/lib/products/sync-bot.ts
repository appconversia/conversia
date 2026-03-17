import { prisma } from "@/lib/db";
import { saveProductCatalog } from "@/lib/bot/product-catalog";

const BOT_PRODUCTS_TRAINING_KEY = "bot_products_training";

/** Genera texto completo de todos los productos para entrenar al bot */
export async function generateProductsTrainingText(): Promise<string> {
  const products = await prisma.product.findMany({ orderBy: { order: "asc" } });
  if (products.length === 0) return "";

  const lines: string[] = [
    "## Catálogo de productos (base de conocimiento)",
    "",
    "Cuando el cliente pregunte por productos, precios, disponibilidad, características o inventario, usa EXCLUSIVAMENTE la siguiente información:",
    "",
  ];

  for (const p of products) {
    const photos = p.photos ? (JSON.parse(p.photos) as string[]) : [];
    const char = p.characteristics ? (tryParseJson(p.characteristics) as Record<string, string> | null) : null;
    const cat = p.category ?? "barriles";
    lines.push(`### ${p.name}`);
    lines.push(`- Categoría: ${cat}`);
    lines.push(`- Precio: $${Number(p.price).toLocaleString()}`);
    lines.push(`- Stock: ${p.stock} unidades`);
    lines.push(`- Disponible: ${p.available ? "Sí" : "No"}`);
    if (p.description) lines.push(`- Descripción: ${p.description}`);
    if (char && typeof char === "object") {
      for (const [k, v] of Object.entries(char)) lines.push(`- ${k}: ${v}`);
    } else if (p.characteristics) {
      lines.push(`- Características: ${p.characteristics}`);
    }
    const videos = p.videos ? (JSON.parse(p.videos) as string[]) : [];
    if (photos.length > 0) lines.push(`- Imágenes: ${photos.length} en catálogo visual`);
    if (videos.length > 0) lines.push(`- Videos: ${videos.length} en catálogo`);
    lines.push("");
  }

  return lines.join("\n");
}

/** Sincroniza productos con el bot: actualiza catálogo de imágenes y texto de entrenamiento */
export async function syncProductsWithBot(): Promise<{ catalogCount: number; trainingLength: number }> {
  const products = await prisma.product.findMany({
    where: { available: true },
    orderBy: { order: "asc" },
  });

  const catalogItems: Array<{ id: string; name: string; url: string; description: string; order: number; type: "image" | "video" }> = [];

  // Orden: por producto, primero video (sin caption) luego imagen (con caption)
  for (const p of products) {
    const photos = p.photos ? (JSON.parse(p.photos) as string[]) : [];
    const videos = p.videos ? (JSON.parse(p.videos) as string[]) : [];
    const desc = `${p.name} - $${Number(p.price).toLocaleString()}${p.description ? `. ${p.description}` : ""}`;
    const baseOrder = p.order * 100;
    videos.forEach((url, i) => {
      catalogItems.push({
        id: `${p.id}-vid-${i}`,
        name: p.name,
        url,
        description: desc,
        order: baseOrder + i,
        type: "video",
      });
    });
    photos.forEach((url, i) => {
      catalogItems.push({
        id: `${p.id}-img-${i}`,
        name: p.name,
        url,
        description: desc,
        order: baseOrder + 50 + i,
        type: "image",
      });
    });
  }

  await saveProductCatalog(catalogItems);

  const trainingText = await generateProductsTrainingText();
  await prisma.appConfig.upsert({
    where: { key: BOT_PRODUCTS_TRAINING_KEY },
    create: { key: BOT_PRODUCTS_TRAINING_KEY, value: trainingText },
    update: { value: trainingText },
  });

  return { catalogCount: catalogItems.length, trainingLength: trainingText.length };
}

export async function getProductsTrainingText(): Promise<string> {
  const row = await prisma.appConfig.findUnique({ where: { key: BOT_PRODUCTS_TRAINING_KEY } });
  return row?.value ?? "";
}

function tryParseJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
