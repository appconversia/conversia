import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

const ADMIN_ROLES = ["super_admin", "admin"];

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!ADMIN_ROLES.includes(session.role)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const flows = await prisma.botFlow.findMany({
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ flows });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!ADMIN_ROLES.includes(session.role)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const name = String(body.name ?? "Nuevo flujo").trim();
    const description = String(body.description ?? "").trim();
    const flowJson = typeof body.flowJson === "string" ? body.flowJson : JSON.stringify({ nodes: [], edges: [] });

    const flow = await prisma.botFlow.create({
      data: { name, description, flowJson, isActive: false },
    });
    return NextResponse.json({ flow });
  } catch (err) {
    console.error("POST /api/bot/flows:", err);
    return NextResponse.json({ error: "Error al crear flujo" }, { status: 500 });
  }
}
