/**
 * Crea 3 productos de ejemplo en la base de datos (producción o local).
 * Ejecutar: DATABASE_URL="postgresql://..." npx tsx scripts/seed-products.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PRODUCTS = [
  {
    name: "Barril 50L Acero Inoxidable",
    description: "Barril industrial de 50 litros en acero inoxidable 304. Ideal para fermentación, almacenamiento de líquidos y uso en cervecerías artesanales. Incluye tapa roscada y válvula de salida.",
    price: 285000,
    stock: 25,
    available: true,
    characteristics: JSON.stringify({
      capacidad: "50 litros",
      material: "Acero inoxidable 304",
      dimensiones: "40cm diámetro x 55cm alto",
      uso: "Cervecería, fermentación, almacenamiento",
      garantia: "12 meses",
    }),
    photos: JSON.stringify([
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400",
      "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=400",
    ]),
    order: 0,
  },
  {
    name: "Barril 100L Industrial",
    description: "Barril de gran capacidad para producción comercial. Fabricado en acero inoxidable de grado alimenticio. Perfecto para almacenamiento de agua, cerveza, vinos y otros líquidos. Base reforzada.",
    price: 485000,
    stock: 12,
    available: true,
    characteristics: JSON.stringify({
      capacidad: "100 litros",
      material: "Acero inoxidable grado alimenticio",
      dimensiones: "55cm diámetro x 85cm alto",
      uso: "Producción comercial, restaurantes, microcervecerías",
      peso_vacio: "28 kg",
      garantia: "18 meses",
    }),
    photos: JSON.stringify([
      "https://images.unsplash.com/photo-1532634922-8fe0b757fb13?w=400",
      "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=400",
    ]),
    order: 1,
  },
  {
    name: "Barril 200L Comercial",
    description: "Barril de máximo rendimiento para operaciones a gran escala. Diseño robusto con múltiples conexiones. Utilizado en industrias alimentarias, químicas y agroindustriales. Certificación de calidad.",
    price: 850000,
    stock: 8,
    available: true,
    characteristics: JSON.stringify({
      capacidad: "200 litros",
      material: "Acero inoxidable 316L",
      dimensiones: "65cm diámetro x 120cm alto",
      uso: "Industrial, agroindustria, químico alimenticio",
      conexiones: "2 entradas, 1 salida, válvula de presión",
      peso_vacio: "45 kg",
      garantia: "24 meses",
    }),
    photos: JSON.stringify([
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400",
      "https://images.unsplash.com/photo-1532634922-8fe0b757fb13?w=400",
    ]),
    order: 2,
  },
];

async function main() {
  console.log("Sincronizando 3 productos en la base de datos...");

  for (const p of PRODUCTS) {
    await prisma.product.deleteMany({ where: { name: p.name } });
    const created = await prisma.product.create({ data: p });
    console.log(`  ✓ ${created.name} - $${Number(created.price).toLocaleString()}`);
  }

  console.log("Listo. 3 productos creados/actualizados.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
