import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getWhatsAppConfig } from "@/lib/config";

const GRAPH_API = "https://graph.facebook.com/v21.0";

export type WhatsAppTemplate = {
  id: string;
  name: string;
  status: "APPROVED" | "PENDING" | "REJECTED" | "IN_APPEAL" | "PAUSED" | "disabled";
  category: string;
  language: string;
  components?: Array<{
    type: string;
    text?: string;
    format?: string;
    example?: { body_text?: string[][] };
    buttons?: Array<{ type: string; text?: string }>;
  }>;
  quality_score?: string;
  rejected_reason?: string;
};

/**
 * GET /api/whatsapp/templates
 * Obtiene las plantillas de mensajes de WhatsApp desde la API de Meta.
 */
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!session.tenantId) {
    return NextResponse.json({ error: "Se requiere cuenta de organización" }, { status: 403 });
  }

  const config = await getWhatsAppConfig(session.tenantId);
  if (!config.accessToken || !config.businessAccountId) {
    return NextResponse.json(
      { error: "Configura Access Token y Business Account ID en Configuración" },
      { status: 400 }
    );
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || undefined;
  const language = searchParams.get("language") || undefined;
  const category = searchParams.get("category") || undefined;
  const name = searchParams.get("name") || undefined;

  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (language) params.set("language", language);
  if (category) params.set("category", category);
  if (name) params.set("name", name);

  const url = `${GRAPH_API}/${config.businessAccountId}/message_templates${params.toString() ? `?${params}` : ""}`;

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
      },
    });

    const data = (await res.json().catch(() => ({}))) as {
      data?: WhatsAppTemplate[];
      paging?: { cursors?: { before?: string; after?: string }; next?: string };
      error?: { message: string; code?: number };
    };

    if (!res.ok) {
      return NextResponse.json(
        { error: data.error?.message ?? `HTTP ${res.status}`, details: data },
        { status: res.status >= 400 ? res.status : 500 }
      );
    }

    return NextResponse.json({
      templates: data.data ?? [],
      paging: data.paging ?? null,
    });
  } catch (err) {
    console.error("[WhatsApp Templates] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al obtener plantillas" },
      { status: 500 }
    );
  }
}
