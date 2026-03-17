import { NextResponse } from "next/server";
import { processReadyBatches } from "@/lib/bot/batch";
import { processPendingWelcomeCtas } from "@/lib/bot/process-pending-welcome-cta";

/**
 * Cron: procesa lotes de mensajes del bot + CTAs de bienvenida pendientes.
 * Llamar cada 5–10 s desde Vercel Cron o externamente con CRON_SECRET.
 */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processReadyBatches();
    const ctaResult = await processPendingWelcomeCtas();
    return NextResponse.json({
      ok: true,
      ...result,
      pendingCtasSent: ctaResult.sent,
      pendingCtasErrors: ctaResult.errors,
    });
  } catch (e) {
    console.error("cron process-batches:", e);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
