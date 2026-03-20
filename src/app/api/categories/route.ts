import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

const ADMIN_ROLES = ["admin", "super_admin"];

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!ADMIN_ROLES.includes(session.role)) return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

  try {
    const categories = await prisma.category.findMany({
      orderBy: { order: "asc" },
      include: { _count: { select: { products: true } } },
    });
    return NextResponse.json(categories);
  } catch (err) {
    console.error("GET /api/categories error:", err);
    return NextResponse.json({ error: "Error al cargar categorías" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!ADMIN_ROLES.includes(session.role)) return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

  try {
    const body = await request.json() as { name: string; order?: number };
    if (!body.name?.trim()) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });

    const maxOrder = await prisma.category.findFirst({
      orderBy: { order: "desc" },
      select: { order: true },
    });
    const order = body.order ?? (maxOrder?.order ?? -1) + 1;

    const category = await prisma.category.create({
      data: {
        name: body.name.trim(),
        order,
      },
    });
    return NextResponse.json(category);
  } catch (err) {
    console.error("POST /api/categories error:", err);
    return NextResponse.json({ error: "Error al crear categoría" }, { status: 500 });
  }
}
