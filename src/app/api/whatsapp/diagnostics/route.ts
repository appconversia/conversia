import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getWhatsAppConfig } from "@/lib/config";

const SUPER_ADMIN_ROLES = ["super_admin"];
const GRAPH_API = "https://graph.facebook.com/v21.0";

/**
 * GET /api/whatsapp/diagnostics
 * Ejecuta diagnóstico: token, registro, permisos. Solo super_admin.
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!SUPER_ADMIN_ROLES.includes(session.role)) {
    return NextResponse.json({ error: "Solo super administradores" }, { status: 403 });
  }

  const config = await getWhatsAppConfig();
  const results: Record<string, { ok: boolean; message: string; details?: unknown }> = {};

  if (!config.accessToken || !config.phoneNumberId) {
    return NextResponse.json({
      ok: false,
      error: "Falta Access Token o Phone Number ID en Configuración",
      results: {},
    });
  }

  // 1. Verificar token (debug_token o me)
  try {
    const r = await fetch(
      `${GRAPH_API}/me?fields=id,name&access_token=${config.accessToken}`
    );
    const data = (await r.json().catch(() => ({}))) as { id?: string; name?: string; error?: { message: string } };
    if (data.error) {
      results.token = { ok: false, message: data.error.message, details: data };
    } else {
      results.token = { ok: true, message: `Token válido (${data.name || data.id || "OK"})` };
    }
  } catch (e) {
    results.token = { ok: false, message: e instanceof Error ? e.message : "Error", details: String(e) };
  }

  // 2. Obtener info del número
  try {
    const r = await fetch(
      `${GRAPH_API}/${config.phoneNumberId}?fields=verified_name,display_phone_number`,
      { headers: { Authorization: `Bearer ${config.accessToken}` } }
    );
    const data = (await r.json().catch(() => ({}))) as {
      verified_name?: string;
      display_phone_number?: string;
      error?: { message: string; code?: number };
    };
    if (data.error) {
      results.phoneInfo = { ok: false, message: data.error.message, details: data };
    } else {
      results.phoneInfo = {
        ok: true,
        message: `${data.display_phone_number || "N/A"} | ${data.verified_name || "Sin nombre verificado"}`,
        details: data,
      };
    }
  } catch (e) {
    results.phoneInfo = { ok: false, message: e instanceof Error ? e.message : "Error", details: String(e) };
  }

  // 3. Suscribir app a WABA (webhooks)
  if (config.businessAccountId) {
    try {
      const subRes = await fetch(
        `${GRAPH_API}/${config.businessAccountId}/subscribed_apps`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.accessToken}`,
            "Content-Type": "application/json",
          },
          body: "{}",
        }
      );
      const subData = (await subRes.json().catch(() => ({}))) as { success?: boolean; error?: { message: string } };
      if (subRes.ok) {
        results.subscribe = { ok: true, message: "App suscrita a webhooks" };
      } else {
        results.subscribe = {
          ok: false,
          message: subData.error?.message ?? `HTTP ${subRes.status}`,
          details: subData,
        };
      }
    } catch (e) {
      results.subscribe = { ok: false, message: e instanceof Error ? e.message : "Error" };
    }
  }

  // 4. Intentar registro
  try {
    const r = await fetch(`${GRAPH_API}/${config.phoneNumberId}/register`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messaging_product: "whatsapp" }),
    });
    const data = (await r.json().catch(() => ({}))) as { success?: boolean; error?: { message: string; code?: number } };
    if (!r.ok) {
      const msg = data.error?.message ?? `HTTP ${r.status}`;
      results.register = {
        ok: false,
        message: msg,
        details: data,
      };
      // Si pide PIN de 2FA, código 100 o similar
      if (msg.toLowerCase().includes("pin") || data.error?.code === 100) {
        results.register.message += " — Si tienes 2FA, usa el botón Registrar con PIN en Configuración.";
      }
    } else {
      results.register = { ok: true, message: "Registro ejecutado. Verifica en Meta si el estado cambió." };
    }
  } catch (e) {
    results.register = { ok: false, message: e instanceof Error ? e.message : "Error", details: String(e) };
  }

  const allOk = Object.values(results).every((r) => r.ok);

  return NextResponse.json({
    ok: allOk,
    results,
    hints: getHints(results),
  });
}

function getHints(results: Record<string, { ok: boolean; message: string }>): string[] {
  const hints: string[] = [];
  if (!results.token?.ok) {
    hints.push("Genera un nuevo token en Meta → WhatsApp → Getting started. Usa System User para producción.");
  }
  if (!results.subscribe?.ok && results.token?.ok) {
    hints.push("Suscribe la app a webhooks: haz clic en 'Suscribir webhook' para que los mensajes lleguen.");
  }
  hints.push("Si el número sigue en Pendiente: 1) En Meta Business Suite verifica el número con SMS/voz. 2) Si usas BSP/socio, ellos deben registrarlo.");
  if (!results.register?.ok && results.token?.ok) {
    hints.push("El registro falló pero el token es válido. Verifica que el número esté verificado (SMS/voz) en Meta.");
  }
  return hints;
}
