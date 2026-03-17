import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAppConfigForUI, saveBotConfig, type BotConfig } from "@/lib/config";

function canEditBotConfig(role: string): boolean {
  const r = String(role ?? "").trim().toLowerCase();
  return r === "super_admin" || r === "admin";
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!canEditBotConfig(session.role)) {
    return NextResponse.json(
      { error: "Solo administradores pueden configurar el bot", canEdit: false },
      { status: 403 }
    );
  }

  try {
    const config = await getAppConfigForUI();
    return NextResponse.json({ bot: config.bot, canEdit: true });
  } catch (err) {
    console.error("GET /api/bot/config error:", err);
    return NextResponse.json({ error: "Error al cargar" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!canEditBotConfig(session.role)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const bot = body.bot as Partial<BotConfig & { openaiApiKeyMasked?: boolean; anthropicApiKeyMasked?: boolean; googleApiKeyMasked?: boolean }>;

    if (!bot) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    await saveBotConfig({
      openaiApiKey: typeof bot.openaiApiKey === "string" && bot.openaiApiKey.trim() ? bot.openaiApiKey.trim() : undefined,
      anthropicApiKey: typeof bot.anthropicApiKey === "string" && bot.anthropicApiKey.trim() ? bot.anthropicApiKey.trim() : undefined,
      googleApiKey: typeof bot.googleApiKey === "string" && bot.googleApiKey.trim() ? bot.googleApiKey.trim() : undefined,
      defaultProvider: bot.defaultProvider,
      enabled: bot.enabled,
      n8nWebhookUrl: bot.n8nWebhookUrl,
      systemPrompt: bot.systemPrompt,
      model: bot.model,
      temperature: bot.temperature,
      maxTokens: bot.maxTokens,
    });

    const config = await getAppConfigForUI();
    return NextResponse.json({ bot: config.bot, canEdit: true });
  } catch (err) {
    console.error("PUT /api/bot/config error:", err);
    return NextResponse.json({ error: "Error al guardar" }, { status: 500 });
  }
}
