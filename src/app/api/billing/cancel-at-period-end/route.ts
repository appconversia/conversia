import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

/** Marca la suscripción para no renovar al terminar el periodo (o revierte). */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.tenantId) {
    return NextResponse.json({ error: "Solo cuentas de comercio" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as { cancelAtPeriodEnd?: boolean };
  const cancel =
    typeof body.cancelAtPeriodEnd === "boolean" ? body.cancelAtPeriodEnd : true;

  const t = await prisma.tenant.update({
    where: { id: session.tenantId },
    data: { cancelSubscriptionAtPeriodEnd: cancel },
    select: { cancelSubscriptionAtPeriodEnd: true },
  });

  return NextResponse.json({
    ok: true,
    cancelSubscriptionAtPeriodEnd: t.cancelSubscriptionAtPeriodEnd,
  });
}
