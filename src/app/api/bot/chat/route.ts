import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getBotAICredentials } from "@/lib/config";
import { callAI } from "@/lib/ai";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!session.tenantId) {
    return NextResponse.json({ error: "Se requiere cuenta de organización" }, { status: 403 });
  }
  const creds = await getBotAICredentials(session.tenantId);
  if (!creds) {
    return NextResponse.json({ error: "Bot con IA no configurado. Ve a Configuración." }, { status: 400 });
  }

  try {
    const body = await request.json();
    const message = String(body.message ?? "").trim();
    const history = Array.isArray(body.history) ? body.history : [];
    const systemPrompt = body.systemPrompt != null ? String(body.systemPrompt) : creds.systemPrompt;

    if (!message) {
      return NextResponse.json({ error: "Mensaje vacío" }, { status: 400 });
    }

    const messages = [
      { role: "system" as const, content: systemPrompt },
      ...history.slice(-10).map((h: { role: string; content: string }) => ({
        role: h.role as "user" | "assistant",
        content: String(h.content ?? ""),
      })),
      { role: "user" as const, content: message },
    ];

    const response = await callAI(
      creds.provider,
      messages,
      {
        openaiKey: creds.openaiKey,
        anthropicKey: creds.anthropicKey,
        googleKey: creds.googleKey,
        model: creds.model,
        temperature: creds.temperature,
        maxTokens: creds.maxTokens,
      }
    );

    return NextResponse.json({ response });
  } catch (err) {
    console.error("[Bot chat] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al procesar" },
      { status: 500 }
    );
  }
}
