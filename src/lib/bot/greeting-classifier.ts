/**
 * Clasificador híbrido de saludo: la IA interpreta si el mensaje es un saludo
 * (hola, buenos días, qué tal, hi, etc.). No usa regex fijo; la IA decide.
 * Sirve para inyectar contexto de saludo profesional cuando el usuario saluda.
 */
import { callAI } from "@/lib/ai";
import type { BotProvider } from "@/lib/config";
import { botLog } from "./bot-logger";

export type GreetingClassifierCreds = {
  provider: BotProvider;
  openaiKey: string | null;
  anthropicKey: string | null;
  googleKey: string | null;
  model?: string;
};

/**
 * Clasificador IA: interpreta si el mensaje del cliente es un saludo.
 * La IA decide (no regex). Responde SI o NO. Fallback: false si falla.
 */
export async function classifyIsGreeting(
  message: string,
  creds: GreetingClassifierCreds,
  conversationId?: string
): Promise<boolean> {
  const trimmed = message.trim();
  if (!trimmed || trimmed.length < 2) return false;

  try {
    const response = await callAI(
      creds.provider,
      [
        {
          role: "system",
          content:
            "Eres un clasificador. Solo responde SI o NO. ¿El mensaje del cliente es un saludo o apertura de conversación? (hola, buenos días, qué tal, hi, hey, saludos, buen día, etc.). Responde únicamente SI o NO.",
        },
        {
          role: "user",
          content: `Mensaje del cliente: "${trimmed.slice(0, 200)}"`,
        },
      ],
      {
        openaiKey: creds.openaiKey,
        anthropicKey: creds.anthropicKey,
        googleKey: creds.googleKey,
        model: creds.model,
        temperature: 0,
        maxTokens: 10,
      }
    );

    const normalized = response.trim().toLowerCase();
    const isGreeting =
      /^\s*si\s*$/i.test(normalized) ||
      /^\s*yes\s*$/i.test(normalized) ||
      normalized.startsWith("si") ||
      normalized.startsWith("yes");

    void botLog("info", "other", "Clasificación saludo IA ejecutada", {
      conversationId,
      metadata: { messagePreview: trimmed.slice(0, 50), isGreeting, responsePreview: response.slice(0, 20) },
    });

    return isGreeting;
  } catch (e) {
    void botLog("warn", "other", "Clasificador saludo falló, asumiendo no es saludo", {
      conversationId,
      metadata: { error: e instanceof Error ? e.message : String(e) },
    });
    return false;
  }
}
