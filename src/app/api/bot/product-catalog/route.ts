import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getProductCatalog, saveProductCatalog, type ProductMedia } from "@/lib/bot/product-catalog";

const SUPER_ADMIN_ROLES = ["super_admin"];

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  // Admin y super_admin pueden ver el catálogo
  if (!["admin", "super_admin"].includes(session.role)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  try {
    const catalog = await getProductCatalog();
    return NextResponse.json(catalog);
  } catch (err) {
    console.error("GET /api/bot/product-catalog error:", err);
    return NextResponse.json({ error: "Error al cargar catálogo" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!SUPER_ADMIN_ROLES.includes(session.role)) {
    return NextResponse.json({ error: "Solo super administradores pueden editar el catálogo" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const items = (Array.isArray(body) ? body : body.items ?? []) as ProductMedia[];
    await saveProductCatalog(items);
    const catalog = await getProductCatalog();
    return NextResponse.json(catalog);
  } catch (err) {
    console.error("PUT /api/bot/product-catalog error:", err);
    return NextResponse.json({ error: "Error al guardar catálogo" }, { status: 500 });
  }
}
