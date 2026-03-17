import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { syncProductsWithBot } from "@/lib/products/sync-bot";

const ADMIN_ROLES = ["admin", "super_admin"];

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!ADMIN_ROLES.includes(session.role)) return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

  try {
    const products = await prisma.product.findMany({ orderBy: [{ category: "asc" }, { order: "asc" }] });
    return NextResponse.json(products.map((p) => ({
      ...p,
      price: Number(p.price),
      category: p.category ?? "barriles",
      photos: p.photos ? (JSON.parse(p.photos) as string[]) : [],
      videos: p.videos ? (JSON.parse(p.videos) as string[]) : [],
      characteristics: p.characteristics ? (tryParseJson(p.characteristics) ?? p.characteristics) : null,
    })));
  } catch (err) {
    console.error("GET /api/products error:", err);
    return NextResponse.json({ error: "Error al cargar productos" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!ADMIN_ROLES.includes(session.role)) return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

  try {
    const body = await request.json() as {
      name: string;
      description: string;
      price: number;
      stock?: number;
      available?: boolean;
      category?: string;
      characteristics?: string;
      photos?: string[];
      videos?: string[];
    };
    if (!body.name?.trim()) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });

    const count = await prisma.product.count();
    const product = await prisma.product.create({
      data: {
        name: body.name.trim(),
        description: (body.description ?? "").trim(),
        price: Number(body.price) || 0,
        stock: Number(body.stock) ?? 0,
        available: body.available !== false,
        category: body.category === "otros" ? "otros" : "barriles",
        characteristics: body.characteristics?.trim() || null,
        photos: body.photos?.length ? JSON.stringify(body.photos) : null,
        videos: body.videos?.length ? JSON.stringify(body.videos) : null,
        order: count,
      },
    });
    await syncProductsWithBot().catch((err) => console.error("syncProductsWithBot after create:", err));
    return NextResponse.json({
      ...product,
      price: Number(product.price),
      photos: product.photos ? JSON.parse(product.photos) : [],
      videos: product.videos ? JSON.parse(product.videos) : [],
    });
  } catch (err) {
    console.error("POST /api/products error:", err);
    return NextResponse.json({ error: "Error al crear producto" }, { status: 500 });
  }
}

function tryParseJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
