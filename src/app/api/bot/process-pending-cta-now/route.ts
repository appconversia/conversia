import { NextRequest, NextResponse } from "next/server";
import { processPendingWelcomeCtas } from "@/lib/bot/process-pending-welcome-cta";

/**
 * Procesa CTA de bienvenida pendiente de una conversación (invocación inmediata).
 * Llamado por el webhook tras enviar fotos, para no depender solo del cron.
 * Auth: CRON_SECRET o sin auth en desarrollo.
 */
export async function POST(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processPendingWelcomeCtas();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("process-pending-cta-now:", e);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
