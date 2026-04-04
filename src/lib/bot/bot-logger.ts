import { prisma } from "@/lib/db";

export type BotLogLevel = "info" | "warn" | "error" | "debug";

export type BotLogStage =
  | "webhook"
  | "router"
  | "batch"
  | "main_brain"
  | "sales_flow"
  | "product_response"
  | "whatsapp_send"
  | "send_image"
  | "handoff"
  | "flow"
  | "conversation_memory"
  | "product_detail"
  | "product_selection"
  | "scope_guard"
  | "promise_fulfillment"
  | "upload"
  | "other";

export interface BotLogContext {
  /** Si no se indica, se usa tenant_default (logs de rutas sin contexto de organización). */
  tenantId?: string;
  conversationId?: string;
  contactId?: string;
  phone?: string;
  metadata?: Record<string, unknown>;
  error?: string | Error;
}

/** Registra en BD de forma no bloqueante. Si falla el insert, solo loguea a consola. */
export async function botLog(
  level: BotLogLevel,
  stage: BotLogStage,
  message: string,
  ctx?: BotLogContext
): Promise<void> {
  const errorStr = ctx?.error
    ? typeof ctx.error === "string"
      ? ctx.error
      : ctx.error?.message ?? String(ctx.error)
    : null;

  try {
    await prisma.botLog.create({
      data: {
        tenantId: ctx?.tenantId ?? "tenant_default",
        level,
        stage,
        message,
        conversationId: ctx?.conversationId ?? null,
        contactId: ctx?.contactId ?? null,
        phone: ctx?.phone ?? null,
        metadata: ctx?.metadata ? JSON.stringify(ctx.metadata) : null,
        error: errorStr ?? null,
      },
    });
  } catch (e) {
    // No romper el flujo: fallback a consola
    console.error("[BotLog] DB insert failed:", e);
    console.error("[BotLog]", level, stage, message, ctx);
  }
}
