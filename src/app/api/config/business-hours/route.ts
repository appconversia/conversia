import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getBusinessHoursConfig,
  saveBusinessHours,
  type DaySchedule,
} from "@/lib/bot/business-hours";
import { canAccessTenantAppConfig, resolveTenantIdForConfigGet, resolveTenantIdForConfigPut } from "@/lib/tenant-config-access";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!canAccessTenantAppConfig(session)) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const resolved = resolveTenantIdForConfigGet(session, request);
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }
  const { tenantId } = resolved;

  try {
    const config = await getBusinessHoursConfig(tenantId);
    return NextResponse.json(config);
  } catch (err) {
    console.error("GET /api/config/business-hours error:", err);
    return NextResponse.json({ error: "Error al cargar horario" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!canAccessTenantAppConfig(session)) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as {
      tenantId?: string;
      timezone?: string;
      schedule?: DaySchedule[];
    };
    const resolved = resolveTenantIdForConfigPut(session, request, body.tenantId);
    if (!resolved.ok) {
      return NextResponse.json({ error: resolved.error }, { status: resolved.status });
    }
    const { tenantId } = resolved;

    const timezone = body.timezone as string | undefined;
    const schedule = body.schedule as DaySchedule[] | undefined;

    await saveBusinessHours(tenantId, {
      timezone: timezone?.trim() || undefined,
      schedule: Array.isArray(schedule) ? schedule : undefined,
    });

    const config = await getBusinessHoursConfig(tenantId);
    return NextResponse.json(config);
  } catch (err) {
    console.error("PUT /api/config/business-hours error:", err);
    return NextResponse.json({ error: "Error al guardar horario" }, { status: 500 });
  }
}
