import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getBatchConfig, setBatchConfig, type BotBatchConfig } from "@/lib/config";

function canEditBotConfig(role: string): boolean {
  const r = String(role ?? "").trim().toLowerCase();
  return r === "super_admin" || r === "admin";
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!session.tenantId) {
    return NextResponse.json({ error: "Se requiere cuenta de organización" }, { status: 403 });
  }
  if (!canEditBotConfig(session.role)) {
    return NextResponse.json({ error: "Sin permisos", canEdit: false }, { status: 403 });
  }
  try {
    const config = await getBatchConfig(session.tenantId);
    return NextResponse.json({ batch: config, canEdit: true });
  } catch (err) {
    console.error("GET /api/bot/batch-config error:", err);
    return NextResponse.json({ error: "Error al cargar" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!session.tenantId) {
    return NextResponse.json({ error: "Se requiere cuenta de organización" }, { status: 403 });
  }
  if (!canEditBotConfig(session.role)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }
  try {
    const body = (await request.json()) as { batch?: Partial<BotBatchConfig> };
    if (!body.batch) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    const next = await setBatchConfig(session.tenantId, body.batch);
    return NextResponse.json({ batch: next, canEdit: true });
  } catch (err) {
    console.error("PUT /api/bot/batch-config error:", err);
    return NextResponse.json({ error: "Error al guardar" }, { status: 500 });
  }
}
