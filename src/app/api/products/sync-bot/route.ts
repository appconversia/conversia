import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { syncProductsWithBot } from "@/lib/products/sync-bot";

const ADMIN_ROLES = ["admin", "super_admin"];

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!ADMIN_ROLES.includes(session.role)) return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

  try {
    const result = await syncProductsWithBot();
    return NextResponse.json({
      ok: true,
      message: `Sincronizado: ${result.catalogCount} imágenes en catálogo, ${result.trainingLength} caracteres de contexto para el bot.`,
      ...result,
    });
  } catch (err) {
    console.error("POST /api/products/sync-bot error:", err);
    return NextResponse.json({ error: "Error al sincronizar con el bot" }, { status: 500 });
  }
}
