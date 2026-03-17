import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getWhatsAppConfig } from "@/lib/config";

const SUPER_ADMIN_ROLES = ["super_admin"];
const GRAPH_API = "https://graph.facebook.com/v21.0";

const VERTICAL_OPTIONS = [
  { value: "", label: "Sin categoría" },
  { value: "TRAVEL", label: "Viajes y transporte" },
  { value: "RETAIL", label: "Compras y retail" },
  { value: "RESTAURANT", label: "Restaurante" },
  { value: "PROF_SERVICES", label: "Servicios profesionales" },
  { value: "OTHER", label: "Otro" },
  { value: "NONPROFIT", label: "Sin fines de lucro" },
  { value: "HOTEL", label: "Hoteles y alojamiento" },
  { value: "HEALTH", label: "Salud y medicina" },
  { value: "GROCERY", label: "Alimentos y supermercado" },
  { value: "GOVT", label: "Servicio público" },
  { value: "FINANCE", label: "Finanzas y bancos" },
  { value: "EVENT_PLAN", label: "Organización de eventos" },
  { value: "ENTERTAIN", label: "Entretenimiento" },
  { value: "EDU", label: "Educación" },
  { value: "BEAUTY", label: "Belleza, spa y salón" },
  { value: "AUTO", label: "Automotriz" },
  { value: "APPAREL", label: "Ropa y moda" },
] as const;

export type BusinessProfileData = {
  about?: string;
  address?: string;
  description?: string;
  email?: string;
  profile_picture_url?: string;
  vertical?: string;
  websites?: string[];
};

/**
 * GET /api/whatsapp/business-profile
 * Obtiene el perfil de negocio desde Meta. Solo super_admin.
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
  if (!config.accessToken || !config.phoneNumberId) {
    return NextResponse.json(
      { error: "Configura WhatsApp (Access Token y Phone Number ID) en Configuración" },
      { status: 400 }
    );
  }

  try {
    const url = `${GRAPH_API}/${config.phoneNumberId}/whatsapp_business_profile?fields=about,address,description,email,profile_picture_url,vertical,websites`;
    const r = await fetch(url, {
      headers: { Authorization: `Bearer ${config.accessToken}` },
    });
    const data = (await r.json().catch(() => ({}))) as {
      data?: BusinessProfileData[];
      error?: { message: string; code?: number };
    };

    if (!r.ok) {
      return NextResponse.json(
        { error: data.error?.message ?? `Error ${r.status}` },
        { status: r.status >= 500 ? 502 : 400 }
      );
    }

    const profile = Array.isArray(data.data) && data.data.length > 0 ? data.data[0] : null;
    return NextResponse.json({
      profile: profile ?? {},
      verticalOptions: VERTICAL_OPTIONS,
    });
  } catch (e) {
    console.error("GET business-profile error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al obtener perfil" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/whatsapp/business-profile
 * Actualiza el perfil de negocio en Meta. Solo super_admin.
 */
export async function PUT(request: Request) {
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
      { error: "Configura WhatsApp (Access Token y Phone Number ID) en Configuración" },
      { status: 400 }
    );
  }

  try {
    const body = (await request.json()) as {
      about?: string;
      address?: string;
      description?: string;
      email?: string;
      vertical?: string;
      websites?: string[];
      profile_picture_handle?: string;
    };

    const payload: Record<string, unknown> = {
      messaging_product: "whatsapp",
    };

    if (body.about !== undefined) {
      const about = String(body.about ?? "").trim();
      if (about.length > 139) {
        return NextResponse.json({ error: "Acerca de: máximo 139 caracteres" }, { status: 400 });
      }
      payload.about = about || "";
    }
    if (body.address !== undefined) {
      const addr = String(body.address ?? "").trim();
      if (addr.length > 256) {
        return NextResponse.json({ error: "Dirección: máximo 256 caracteres" }, { status: 400 });
      }
      payload.address = addr;
    }
    if (body.description !== undefined) {
      const desc = String(body.description ?? "").trim();
      if (desc.length > 512) {
        return NextResponse.json({ error: "Descripción: máximo 512 caracteres" }, { status: 400 });
      }
      payload.description = desc;
    }
    if (body.email !== undefined) {
      const email = String(body.email ?? "").trim();
      if (email.length > 128) {
        return NextResponse.json({ error: "Email: máximo 128 caracteres" }, { status: 400 });
      }
      payload.email = email;
    }
    if (body.vertical !== undefined) payload.vertical = body.vertical ?? "";
    if (Array.isArray(body.websites)) {
      const sites = body.websites
        .slice(0, 2)
        .map((s) => String(s ?? "").trim())
        .filter((s) => s.length > 0);
      if (sites.some((s) => s.length > 256)) {
        return NextResponse.json({ error: "Cada sitio web: máximo 256 caracteres" }, { status: 400 });
      }
      payload.websites = sites;
    }
    if (body.profile_picture_handle) {
      payload.profile_picture_handle = body.profile_picture_handle;
    }

    const url = `${GRAPH_API}/${config.phoneNumberId}/whatsapp_business_profile`;
    const r = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = (await r.json().catch(() => ({}))) as { success?: boolean; error?: { message: string } };
    if (!r.ok) {
      return NextResponse.json(
        { error: data.error?.message ?? `Error ${r.status}` },
        { status: r.status >= 500 ? 502 : 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("PUT business-profile error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al actualizar perfil" },
      { status: 500 }
    );
  }
}
