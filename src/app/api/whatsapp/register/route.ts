import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getWhatsAppConfig } from "@/lib/config";

const SUPER_ADMIN_ROLES = ["super_admin"];

/**
 * POST /api/whatsapp/register
 * Registra el número de teléfono con la API de Meta para pasar de "Pendiente" a activo.
 * Solo super_admin. Usa el token y Phone Number ID ya configurados.
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!SUPER_ADMIN_ROLES.includes(session.role)) {
    return NextResponse.json({ error: "Solo super administradores" }, { status: 403 });
  }

  const config = await getWhatsAppConfig();
  if (!config.accessToken || !config.phoneNumberId) {
    return NextResponse.json(
      { error: "Configura Access Token y Phone Number ID en Configuración primero" },
      { status: 400 }
    );
  }

  let pin: string | undefined;
  const cl = request.headers.get("content-length");
  if (cl && parseInt(cl, 10) > 0) {
    try {
      const body = (await request.json()) as { pin?: string };
      pin = body?.pin?.trim();
    } catch {
      // Body inválido
    }
  }
  const payload: { messaging_product: string; pin?: string } = { messaging_product: "whatsapp" };
  if (pin) payload.pin = pin;

  const url = `https://graph.facebook.com/v21.0/${config.phoneNumberId}/register`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      error?: { message: string; code?: number };
    };

    if (!res.ok) {
      const msg = data.error?.message ?? `HTTP ${res.status}`;
      return NextResponse.json(
        { error: msg, details: data },
        { status: res.status >= 400 ? res.status : 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Número registrado correctamente. Verifica en Meta si el estado pasó de Pendiente a activo.",
    });
  } catch (err) {
    console.error("[WhatsApp Register] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al registrar" },
      { status: 500 }
    );
  }
}
