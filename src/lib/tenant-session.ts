import { NextResponse } from "next/server";
import { getSession, type SessionUser } from "./auth";

/** Requiere sesión con tenant (organización). Uso en APIs del dashboard. */
export async function requireTenantSession(): Promise<
  { ok: true; session: SessionUser; tenantId: string } | { ok: false; response: NextResponse }
> {
  const session = await getSession();
  if (!session) {
    return { ok: false, response: NextResponse.json({ error: "No autorizado" }, { status: 401 }) };
  }
  if (!session.tenantId) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Esta área es solo para cuentas de organización" },
        { status: 403 }
      ),
    };
  }
  return { ok: true, session, tenantId: session.tenantId };
}

/** Requiere super admin de plataforma (sin tenant). */
export async function requirePlatformSession(): Promise<
  { ok: true; session: SessionUser } | { ok: false; response: NextResponse }
> {
  const session = await getSession();
  if (!session) {
    return { ok: false, response: NextResponse.json({ error: "No autorizado" }, { status: 401 }) };
  }
  if (session.role !== "super_admin" || session.tenantId !== null) {
    return { ok: false, response: NextResponse.json({ error: "Acceso denegado" }, { status: 403 }) };
  }
  return { ok: true, session };
}
