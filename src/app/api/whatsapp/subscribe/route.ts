import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getWhatsAppConfig } from "@/lib/config";

const SUPER_ADMIN_ROLES = ["super_admin"];
const GRAPH_API = "https://graph.facebook.com/v21.0";

/**
 * POST /api/whatsapp/subscribe
 * Suscribe la app a la WABA para recibir webhooks (mensajes entrantes).
 * Meta exige este paso para que los mensajes lleguen a nuestro webhook.
 */
export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!SUPER_ADMIN_ROLES.includes(session.role)) {
    return NextResponse.json({ error: "Solo super administradores" }, { status: 403 });
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

  const url = `${GRAPH_API}/${config.businessAccountId}/subscribed_apps`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

    const data = (await res.json().catch(() => ({}))) as { success?: boolean; error?: { message: string } };

    if (!res.ok) {
      return NextResponse.json(
        { error: data.error?.message ?? `HTTP ${res.status}`, details: data },
        { status: res.status >= 400 ? res.status : 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "App suscrita. Los mensajes entrantes deberían llegar ahora. Envía un mensaje de prueba.",
    });
  } catch (err) {
    console.error("[WhatsApp Subscribe] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al suscribir" },
      { status: 500 }
    );
  }
}
