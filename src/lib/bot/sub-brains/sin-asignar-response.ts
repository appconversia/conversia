import { callAI } from "@/lib/ai";
import { getBotAICredentials } from "@/lib/config";
import { botLog } from "../bot-logger";

const FALLBACK_SIN_ASIGNAR = "Tu solicitud ya está en proceso. Un asesor te atenderá pronto. ✨";

/**
 * Genera una respuesta contextual con IA para conversaciones en estado "Sin asignar".
 * Varía la redacción según lo que escribió el cliente y usa su nombre.
 * Fallback a mensaje fijo si la IA falla o no hay credenciales.
 */
export async function generateSinAsignarResponse(
  tenantId: string,
  lastMessageText: string,
  contactName?: string | null
): Promise<string> {
  const creds = await getBotAICredentials(tenantId);
  if (!creds) {
    return FALLBACK_SIN_ASIGNAR;
  }

  const nameHint = contactName?.trim()
    ? `El cliente se llama ${contactName.trim()}. Incluye su nombre de forma natural en tu respuesta.`
    : "No tenemos el nombre del cliente.";

  const systemPrompt = `Eres el asistente de WhatsApp. La conversación está en cola de asesores (sin asignar): el cliente ya solicitó ayuda y espera a un asesor humano. Está calificado, no necesitas saludarlo.

Tu única tarea: genera UNA respuesta corta (máximo 100 caracteres) que:
1. Reconozca o responda a lo que el cliente acaba de escribir (pregunta, comentario, queja, etc.)
2. ${nameHint}
3. Lo tranquilice que un asesor lo atenderá pronto
4. Varía la redacción según el mensaje. No repitas siempre lo mismo.
5. Tono cercano, natural, sin fórmulas. Un emoji al final si encaja (✨).
6. NO saludes: NO digas hola, buenos días, buenas tardes ni nada similar. El usuario ya está en cola.
7. Responde ÚNICAMENTE el texto del mensaje, nada más. Sin comillas.`;

  const userPrompt = `El cliente escribió: "${lastMessageText.slice(0, 200)}"

Genera la respuesta corta (máx 100 caracteres):`;

  try {
    const response = await callAI(creds.provider, [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ], {
      openaiKey: creds.openaiKey,
      anthropicKey: creds.anthropicKey,
      googleKey: creds.googleKey,
      model: creds.model,
      temperature: 0.7,
      maxTokens: 150,
    });

    const cleaned = response.trim().replace(/^["']|["']$/g, "").slice(0, 120);
    if (cleaned.length >= 10) {
      void botLog("info", "main_brain", "Sin asignar: respuesta IA generada", {
        metadata: { preview: cleaned.slice(0, 60), contactName: contactName ?? undefined },
      });
      return cleaned;
    }
  } catch (e) {
    void botLog("warn", "main_brain", "Sin asignar: IA falló, usando fallback", {
      metadata: { error: e instanceof Error ? e.message : String(e) },
    });
  }
  return FALLBACK_SIN_ASIGNAR;
}
