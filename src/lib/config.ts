import { prisma } from "./db";

const KEYS = {
  SYSTEM_PROTECTED_USER_ID: "system_protected_user_id",
  BOT_USER_ID: "bot_user_id",
  WHATSAPP_ACCESS_TOKEN: "whatsapp_access_token",
  WHATSAPP_PHONE_NUMBER_ID: "whatsapp_phone_number_id",
  WHATSAPP_BUSINESS_ACCOUNT_ID: "whatsapp_business_account_id",
  WHATSAPP_WEBHOOK_VERIFY_TOKEN: "whatsapp_webhook_verify_token",
  WHATSAPP_ENABLED: "whatsapp_enabled",
  APP_BASE_URL: "app_base_url",
  BOT_OPENAI_API_KEY: "bot_openai_api_key",
  BOT_ANTHROPIC_API_KEY: "bot_anthropic_api_key",
  BOT_GOOGLE_API_KEY: "bot_google_api_key",
  BOT_DEFAULT_PROVIDER: "bot_default_provider",
  BOT_ENABLED: "bot_enabled",
  BOT_N8N_WEBHOOK_URL: "bot_n8n_webhook_url",
  BOT_SYSTEM_PROMPT: "bot_system_prompt",
  BOT_MODEL: "bot_model",
  BOT_TEMPERATURE: "bot_temperature",
  BOT_MAX_TOKENS: "bot_max_tokens",
  BOT_BATCH_CONFIG: "bot_batch_config",
} as const;

export type WhatsAppConfig = {
  accessToken: string;
  phoneNumberId: string;
  businessAccountId: string;
  webhookVerifyToken: string;
  enabled: boolean;
  webhookUrl: string; // derivada, no se guarda
};

export type BotProvider = "openai" | "anthropic" | "google";

export type BotConfig = {
  openaiApiKey: string;
  openaiApiKeyMasked: boolean;
  anthropicApiKey: string;
  anthropicApiKeyMasked: boolean;
  googleApiKey: string;
  googleApiKeyMasked: boolean;
  defaultProvider: BotProvider;
  enabled: boolean;
  n8nWebhookUrl: string;
  systemPrompt: string;
  model: string;
  temperature: number;
  maxTokens: number;
};

export type AppConfigData = {
  whatsapp: WhatsAppConfig & { accessTokenMasked?: boolean };
  bot: BotConfig;
  appBaseUrl: string;
};

async function getValue(key: string): Promise<string | null> {
  const row = await prisma.appConfig.findUnique({
    where: { key },
  });
  return row?.value ?? null;
}

async function setValue(key: string, value: string | null): Promise<void> {
  if (value === null || value === "") {
    await prisma.appConfig.deleteMany({ where: { key } });
    return;
  }
  await prisma.appConfig.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}

export async function getWhatsAppConfig(): Promise<WhatsAppConfig> {
  const [accessToken, phoneNumberId, businessAccountId, webhookVerifyToken, enabled, baseUrl] =
    await Promise.all([
      getValue(KEYS.WHATSAPP_ACCESS_TOKEN),
      getValue(KEYS.WHATSAPP_PHONE_NUMBER_ID),
      getValue(KEYS.WHATSAPP_BUSINESS_ACCOUNT_ID),
      getValue(KEYS.WHATSAPP_WEBHOOK_VERIFY_TOKEN),
      getValue(KEYS.WHATSAPP_ENABLED),
      getValue(KEYS.APP_BASE_URL),
    ]);

  const appBase = resolveAppBaseUrl(baseUrl);

  return {
    accessToken: accessToken ?? "",
    phoneNumberId: phoneNumberId ?? "",
    businessAccountId: businessAccountId ?? "",
    webhookVerifyToken: webhookVerifyToken ?? "",
    enabled: enabled === "true",
    webhookUrl: `${appBase}/api/webhook/whatsapp`,
  };
}

/** Usuario del bot (sistema) - para mensajes enviados por IA */
export async function getBotUserId(): Promise<string | null> {
  return getValue(KEYS.BOT_USER_ID);
}

/** Usuario protegido (no editable/eliminable) - consultado desde BD */
export async function getProtectedUserId(): Promise<string | null> {
  return getValue(KEYS.SYSTEM_PROTECTED_USER_ID);
}

export async function getWebhookVerifyToken(): Promise<string | null> {
  return getValue(KEYS.WHATSAPP_WEBHOOK_VERIFY_TOKEN);
}

/** Para enviar mensajes: obtiene credenciales completas */
export async function getWhatsAppCredentials(): Promise<{
  accessToken: string;
  phoneNumberId: string;
  businessAccountId: string;
} | null> {
  const config = await getWhatsAppConfig();
  if (!config.enabled || !config.accessToken || !config.phoneNumberId) return null;
  return {
    accessToken: config.accessToken,
    phoneNumberId: config.phoneNumberId,
    businessAccountId: config.businessAccountId,
  };
}

/** Resuelve la URL base: prioridad: BD > host del request (si disponible) > env > Vercel > localhost */
export function resolveAppBaseUrl(storedBaseUrl: string | null, requestHeaders?: Headers): string {
  if (storedBaseUrl?.trim()) return storedBaseUrl.replace(/\/$/, "");
  const host = requestHeaders?.get("x-forwarded-host") || requestHeaders?.get("host");
  if (host && !host.includes("localhost")) return `https://${host.split(",")[0].trim()}`;
  if (process.env.NEXT_PUBLIC_APP_URL?.trim()) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export async function getAppConfigForUI(request?: Request): Promise<AppConfigData> {
  const [
    accessToken,
    phoneNumberId,
    businessAccountId,
    webhookVerifyToken,
    whatsappEnabled,
    baseUrl,
    openaiKey,
    anthropicKey,
    googleKey,
    botProvider,
    botEnabled,
    n8nWebhook,
    systemPrompt,
    model,
    temperature,
    maxTokens,
  ] = await Promise.all([
    getValue(KEYS.WHATSAPP_ACCESS_TOKEN),
    getValue(KEYS.WHATSAPP_PHONE_NUMBER_ID),
    getValue(KEYS.WHATSAPP_BUSINESS_ACCOUNT_ID),
    getValue(KEYS.WHATSAPP_WEBHOOK_VERIFY_TOKEN),
    getValue(KEYS.WHATSAPP_ENABLED),
    getValue(KEYS.APP_BASE_URL),
    getValue(KEYS.BOT_OPENAI_API_KEY),
    getValue(KEYS.BOT_ANTHROPIC_API_KEY),
    getValue(KEYS.BOT_GOOGLE_API_KEY),
    getValue(KEYS.BOT_DEFAULT_PROVIDER),
    getValue(KEYS.BOT_ENABLED),
    getValue(KEYS.BOT_N8N_WEBHOOK_URL),
    getValue(KEYS.BOT_SYSTEM_PROMPT),
    getValue(KEYS.BOT_MODEL),
    getValue(KEYS.BOT_TEMPERATURE),
    getValue(KEYS.BOT_MAX_TOKENS),
  ]);

  const appBase = resolveAppBaseUrl(baseUrl, request?.headers);

  const webhookUrl = `${appBase.replace(/\/$/, "")}/api/webhook/whatsapp`;

  const validProvider: BotProvider =
    botProvider === "openai" || botProvider === "anthropic" || botProvider === "google"
      ? botProvider
      : "openai";

  return {
    whatsapp: {
      accessToken: "",
      accessTokenMasked: !!accessToken,
      phoneNumberId: phoneNumberId ?? "",
      businessAccountId: businessAccountId ?? "",
      webhookVerifyToken: webhookVerifyToken ?? "",
      enabled: whatsappEnabled === "true",
      webhookUrl,
    },
    bot: {
      openaiApiKey: "",
      openaiApiKeyMasked: !!openaiKey,
      anthropicApiKey: "",
      anthropicApiKeyMasked: !!anthropicKey,
      googleApiKey: "",
      googleApiKeyMasked: !!googleKey,
      defaultProvider: validProvider,
      enabled: botEnabled === "true",
      n8nWebhookUrl: n8nWebhook ?? "",
      systemPrompt: systemPrompt ?? "Eres un asistente de atención al cliente. Responde de forma amable y profesional.",
      model: model ?? "",
      temperature: temperature ? parseFloat(temperature) : 0.4,
      maxTokens: maxTokens ? parseInt(maxTokens, 10) : 1024,
    },
    appBaseUrl: baseUrl ?? "",
  };
}

export async function saveWhatsAppConfig(data: Partial<WhatsAppConfig>): Promise<void> {
  const updates: Array<[string, string | null]> = [];
  // accessToken: solo actualizar si se provee un valor no vacío
  if (data.accessToken !== undefined && data.accessToken.trim() !== "") {
    updates.push([KEYS.WHATSAPP_ACCESS_TOKEN, data.accessToken.trim()]);
  }
  if (data.phoneNumberId !== undefined) updates.push([KEYS.WHATSAPP_PHONE_NUMBER_ID, data.phoneNumberId || null]);
  if (data.businessAccountId !== undefined) updates.push([KEYS.WHATSAPP_BUSINESS_ACCOUNT_ID, data.businessAccountId || null]);
  if (data.webhookVerifyToken !== undefined) updates.push([KEYS.WHATSAPP_WEBHOOK_VERIFY_TOKEN, data.webhookVerifyToken || null]);
  if (data.enabled !== undefined) updates.push([KEYS.WHATSAPP_ENABLED, data.enabled ? "true" : "false"]);

  for (const [key, value] of updates) {
    await setValue(key, value);
  }
}

export async function saveAppBaseUrl(url: string): Promise<void> {
  await setValue(KEYS.APP_BASE_URL, url && url.trim() ? url.trim() : null);
}

export async function saveBotConfig(data: Partial<BotConfig>): Promise<void> {
  const updates: Array<[string, string | null]> = [];
  if (data.openaiApiKey !== undefined && data.openaiApiKey.trim() !== "") {
    updates.push([KEYS.BOT_OPENAI_API_KEY, data.openaiApiKey.trim()]);
  }
  if (data.anthropicApiKey !== undefined && data.anthropicApiKey.trim() !== "") {
    updates.push([KEYS.BOT_ANTHROPIC_API_KEY, data.anthropicApiKey.trim()]);
  }
  if (data.googleApiKey !== undefined && data.googleApiKey.trim() !== "") {
    updates.push([KEYS.BOT_GOOGLE_API_KEY, data.googleApiKey.trim()]);
  }
  if (data.defaultProvider !== undefined) updates.push([KEYS.BOT_DEFAULT_PROVIDER, data.defaultProvider]);
  if (data.enabled !== undefined) updates.push([KEYS.BOT_ENABLED, data.enabled ? "true" : "false"]);
  if (data.n8nWebhookUrl !== undefined) updates.push([KEYS.BOT_N8N_WEBHOOK_URL, data.n8nWebhookUrl?.trim() || null]);
  if (data.systemPrompt !== undefined) updates.push([KEYS.BOT_SYSTEM_PROMPT, data.systemPrompt?.trim() || null]);
  if (data.model !== undefined) updates.push([KEYS.BOT_MODEL, data.model?.trim() || null]);
  if (data.temperature !== undefined) updates.push([KEYS.BOT_TEMPERATURE, String(data.temperature)]);
  if (data.maxTokens !== undefined) updates.push([KEYS.BOT_MAX_TOKENS, String(data.maxTokens)]);

  for (const [key, value] of updates) {
    await setValue(key, value);
  }
}

/** Obtiene credenciales y parámetros de IA para uso server-side */
export async function getBotAICredentials(): Promise<{
  provider: BotProvider;
  openaiKey: string | null;
  anthropicKey: string | null;
  googleKey: string | null;
  systemPrompt: string;
  model: string;
  temperature: number;
  maxTokens: number;
} | null> {
  const [openai, anthropic, google, provider, enabled, systemPrompt, model, temperature, maxTokens] = await Promise.all([
    getValue(KEYS.BOT_OPENAI_API_KEY),
    getValue(KEYS.BOT_ANTHROPIC_API_KEY),
    getValue(KEYS.BOT_GOOGLE_API_KEY),
    getValue(KEYS.BOT_DEFAULT_PROVIDER),
    getValue(KEYS.BOT_ENABLED),
    getValue(KEYS.BOT_SYSTEM_PROMPT),
    getValue(KEYS.BOT_MODEL),
    getValue(KEYS.BOT_TEMPERATURE),
    getValue(KEYS.BOT_MAX_TOKENS),
  ]);
  if (enabled !== "true") return null;

  const p: BotProvider =
    provider === "anthropic" || provider === "google" ? provider : "openai";

  return {
    provider: p,
    openaiKey: openai || null,
    anthropicKey: anthropic || null,
    googleKey: google || null,
    systemPrompt: systemPrompt?.trim() || "Eres un asistente de atención al cliente. Responde de forma amable y profesional.",
    model: model?.trim() || "",
    temperature: temperature ? parseFloat(temperature) : 0.4,
    maxTokens: maxTokens ? parseInt(maxTokens, 10) : 1024,
  };
}

/** Configuración de agrupación de mensajes (estilo Redis): delay y tamaño máximo de lote */
export type BotBatchConfig = {
  enabled: boolean;
  delayMs: number;
  maxBatchSize: number;
};

const DEFAULT_BATCH_CONFIG: BotBatchConfig = {
  enabled: false,
  delayMs: 2500,
  maxBatchSize: 10,
};

export async function getBatchConfig(): Promise<BotBatchConfig> {
  const raw = await getValue(KEYS.BOT_BATCH_CONFIG);
  if (!raw) return DEFAULT_BATCH_CONFIG;
  try {
    const parsed = JSON.parse(raw) as Partial<BotBatchConfig>;
    return {
      enabled: parsed.enabled ?? DEFAULT_BATCH_CONFIG.enabled,
      delayMs: typeof parsed.delayMs === "number" ? Math.max(500, Math.min(30000, parsed.delayMs)) : DEFAULT_BATCH_CONFIG.delayMs,
      maxBatchSize: typeof parsed.maxBatchSize === "number" ? Math.max(1, Math.min(50, parsed.maxBatchSize)) : DEFAULT_BATCH_CONFIG.maxBatchSize,
    };
  } catch {
    return DEFAULT_BATCH_CONFIG;
  }
}

export async function setBatchConfig(config: Partial<BotBatchConfig>): Promise<BotBatchConfig> {
  const current = await getBatchConfig();
  const next: BotBatchConfig = {
    enabled: config.enabled ?? current.enabled,
    delayMs: config.delayMs !== undefined ? Math.max(500, Math.min(30000, config.delayMs)) : current.delayMs,
    maxBatchSize: config.maxBatchSize !== undefined ? Math.max(1, Math.min(50, config.maxBatchSize)) : current.maxBatchSize,
  };
  await setValue(KEYS.BOT_BATCH_CONFIG, JSON.stringify(next));
  return next;
}
