import { prisma } from "@/lib/db";
import { botLog } from "./bot-logger";

type FlowNode = { id: string; type?: string; data?: Record<string, unknown> };
type FlowEdge = { source: string; target: string };
type FlowJson = { nodes?: FlowNode[]; edges?: FlowEdge[] };

export type FlowContext = {
  tenantId: string;
  isFirstMessage: boolean;
  messageCountFromContact: number;
  lastMessageText: string;
};

export type FlowResult =
  | { type: "respond"; text: string }
  | { type: "ai_chat" }
  | null;

/**
 * Evalúa los flujos activos con el contexto dado.
 * - trigger → condition (first_message) → respond (saludo) o ai_chat
 * - trigger → respond (respuesta fija)
 * - trigger → ai_chat (delega en IA)
 * Devuelve la primera coincidencia o null para usar IA por defecto.
 */
export async function getFlowResult(context: FlowContext): Promise<FlowResult> {
  const flows = await prisma.botFlow.findMany({
    where: { isActive: true, tenantId: context.tenantId },
    orderBy: { updatedAt: "desc" },
  });

  void botLog("info", "flow", "getFlowResult: evaluando flujos", {
    metadata: {
      activeFlowsCount: flows.length,
      isFirstMessage: context.isFirstMessage,
      messageCountFromContact: context.messageCountFromContact,
      lastMessagePreview: context.lastMessageText.slice(0, 80),
    },
  });

  for (const flow of flows) {
    try {
      const parsed: FlowJson =
        typeof flow.flowJson === "string" ? JSON.parse(flow.flowJson) : flow.flowJson;
      const nodes = parsed.nodes ?? [];
      const edges = parsed.edges ?? [];

      const trigger = nodes.find((n) => (n.type ?? "").toLowerCase() === "trigger");
      if (!trigger) continue;

      // Siguientes nodos desde trigger
      const nextFromTrigger = edges.filter((e) => e.source === trigger.id).map((e) => e.target);
      if (nextFromTrigger.length === 0) continue;

      // ¿Hay un nodo condition?
      const conditionNode = nodes.find((n) => (n.type ?? "").toLowerCase() === "condition");
      const respondNode = nodes.find((n) => (n.type ?? "").toLowerCase() === "respond");
      const aiChatNode = nodes.find((n) => (n.type ?? "").toLowerCase() === "ai_chat");

      if (conditionNode && nextFromTrigger.includes(conditionNode.id)) {
        const cond = String(conditionNode.data?.condition ?? "").toLowerCase();
        const edgesFromCond = edges.filter((e) => e.source === conditionNode.id);
        if (cond === "first_message" || cond === "firstmessage") {
          if (context.isFirstMessage && respondNode && edgesFromCond.some((e) => e.target === respondNode.id)) {
            const text = respondNode.data?.text ?? respondNode.data?.message;
            if (typeof text === "string" && text.trim()) {
              void botLog("info", "flow", "Flow matched: condition first_message → respond", {
                metadata: { flowId: flow.id, flowName: flow.name, textPreview: text.trim().slice(0, 60) },
              });
              return { type: "respond", text: text.trim() };
            }
          }
          if (aiChatNode && edgesFromCond.some((e) => e.target === aiChatNode.id)) {
            void botLog("info", "flow", "Flow matched: condition first_message → ai_chat", {
              metadata: { flowId: flow.id, flowName: flow.name },
            });
            return { type: "ai_chat" };
          }
        }
      }

      // trigger → respond directo
      if (nextFromTrigger.includes(respondNode?.id ?? "") && respondNode) {
        const text = respondNode.data?.text ?? respondNode.data?.message;
        if (typeof text === "string" && text.trim()) {
          void botLog("info", "flow", "Flow matched: trigger → respond directo", {
            metadata: { flowId: flow.id, flowName: flow.name, textPreview: text.trim().slice(0, 60) },
          });
          return { type: "respond", text: text.trim() };
        }
      }

      // trigger → ai_chat
      if (nextFromTrigger.includes(aiChatNode?.id ?? "") && aiChatNode) {
        void botLog("info", "flow", "Flow matched: trigger → ai_chat", {
          metadata: { flowId: flow.id, flowName: flow.name },
        });
        return { type: "ai_chat" };
      }
    } catch (e) {
      void botLog("warn", "flow", "Flow JSON inválido o estructura distinta", {
        metadata: { flowId: flow.id, flowName: flow.name, error: e instanceof Error ? e.message : String(e) },
      });
    }
  }
  void botLog("info", "flow", "Ningún flow matcheó: usando IA por defecto", {
    metadata: { flowsEvaluated: flows.length },
  });
  return null;
}

/**
 * Compatibilidad: devuelve solo el texto si el flujo resulta en "respond", sino null.
 * Usar getFlowResult cuando se necesite distinguir respond vs ai_chat.
 */
export async function getFlowReply(context?: FlowContext): Promise<string | null> {
  const ctx = context ?? {
    tenantId: "tenant_default",
    isFirstMessage: false,
    messageCountFromContact: 1,
    lastMessageText: "",
  };
  const result = await getFlowResult(ctx);
  return result?.type === "respond" ? result.text : null;
}
