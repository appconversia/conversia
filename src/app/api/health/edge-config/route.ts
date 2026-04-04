import { NextResponse } from "next/server";
import { getEdgeConfigValue } from "@/lib/edge-config";

/**
 * Comprueba que Edge Config esté enlazado (EDGE_CONFIG) y opcionalmente lee la clave `greeting`.
 */
export async function GET() {
  if (!process.env.EDGE_CONFIG) {
    return NextResponse.json({
      ok: true,
      edgeConfig: "not_configured",
      hint: "Añade EDGE_CONFIG en Vercel y conecta el store (ej. dbconversia) al proyecto.",
    });
  }
  const greeting = await getEdgeConfigValue("greeting");
  return NextResponse.json({
    ok: true,
    edgeConfig: "connected",
    greeting: greeting ?? null,
  });
}
