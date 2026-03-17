import type { BotProvider } from "./config";

/** Parte de contenido: texto o medio (imagen, audio, video) */
export type ContentPart =
  | { type: "text"; text: string }
  | { type: "image"; base64: string; mimeType: string }
  | { type: "audio"; base64: string; mimeType: string }
  | { type: "video"; base64: string; mimeType: string };

export type AIMessageMultimodal = {
  role: "system" | "user" | "assistant";
  content: string | ContentPart[];
};

export type AIParams = {
  openaiKey: string | null;
  anthropicKey: string | null;
  googleKey: string | null;
  model?: string;
  temperature?: number;
  maxTokens?: number;
};

/**
 * Transcribe audio con OpenAI Whisper.
 * Requiere openaiKey.
 */
export async function transcribeAudio(
  base64: string,
  mimeType: string,
  openaiKey: string
): Promise<string> {
  const buffer = Buffer.from(base64, "base64");
  const ext = mimeType.includes("ogg") ? "ogg" : mimeType.includes("mp3") ? "mp3" : "webm";
  const formData = new FormData();
  formData.append("file", new Blob([buffer], { type: mimeType }), `audio.${ext}`);
  formData.append("model", "whisper-1");
  formData.append("response_format", "text");

  const r = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${openaiKey}` },
    body: formData,
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err.error?.message ?? `Whisper: ${r.status}`);
  }
  return (await r.text()).trim();
}

/**
 * Convierte mensajes multimodales a texto cuando hay audio/video.
 * Para audio: transcribe con Whisper si hay OpenAI key.
 * Para video: intenta con el proveedor nativo; si no, extraemos descripción genérica.
 */
export async function resolveContentForAI(
  parts: ContentPart[],
  creds: { openaiKey: string | null; provider: BotProvider; googleKey: string | null }
): Promise<ContentPart[]> {
  const resolved: ContentPart[] = [];
  for (const p of parts) {
    if (p.type === "text") {
      resolved.push(p);
      continue;
    }
    if (p.type === "audio") {
      if (creds.openaiKey) {
        try {
          const text = await transcribeAudio(p.base64, p.mimeType, creds.openaiKey);
          resolved.push({ type: "text", text: `[Mensaje de voz transcrito]: ${text}` });
        } catch {
          resolved.push({ type: "text", text: "[Audio recibido pero no pude transcribirlo]" });
        }
      } else if (creds.provider === "google" && creds.googleKey) {
        resolved.push(p);
      } else {
        resolved.push({ type: "text", text: "[Mensaje de voz recibido. Por favor escribe tu mensaje para continuar.]" });
      }
      continue;
    }
    if (p.type === "video") {
      if (creds.provider === "google" && creds.googleKey) {
        resolved.push(p);
      } else {
        resolved.push({
          type: "text",
          text: "[El cliente te envió un video. Responde en español de forma amable: di que lo recibiste y pregúntale en qué puedes ayudarle, o invítalo a escribir si necesita algo. NUNCA digas que no puedes ver o procesar el video.]",
        });
      }
      continue;
    }
    resolved.push(p);
  }
  return resolved;
}

function isMultimodal(msg: AIMessageMultimodal): msg is AIMessageMultimodal & { content: ContentPart[] } {
  return Array.isArray(msg.content);
}

export async function callAIMultimodal(
  provider: BotProvider,
  messages: AIMessageMultimodal[],
  credentials: AIParams
): Promise<string> {
  const temp = credentials.temperature ?? 0.7;
  const maxTok = credentials.maxTokens ?? 1024;

  const resolvedMessages = await Promise.all(
    messages.map(async (m) => {
      if (!isMultimodal(m)) return m;
      const resolved = await resolveContentForAI(m.content, {
        openaiKey: credentials.openaiKey,
        provider,
        googleKey: credentials.googleKey,
      });
      return { ...m, content: resolved };
    })
  );

  if (provider === "openai" && credentials.openaiKey) {
    return callOpenAIMultimodal(resolvedMessages, credentials.openaiKey, credentials.model, temp, maxTok);
  }
  if (provider === "anthropic" && credentials.anthropicKey) {
    return callAnthropicMultimodal(resolvedMessages, credentials.anthropicKey, credentials.model, temp, maxTok);
  }
  if (provider === "google" && credentials.googleKey) {
    return callGoogleMultimodal(resolvedMessages, credentials.googleKey, credentials.model, temp, maxTok);
  }
  throw new Error(`Proveedor ${provider} no configurado o sin API key`);
}

function buildOpenAIContent(parts: ContentPart[]): unknown[] {
  const out: unknown[] = [];
  for (const p of parts) {
    if (p.type === "text") {
      out.push({ type: "text", text: p.text });
    } else if (p.type === "image") {
      out.push({
        type: "image_url",
        image_url: { url: `data:${p.mimeType};base64,${p.base64}` },
      });
    }
  }
  return out;
}

function buildAnthropicContent(parts: ContentPart[]): unknown[] {
  const out: unknown[] = [];
  for (const p of parts) {
    if (p.type === "text") {
      out.push({ type: "text", text: p.text });
    } else if (p.type === "image" || p.type === "video") {
      out.push({
        type: "image",
        source: {
          type: "base64",
          media_type: p.mimeType,
          data: p.base64,
        },
      });
    }
  }
  return out;
}

function buildGoogleParts(parts: ContentPart[]): unknown[] {
  const out: unknown[] = [];
  for (const p of parts) {
    if (p.type === "text") {
      out.push({ text: p.text });
    } else if (p.type === "image" || p.type === "video" || p.type === "audio") {
      out.push({
        inlineData: {
          mimeType: p.mimeType,
          data: p.base64,
        },
      });
    }
  }
  return out;
}

async function callOpenAIMultimodal(
  messages: AIMessageMultimodal[],
  apiKey: string,
  model?: string,
  temperature = 0.7,
  maxTokens = 1024
): Promise<string> {
  const system = messages.find((m) => m.role === "system");
  const rest = messages.filter((m) => m.role !== "system");

  const toContent = (m: AIMessageMultimodal): unknown => {
    if (typeof m.content === "string") return m.content;
    const built = buildOpenAIContent(m.content);
    if (built.length === 1 && built[0] && typeof (built[0] as { text?: string }).text === "string") {
      return (built[0] as { text: string }).text;
    }
    return built.length ? built : "";
  };

  const body = system
    ? [
        { role: "system" as const, content: toContent(system) },
        ...rest.map((m) => ({ role: m.role, content: toContent(m) })),
      ]
    : rest.map((m) => ({ role: m.role, content: toContent(m) }));

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

async function callAnthropicMultimodal(
  messages: AIMessageMultimodal[],
  apiKey: string,
  model?: string,
  _temperature = 0.7, // eslint-disable-line @typescript-eslint/no-unused-vars
  maxTokens = 1024
): Promise<string> {
  const system = messages.find((m) => m.role === "system");
  const rest = messages.filter((m) => m.role !== "system");

  const toContent = (m: AIMessageMultimodal): unknown => {
    if (typeof m.content === "string") return [{ type: "text", text: m.content }];
    return buildAnthropicContent(m.content);
  };

  const systemText =
    typeof system?.content === "string"
      ? system.content
      : (system?.content ?? [])
          .filter((c): c is ContentPart & { type: "text" } => c.type === "text")
          .map((c) => c.text)
          .join("\n") || "Eres un asistente útil.";

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
        system: systemText,
        messages: rest.map((m) => ({ role: m.role, content: toContent(m) })),
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

async function callGoogleMultimodal(
  messages: AIMessageMultimodal[],
  apiKey: string,
  model?: string,
  temperature = 0.7,
  maxTokens = 1024
): Promise<string> {
  const system = messages.find((m) => m.role === "system");
  const rest = messages.filter((m) => m.role !== "system");

  const toParts = (m: AIMessageMultimodal): unknown[] => {
    if (typeof m.content === "string") return [{ text: m.content }];
    return buildGoogleParts(m.content);
  };

  const contents = rest.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: toParts(m),
  }));

  const systemParts = system
    ? (typeof system.content === "string"
        ? [{ text: system.content }]
        : buildGoogleParts(system.content))
    : [{ text: "Eres un asistente útil." }];

  const modelId = model || "gemini-1.5-flash";
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: systemParts },
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
