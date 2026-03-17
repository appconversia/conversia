import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getAppConfigForUI,
  saveWhatsAppConfig,
  saveAppBaseUrl,
  saveBotConfig,
  type WhatsAppConfig,
  type BotConfig,
} from "@/lib/config";

const SUPER_ADMIN_ROLES = ["super_admin"];

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!SUPER_ADMIN_ROLES.includes(session.role)) {
    return NextResponse.json({ error: "Solo super administradores" }, { status: 403 });
  }

  try {
    const config = await getAppConfigForUI(request);
    return NextResponse.json(config);
  } catch (err) {
    console.error("GET /api/config error:", err);
    return NextResponse.json({ error: "Error al cargar configuración" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!SUPER_ADMIN_ROLES.includes(session.role)) {
    return NextResponse.json({ error: "Solo super administradores" }, { status: 403 });
  }

  try {
    const body = await request.json();

    if (body.whatsapp) {
      const wa = body.whatsapp as Partial<WhatsAppConfig & { accessTokenMasked?: boolean }>;
      await saveWhatsAppConfig({
        // Solo actualizar accessToken si se envía uno nuevo (no vacío)
        accessToken: typeof wa.accessToken === "string" && wa.accessToken.trim() ? wa.accessToken.trim() : undefined,
        phoneNumberId: wa.phoneNumberId,
        businessAccountId: wa.businessAccountId,
        webhookVerifyToken: wa.webhookVerifyToken,
        enabled: wa.enabled,
      });
    }

    if (body.appBaseUrl !== undefined) {
      await saveAppBaseUrl(String(body.appBaseUrl ?? ""));
    }

    if (body.bot) {
      const bot = body.bot as Partial<BotConfig & { openaiApiKeyMasked?: boolean; anthropicApiKeyMasked?: boolean; googleApiKeyMasked?: boolean }>;
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
    }

    const updated = await getAppConfigForUI();
    return NextResponse.json(updated);
  } catch (err) {
    console.error("PUT /api/config error:", err);
    return NextResponse.json({ error: "Error al guardar configuración" }, { status: 500 });
  }
}
