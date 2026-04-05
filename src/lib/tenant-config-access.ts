import type { SessionUser } from "@/lib/auth";

export type ResolveTenantResult =
  | { ok: true; tenantId: string }
  | { ok: false; status: 403 | 400; error: string };

/**
 * Lectura de config de tenant: admins solo su organización; super_admin usa ?tenantId= o su tenant.
 */
export function resolveTenantIdForConfigGet(session: SessionUser, request: Request): ResolveTenantResult {
  if (session.role === "admin") {
    if (!session.tenantId) {
      return { ok: false, status: 403, error: "Sin organización asignada" };
    }
    return { ok: true, tenantId: session.tenantId };
  }
  if (session.role === "super_admin") {
    const q = new URL(request.url).searchParams.get("tenantId")?.trim() || "";
    const fromSession = session.tenantId?.trim() || "";
    const tenantId = q || fromSession;
    if (!tenantId) {
      return { ok: false, status: 400, error: "Indica tenantId en la URL (?tenantId=...)" };
    }
    return { ok: true, tenantId };
  }
  return { ok: false, status: 403, error: "Sin permiso" };
}

/**
 * Escritura: admins solo su tenant (ignora body/query ajenos). Super_admin puede elegir tenant en body o query.
 */
export function resolveTenantIdForConfigPut(
  session: SessionUser,
  request: Request,
  bodyTenantId?: string | null
): ResolveTenantResult {
  if (session.role === "admin") {
    if (!session.tenantId) {
      return { ok: false, status: 403, error: "Sin organización asignada" };
    }
    return { ok: true, tenantId: session.tenantId };
  }
  if (session.role === "super_admin") {
    const q = new URL(request.url).searchParams.get("tenantId")?.trim() || "";
    const fromBody = bodyTenantId?.trim() || "";
    const fromSession = session.tenantId?.trim() || "";
    const tenantId = fromBody || q || fromSession;
    if (!tenantId) {
      return { ok: false, status: 400, error: "Indica tenantId en el cuerpo o ?tenantId=" };
    }
    return { ok: true, tenantId };
  }
  return { ok: false, status: 403, error: "Sin permiso" };
}

export function canAccessTenantAppConfig(session: SessionUser | null): boolean {
  if (!session) return false;
  return session.role === "super_admin" || session.role === "admin";
}
