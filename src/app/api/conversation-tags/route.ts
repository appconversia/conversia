import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

const ADMIN_ROLES = ["admin", "super_admin"];

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const tags = await prisma.conversationTag.findMany({
      orderBy: { order: "asc" },
      include: { _count: { select: { conversations: true } } },
    });
    return NextResponse.json(tags);
  } catch (err) {
    console.error("GET /api/conversation-tags error:", err);
    return NextResponse.json({ error: "Error al cargar etiquetas" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!ADMIN_ROLES.includes(session.role)) return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

  try {
    const body = await request.json() as { name: string; order?: number };
    if (!body.name?.trim()) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });

    const slug = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const maxOrder = await prisma.conversationTag.findFirst({
      orderBy: { order: "desc" },
      select: { order: true },
    });
    const order = body.order ?? (maxOrder?.order ?? 2) + 1;

    const tag = await prisma.conversationTag.create({
      data: {
        name: body.name.trim(),
        slug,
        isSystem: false,
        order,
      },
    });
    return NextResponse.json(tag);
  } catch (err) {
    console.error("POST /api/conversation-tags error:", err);
    return NextResponse.json({ error: "Error al crear etiqueta" }, { status: 500 });
  }
}
