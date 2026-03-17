import { prisma } from "@/lib/db";

export type ProductMedia = {
  id: string;
  name: string;
  url: string;
  description: string;
  order: number;
  type: "image" | "video";
};

const CONFIG_KEY = "bot_product_catalog";

export async function getProductCatalog(): Promise<ProductMedia[]> {
  const row = await prisma.appConfig.findUnique({
    where: { key: CONFIG_KEY },
  });
  if (!row?.value) return [];
  try {
    const data = JSON.parse(row.value) as ProductMedia[];
    return Array.isArray(data) ? data.sort((a, b) => a.order - b.order) : [];
  } catch {
    return [];
  }
}

export async function saveProductCatalog(items: ProductMedia[]): Promise<void> {
  const valid = Array.isArray(items)
    ? items
        .filter(
          (i) =>
            i &&
            typeof i.id === "string" &&
            typeof i.name === "string" &&
            typeof i.url === "string"
        )
        .map((i) => ({
          id: i.id,
          name: String(i.name),
          url: String(i.url),
          description: String(i.description ?? ""),
          order: Number(i.order) || 0,
          type: (i as ProductMedia).type === "video" ? "video" : "image" as const,
        }))
    : [];
  await prisma.appConfig.upsert({
    where: { key: CONFIG_KEY },
    create: { key: CONFIG_KEY, value: JSON.stringify(valid) },
    update: { value: JSON.stringify(valid) },
  });
}
