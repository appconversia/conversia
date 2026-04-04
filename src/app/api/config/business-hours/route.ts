import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getBusinessHoursConfig,
  saveBusinessHours,
  type DaySchedule,
} from "@/lib/bot/business-hours";

const SUPER_ADMIN_ROLES = ["super_admin"];

function resolveTenantId(request: Request, sessionTenantId: string | null): string | null {
  const q = new URL(request.url).searchParams.get("tenantId");
  if (q?.trim()) return q.trim();
  return sessionTenantId;
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!SUPER_ADMIN_ROLES.includes(session.role)) {
    return NextResponse.json({ error: "Solo super administradores" }, { status: 403 });
  }

  const tenantId = resolveTenantId(request, session.tenantId);
  if (!tenantId) {
    return NextResponse.json({ error: "Indica tenantId (?tenantId=)" }, { status: 400 });
  }

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
  if (!SUPER_ADMIN_ROLES.includes(session.role)) {
    return NextResponse.json({ error: "Solo super administradores" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as {
      tenantId?: string;
      timezone?: string;
      schedule?: DaySchedule[];
    };
    const tenantId = body.tenantId?.trim() || resolveTenantId(request, session.tenantId);
    if (!tenantId) {
      return NextResponse.json({ error: "Indica tenantId en el cuerpo o ?tenantId=" }, { status: 400 });
    }

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
