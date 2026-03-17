import type { BotProvider } from "./config";

type AIMessage = { role: "system" | "user" | "assistant"; content: string };

type AIParams = {
  openaiKey: string | null;
  anthropicKey: string | null;
  googleKey: string | null;
  model?: string;
  temperature?: number;
  maxTokens?: number;
};

export async function callAI(
  provider: BotProvider,
  messages: AIMessage[],
  credentials: AIParams
): Promise<string> {
  const temp = credentials.temperature ?? 0.7;
  const maxTok = credentials.maxTokens ?? 1024;

  if (provider === "openai" && credentials.openaiKey) {
    return callOpenAI(messages, credentials.openaiKey, credentials.model, temp, maxTok);
  }
  if (provider === "anthropic" && credentials.anthropicKey) {
    return callAnthropic(messages, credentials.anthropicKey, credentials.model, temp, maxTok);
  }
  if (provider === "google" && credentials.googleKey) {
    return callGoogle(messages, credentials.googleKey, credentials.model, temp, maxTok);
  }
  throw new Error(`Proveedor ${provider} no configurado o sin API key`);
}

async function callOpenAI(
  messages: AIMessage[],
  apiKey: string,
  model?: string,
  temperature = 0.7,
  maxTokens = 1024
): Promise<string> {
  const system = messages.find((m) => m.role === "system");
  const rest = messages.filter((m) => m.role !== "system");
  const body = system
    ? [{ role: "system" as const, content: system.content }, ...rest]
    : rest;

  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || "gpt-4o-mini",
      messages: body,
      max_tokens: maxTokens,
      temperature,
    }),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err.error?.message ?? `OpenAI: ${r.status}`);
  }
  const data = await r.json();
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

async function callAnthropic(
  messages: AIMessage[],
  apiKey: string,
  model?: string,
  _temperature = 0.7, // eslint-disable-line @typescript-eslint/no-unused-vars
  maxTokens = 1024
): Promise<string> {
  const system = messages.find((m) => m.role === "system");
  const rest = messages.filter((m) => m.role !== "system");

  const r = await fetch(
    "https://api.anthropic.com/v1/messages?anthropic-version=2023-06-01",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: model || "claude-3-5-haiku-20241022",
        max_tokens: maxTokens,
        system: system?.content ?? "Eres un asistente útil.",
        messages: rest.map((m) => ({ role: m.role, content: m.content })),
      }),
    }
  );
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err.error?.message ?? `Anthropic: ${r.status}`);
  }
  const data = await r.json();
  const block = data.content?.find((c: { type: string }) => c.type === "text");
  return block?.text?.trim() ?? "";
}

async function callGoogle(
  messages: AIMessage[],
  apiKey: string,
  model?: string,
  temperature = 0.7,
  maxTokens = 1024
): Promise<string> {
  const system = messages.find((m) => m.role === "system");
  const rest = messages.filter((m) => m.role !== "system");
  const contents = rest.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const modelId = model || "gemini-1.5-flash";
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system?.content ?? "Eres un asistente útil." }] },
        contents,
        generationConfig: { maxOutputTokens: maxTokens, temperature },
      }),
    }
  );
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err.error?.message ?? `Google: ${r.status}`);
  }
  const data = await r.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  return text?.trim() ?? "";
}
