import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getWhatsAppConfig } from "@/lib/config";

const SUPER_ADMIN_ROLES = ["super_admin"];
const GRAPH_API = "https://graph.facebook.com/v21.0";
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png"];

/**
 * POST /api/whatsapp/business-profile/photo
 * Sube foto de perfil: Resumable Upload a Meta → actualiza perfil con handle.
 * Solo super_admin. Requiere META_APP_ID en variables de entorno.
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!SUPER_ADMIN_ROLES.includes(session.role)) {
    return NextResponse.json({ error: "Solo super administradores" }, { status: 403 });
  }

  const appId = process.env.META_APP_ID?.trim();
  if (!appId) {
    return NextResponse.json(
      {
        error:
          "Falta META_APP_ID. Añade la variable en Vercel: Configuración → Variables de entorno. Obtén el App ID en developers.facebook.com → Tu app.",
      },
      { status: 400 }
    );
  }

  const config = await getWhatsAppConfig();
  if (!config.accessToken || !config.phoneNumberId) {
    return NextResponse.json(
      { error: "Configura WhatsApp en Configuración" },
      { status: 400 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file?.size) {
      return NextResponse.json({ error: "No se envió archivo" }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Máximo 5 MB. Imagen cuadrada 640×640 recomendada." }, { status: 413 });
    }
    const mime = file.type || "image/jpeg";
    if (!ALLOWED_TYPES.includes(mime)) {
      return NextResponse.json({ error: "Solo JPG o PNG" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = file.name?.replace(/[^a-zA-Z0-9._-]/g, "_") || "profile.jpg";

    // Paso 1: Crear sesión de upload
    const sessionUrl = `${GRAPH_API}/${appId}/uploads?file_type=${encodeURIComponent(mime)}&file_length=${buffer.length}&file_name=${encodeURIComponent(fileName)}`;
    const sessionRes = await fetch(sessionUrl, {
      method: "POST",
      headers: { Authorization: `OAuth ${config.accessToken}` },
    });
    const sessionData = (await sessionRes.json().catch(() => ({}))) as {
      id?: string;
      error?: { message: string };
    };
    if (!sessionRes.ok) {
      return NextResponse.json(
        { error: sessionData.error?.message ?? "Error al crear sesión de upload" },
        { status: 400 }
      );
    }
    const uploadId = sessionData.id;
    if (!uploadId || !uploadId.startsWith("upload:")) {
      return NextResponse.json({ error: "Respuesta inválida de Meta" }, { status: 502 });
    }

    // Paso 2: Subir archivo binario
    const uploadUrl = `${GRAPH_API}/${uploadId}`;
    const uploadRes = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        Authorization: `OAuth ${config.accessToken}`,
        "file_offset": "0",
      },
      body: buffer,
    });
    const uploadData = (await uploadRes.json().catch(() => ({}))) as {
      h?: string;
      error?: { message: string };
    };
    if (!uploadRes.ok) {
      return NextResponse.json(
        { error: uploadData.error?.message ?? "Error al subir imagen" },
        { status: 400 }
      );
    }
    const handle = uploadData.h;
    if (!handle) {
      return NextResponse.json({ error: "Meta no devolvió handle de imagen" }, { status: 502 });
    }

    // Paso 3: Actualizar perfil con el handle
    const profileUrl = `${GRAPH_API}/${config.phoneNumberId}/whatsapp_business_profile`;
    const profileRes = await fetch(profileUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        profile_picture_handle: handle,
      }),
    });
    const profileData = (await profileRes.json().catch(() => ({}))) as { success?: boolean; error?: { message: string } };
    if (!profileRes.ok) {
      return NextResponse.json(
        { error: profileData.error?.message ?? "Error al actualizar foto de perfil" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("POST business-profile/photo error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al subir foto" },
      { status: 500 }
    );
  }
}
