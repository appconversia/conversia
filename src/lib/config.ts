import { prisma } from "./db";

const KEYS = {
  SYSTEM_PROTECTED_USER_ID: "system_protected_user_id",
  BOT_USER_ID: "bot_user_id",
  WHATSAPP_ACCESS_TOKEN: "whatsapp_access_token",
  WHATSAPP_PHONE_NUMBER_ID: "whatsapp_phone_number_id",
  WHATSAPP_BUSINESS_ACCOUNT_ID: "whatsapp_business_account_id",
  WHATSAPP_WEBHOOK_VERIFY_TOKEN: "whatsapp_webhook_verify_token",
  /** App Secret de Meta (firma X-Hub-Signature-256) — solo por tenant */
  WHATSAPP_APP_SECRET: "whatsapp_app_secret",
  /** App ID numérico de Meta (subida de foto de perfil, etc.) — por tenant */
  WHATSAPP_META_APP_ID: "whatsapp_meta_app_id",
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

export { KEYS };

export type WhatsAppConfig = {
  accessToken: string;
  phoneNumberId: string;
  businessAccountId: string;
  webhookVerifyToken: string;
  /** Solo UI/máscara; el valor real no se expone */
  appSecretMasked?: boolean;
  /** App ID numérico de la app en Meta (público en el panel de Meta) */
  metaAppId: string;
  enabled: boolean;
  webhookUrl: string;
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

async function getValue(tenantId: string, key: string): Promise<string | null> {
  const row = await prisma.appConfig.findUnique({
    where: { tenantId_key: { tenantId, key } },
  });
  return row?.value ?? null;
}

async function setValue(tenantId: string, key: string, value: string | null): Promise<void> {
  if (value === null || value === "") {
    await prisma.appConfig.deleteMany({ where: { tenantId, key } });
    return;
  }
  await prisma.appConfig.upsert({
    where: { tenantId_key: { tenantId, key } },
    create: { tenantId, key, value },
    update: { value },
  });
}

/** Resuelve tenant por el ID de número de teléfono de WhatsApp Cloud API (multi-tenant). */
export async function findTenantIdByWhatsAppPhoneNumberId(phoneNumberId: string): Promise<string | null> {
  const row = await prisma.appConfig.findFirst({
    where: {
      key: KEYS.WHATSAPP_PHONE_NUMBER_ID,
      value: phoneNumberId,
    },
    select: { tenantId: true },
  });
  return row?.tenantId ?? null;
}

/** App Secret de Meta guardado para el tenant (firma de webhooks). */
export async function getTenantWhatsAppAppSecret(tenantId: string): Promise<string | null> {
  return getValue(tenantId, KEYS.WHATSAPP_APP_SECRET);
}

export async function getWhatsAppConfig(tenantId: string): Promise<WhatsAppConfig> {
  const [accessToken, phoneNumberId, businessAccountId, webhookVerifyToken, metaAppId, enabled, baseUrl] = await Promise.all([
    getValue(tenantId, KEYS.WHATSAPP_ACCESS_TOKEN),
    getValue(tenantId, KEYS.WHATSAPP_PHONE_NUMBER_ID),
    getValue(tenantId, KEYS.WHATSAPP_BUSINESS_ACCOUNT_ID),
    getValue(tenantId, KEYS.WHATSAPP_WEBHOOK_VERIFY_TOKEN),
    getValue(tenantId, KEYS.WHATSAPP_META_APP_ID),
    getValue(tenantId, KEYS.WHATSAPP_ENABLED),
    getValue(tenantId, KEYS.APP_BASE_URL),
  ]);

  const appBase = resolveAppBaseUrl(baseUrl);

  return {
    accessToken: accessToken ?? "",
    phoneNumberId: phoneNumberId ?? "",
    businessAccountId: businessAccountId ?? "",
    webhookVerifyToken: webhookVerifyToken ?? "",
    metaAppId: metaAppId ?? "",
    enabled: enabled === "true",
    webhookUrl: `${appBase}/api/webhook/whatsapp`,
  };
}

export async function getBotUserId(tenantId: string): Promise<string | null> {
  return getValue(tenantId, KEYS.BOT_USER_ID);
}

export async function getProtectedUserId(tenantId: string): Promise<string | null> {
  return getValue(tenantId, KEYS.SYSTEM_PROTECTED_USER_ID);
}

export async function getWebhookVerifyTokenForTenant(tenantId: string): Promise<string | null> {
  return getValue(tenantId, KEYS.WHATSAPP_WEBHOOK_VERIFY_TOKEN);
}

/** GET del webhook de Meta: localiza el tenant por el verify_token configurado en AppConfig. */
export async function findTenantIdByWebhookVerifyToken(token: string): Promise<string | null> {
  const t = token?.trim();
  if (!t) return null;
  const row = await prisma.appConfig.findFirst({
    where: { key: KEYS.WHATSAPP_WEBHOOK_VERIFY_TOKEN, value: t },
    select: { tenantId: true },
  });
  return row?.tenantId ?? null;
}

export async function getWhatsAppCredentials(tenantId: string): Promise<{
  accessToken: string;
  phoneNumberId: string;
  businessAccountId: string;
} | null> {
  const config = await getWhatsAppConfig(tenantId);
  if (!config.enabled || !config.accessToken || !config.phoneNumberId) return null;
  return {
    accessToken: config.accessToken,
    phoneNumberId: config.phoneNumberId,
    businessAccountId: config.businessAccountId,
  };
}

export function resolveAppBaseUrl(storedBaseUrl: string | null, requestHeaders?: Headers): string {
  if (storedBaseUrl?.trim()) return storedBaseUrl.replace(/\/$/, "");
  const host = requestHeaders?.get("x-forwarded-host") || requestHeaders?.get("host");
  if (host && !host.includes("localhost")) return `https://${host.split(",")[0].trim()}`;
  if (process.env.NEXT_PUBLIC_APP_URL?.trim()) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export async function getAppConfigForUI(tenantId: string, request?: Request): Promise<AppConfigData> {
  const [
    accessToken,
    phoneNumberId,
    businessAccountId,
    webhookVerifyToken,
    whatsappAppSecret,
    whatsappMetaAppId,
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
    getValue(tenantId, KEYS.WHATSAPP_ACCESS_TOKEN),
    getValue(tenantId, KEYS.WHATSAPP_PHONE_NUMBER_ID),
    getValue(tenantId, KEYS.WHATSAPP_BUSINESS_ACCOUNT_ID),
    getValue(tenantId, KEYS.WHATSAPP_WEBHOOK_VERIFY_TOKEN),
    getValue(tenantId, KEYS.WHATSAPP_APP_SECRET),
    getValue(tenantId, KEYS.WHATSAPP_META_APP_ID),
    getValue(tenantId, KEYS.WHATSAPP_ENABLED),
    getValue(tenantId, KEYS.APP_BASE_URL),
    getValue(tenantId, KEYS.BOT_OPENAI_API_KEY),
    getValue(tenantId, KEYS.BOT_ANTHROPIC_API_KEY),
    getValue(tenantId, KEYS.BOT_GOOGLE_API_KEY),
    getValue(tenantId, KEYS.BOT_DEFAULT_PROVIDER),
    getValue(tenantId, KEYS.BOT_ENABLED),
    getValue(tenantId, KEYS.BOT_N8N_WEBHOOK_URL),
    getValue(tenantId, KEYS.BOT_SYSTEM_PROMPT),
    getValue(tenantId, KEYS.BOT_MODEL),
    getValue(tenantId, KEYS.BOT_TEMPERATURE),
    getValue(tenantId, KEYS.BOT_MAX_TOKENS),
  ]);

  const appBase = resolveAppBaseUrl(baseUrl, request?.headers);

  const webhookUrl = `${appBase.replace(/\/$/, "")}/api/webhook/whatsapp`;

  const validProvider: BotProvider =
    botProvider === "openai" || botProvider === "anthropic" || botProvider === "google" ? botProvider : "openai";

  return {
    whatsapp: {
      accessToken: "",
      accessTokenMasked: !!accessToken,
      phoneNumberId: phoneNumberId ?? "",
      businessAccountId: businessAccountId ?? "",
      webhookVerifyToken: webhookVerifyToken ?? "",
      appSecretMasked: !!whatsappAppSecret,
      metaAppId: whatsappMetaAppId ?? "",
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

export async function saveWhatsAppConfig(tenantId: string, data: Partial<WhatsAppConfig & { appSecret?: string }>): Promise<void> {
  const updates: Array<[string, string | null]> = [];
  if (data.accessToken !== undefined && data.accessToken.trim() !== "") {
    updates.push([KEYS.WHATSAPP_ACCESS_TOKEN, data.accessToken.trim()]);
  }
  if (data.phoneNumberId !== undefined) updates.push([KEYS.WHATSAPP_PHONE_NUMBER_ID, data.phoneNumberId || null]);
  if (data.businessAccountId !== undefined) updates.push([KEYS.WHATSAPP_BUSINESS_ACCOUNT_ID, data.businessAccountId || null]);
  if (data.webhookVerifyToken !== undefined) updates.push([KEYS.WHATSAPP_WEBHOOK_VERIFY_TOKEN, data.webhookVerifyToken || null]);
  if (data.metaAppId !== undefined) {
    if (data.metaAppId.trim() === "") {
      await setValue(tenantId, KEYS.WHATSAPP_META_APP_ID, null);
    } else {
      updates.push([KEYS.WHATSAPP_META_APP_ID, data.metaAppId.trim()]);
    }
  }
  if (data.appSecret !== undefined) {
    if (data.appSecret.trim() === "") {
      await setValue(tenantId, KEYS.WHATSAPP_APP_SECRET, null);
    } else {
      updates.push([KEYS.WHATSAPP_APP_SECRET, data.appSecret.trim()]);
    }
  }
  if (data.enabled !== undefined) updates.push([KEYS.WHATSAPP_ENABLED, data.enabled ? "true" : "false"]);

  for (const [key, value] of updates) {
    await setValue(tenantId, key, value);
  }
}

export async function saveAppBaseUrl(tenantId: string, url: string): Promise<void> {
  await setValue(tenantId, KEYS.APP_BASE_URL, url && url.trim() ? url.trim() : null);
}

export async function saveBotConfig(tenantId: string, data: Partial<BotConfig>): Promise<void> {
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
    await setValue(tenantId, key, value);
  }
}

export async function getBotAICredentials(tenantId: string): Promise<{
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
    getValue(tenantId, KEYS.BOT_OPENAI_API_KEY),
    getValue(tenantId, KEYS.BOT_ANTHROPIC_API_KEY),
    getValue(tenantId, KEYS.BOT_GOOGLE_API_KEY),
    getValue(tenantId, KEYS.BOT_DEFAULT_PROVIDER),
    getValue(tenantId, KEYS.BOT_ENABLED),
    getValue(tenantId, KEYS.BOT_SYSTEM_PROMPT),
    getValue(tenantId, KEYS.BOT_MODEL),
    getValue(tenantId, KEYS.BOT_TEMPERATURE),
    getValue(tenantId, KEYS.BOT_MAX_TOKENS),
  ]);
  if (enabled !== "true") return null;

  const p: BotProvider = provider === "anthropic" || provider === "google" ? provider : "openai";

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

export async function getBatchConfig(tenantId: string): Promise<BotBatchConfig> {
  const raw = await getValue(tenantId, KEYS.BOT_BATCH_CONFIG);
  if (!raw) return DEFAULT_BATCH_CONFIG;
  try {
    const parsed = JSON.parse(raw) as Partial<BotBatchConfig>;
    return {
      enabled: parsed.enabled ?? DEFAULT_BATCH_CONFIG.enabled,
      delayMs:
        typeof parsed.delayMs === "number" ? Math.max(500, Math.min(30000, parsed.delayMs)) : DEFAULT_BATCH_CONFIG.delayMs,
      maxBatchSize:
        typeof parsed.maxBatchSize === "number" ? Math.max(1, Math.min(50, parsed.maxBatchSize)) : DEFAULT_BATCH_CONFIG.maxBatchSize,
    };
  } catch {
    return DEFAULT_BATCH_CONFIG;
  }
}

export async function setBatchConfig(tenantId: string, config: Partial<BotBatchConfig>): Promise<BotBatchConfig> {
  const current = await getBatchConfig(tenantId);
  const next: BotBatchConfig = {
    enabled: config.enabled ?? current.enabled,
    delayMs: config.delayMs !== undefined ? Math.max(500, Math.min(30000, config.delayMs)) : current.delayMs,
    maxBatchSize: config.maxBatchSize !== undefined ? Math.max(1, Math.min(50, config.maxBatchSize)) : current.maxBatchSize,
  };
  await setValue(tenantId, KEYS.BOT_BATCH_CONFIG, JSON.stringify(next));
  return next;
}
