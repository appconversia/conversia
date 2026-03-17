import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { processReadyBatches } from "@/lib/bot/batch";

/**
 * Forzar procesamiento de lotes pendientes (fallback cuando cron no corre).
 * Plan 9.10: Si mensajes >60 seg sin procesar, exponer endpoint manual.
 * POST protegido solo super_admin, o con CRON_SECRET para cron externo.
 */
export async function POST(request: Request) {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (secret && auth === `Bearer ${secret}`) {
    try {
      const result = await processReadyBatches();
      return NextResponse.json({ ok: true, ...result });
    } catch (e) {
      console.error("process-now:", e);
      return NextResponse.json({ error: "Processing failed" }, { status: 500 });
    }
  }

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.role !== "super_admin") return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

  try {
    const result = await processReadyBatches();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("process-now:", e);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
