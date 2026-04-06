import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

/**
 * Programa un cambio a un plan más barato al final del periodo pagado.
 * Body: { targetPlanId: string } o { clear: true } para cancelar el cambio pendiente.
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.tenantId) {
    return NextResponse.json({ error: "Solo cuentas de comercio" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    targetPlanId?: string | null;
    clear?: boolean;
  };

  if (body.clear === true) {
    await prisma.tenant.update({
      where: { id: session.tenantId },
      data: { pendingPlanId: null, pendingPlanEffectiveAt: null },
    });
    return NextResponse.json({ ok: true, cleared: true });
  }

  const targetPlanId = typeof body.targetPlanId === "string" ? body.targetPlanId.trim() : "";
  if (!targetPlanId) {
    return NextResponse.json({ error: "Indica targetPlanId o clear: true" }, { status: 400 });
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.tenantId },
    include: { plan: true },
  });
  if (!tenant?.plan) {
    return NextResponse.json({ error: "Sin plan asignado" }, { status: 400 });
  }

  const target = await prisma.plan.findUnique({ where: { id: targetPlanId } });
  if (!target) {
    return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 });
  }

  if (target.id === tenant.planId) {
    return NextResponse.json({ error: "Ese es tu plan actual" }, { status: 400 });
  }

  if (target.priceUsdCents >= tenant.plan.priceUsdCents) {
    return NextResponse.json(
      { error: "El downgrade solo aplica a un plan más barato. Para subir, usa upgrade con pago prorrateado." },
      { status: 400 }
    );
  }

  const now = new Date();
  const effective =
    tenant.subscriptionEndAt && tenant.subscriptionEndAt > now
      ? tenant.subscriptionEndAt
      : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  await prisma.tenant.update({
    where: { id: session.tenantId },
    data: {
      pendingPlanId: target.id,
      pendingPlanEffectiveAt: effective,
    },
  });

  return NextResponse.json({
    ok: true,
    pendingPlan: {
      id: target.id,
      name: target.name,
      slug: target.slug,
      priceUsdCents: target.priceUsdCents,
    },
    pendingPlanEffectiveAt: effective.toISOString(),
  });
}
