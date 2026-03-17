import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * GET /api/admin/logs
 * Logs de diagnóstico del bot. Solo super_admin.
 * Filtros: level, stage, since (ISO date), conversationId, limit (default 100, max 500).
 */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.role !== "super_admin") {
    return NextResponse.json({ error: "Solo super_admin puede ver logs" }, { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const level = searchParams.get("level") || undefined;
  const stage = searchParams.get("stage") || undefined;
  const since = searchParams.get("since") || undefined;
  const conversationId = searchParams.get("conversationId") || undefined;
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "100", 10), 1), 500);

  const where: Record<string, unknown> = {};
  if (level) where.level = level;
  if (stage) where.stage = stage;
  if (conversationId) where.conversationId = conversationId;
  if (since) {
    const d = new Date(since);
    if (!isNaN(d.getTime())) where.createdAt = { gte: d };
  }

  try {
    const logs = await prisma.botLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return NextResponse.json({ logs });
  } catch (e) {
    console.error("[admin/logs]", e);
    return NextResponse.json({ error: "Error al cargar logs" }, { status: 500 });
  }
}
