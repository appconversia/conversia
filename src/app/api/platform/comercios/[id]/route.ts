import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePlatformSession } from "@/lib/tenant-session";
import type { BillingStatus } from "@prisma/client";

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requirePlatformSession();
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    slug?: string;
    planId?: string | null;
    active?: boolean;
    billingStatus?: BillingStatus;
    subscriptionStartAt?: string | null;
    subscriptionEndAt?: string | null;
    extraConversationPacks?: number;
    conversationsInPeriod?: number;
  };

  const existing = await prisma.tenant.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  if (body.slug && body.slug !== existing.slug) {
    const clash = await prisma.tenant.findUnique({ where: { slug: body.slug } });
    if (clash) {
      return NextResponse.json({ error: "Slug ya en uso" }, { status: 409 });
    }
  }

  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name.trim();
  if (body.slug !== undefined) data.slug = body.slug.trim().toLowerCase();
  if (body.planId !== undefined) {
    data.planId = body.planId === "" || body.planId === null ? null : body.planId;
  }
  if (body.active !== undefined) data.active = body.active;
  if (body.billingStatus !== undefined) data.billingStatus = body.billingStatus;
  if (body.subscriptionStartAt !== undefined) {
    data.subscriptionStartAt = body.subscriptionStartAt ? new Date(body.subscriptionStartAt) : null;
  }
  if (body.subscriptionEndAt !== undefined) {
    data.subscriptionEndAt = body.subscriptionEndAt ? new Date(body.subscriptionEndAt) : null;
  }
  if (body.extraConversationPacks !== undefined) data.extraConversationPacks = body.extraConversationPacks;
  if (body.conversationsInPeriod !== undefined) data.conversationsInPeriod = body.conversationsInPeriod;

  const updated = await prisma.tenant.update({
    where: { id },
    data: data as Parameters<typeof prisma.tenant.update>[0]["data"],
    include: { plan: true },
  });

  return NextResponse.json({
    comercio: {
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      active: updated.active,
      billingStatus: updated.billingStatus,
      planId: updated.planId,
      subscriptionEndAt: updated.subscriptionEndAt?.toISOString() ?? null,
    },
  });
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requirePlatformSession();
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  if (id === "tenant_default") {
    return NextResponse.json({ error: "No se puede eliminar el comercio por defecto" }, { status: 400 });
  }

  await prisma.tenant.update({
    where: { id },
    data: { active: false, billingStatus: "suspended" },
  });

  return NextResponse.json({ ok: true });
}
