import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getProductCatalog, saveProductCatalog, type ProductMedia } from "@/lib/bot/product-catalog";

const SUPER_ADMIN_ROLES = ["super_admin"];

function resolveTenantId(request: Request, sessionTenantId: string | null, bodyTenantId?: string): string | null {
  if (bodyTenantId?.trim()) return bodyTenantId.trim();
  const q = new URL(request.url).searchParams.get("tenantId");
  if (q?.trim()) return q.trim();
  return sessionTenantId;
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!["admin", "super_admin"].includes(session.role)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const tenantId = resolveTenantId(request, session.tenantId);
  if (!tenantId) {
    return NextResponse.json({ error: "Indica tenantId (?tenantId=) o usa cuenta de organización" }, { status: 400 });
  }

  try {
    const catalog = await getProductCatalog(tenantId);
    return NextResponse.json(catalog);
  } catch (err) {
    console.error("GET /api/bot/product-catalog error:", err);
    return NextResponse.json({ error: "Error al cargar catálogo" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!SUPER_ADMIN_ROLES.includes(session.role)) {
    return NextResponse.json({ error: "Solo super administradores pueden editar el catálogo" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as { tenantId?: string; items?: ProductMedia[] };
    const items = (Array.isArray(body) ? body : body.items ?? []) as ProductMedia[];
    const tenantId = resolveTenantId(request, session.tenantId, body.tenantId);
    if (!tenantId) {
      return NextResponse.json({ error: "Indica tenantId en el cuerpo o ?tenantId=" }, { status: 400 });
    }
    await saveProductCatalog(tenantId, items);
    const catalog = await getProductCatalog(tenantId);
    return NextResponse.json(catalog);
  } catch (err) {
    console.error("PUT /api/bot/product-catalog error:", err);
    return NextResponse.json({ error: "Error al guardar catálogo" }, { status: 500 });
  }
}
