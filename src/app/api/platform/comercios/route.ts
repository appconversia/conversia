import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePlatformSession } from "@/lib/tenant-session";

export async function GET(request: Request) {
  const gate = await requirePlatformSession();
  if (!gate.ok) return gate.response;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const take = Math.min(200, Math.max(1, Number(searchParams.get("limit")) || 100));

  const where =
    q.length > 0
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { slug: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {};

  const tenants = await prisma.tenant.findMany({
    where,
    take,
    orderBy: { createdAt: "desc" },
    include: {
      plan: true,
      _count: {
        select: {
          users: true,
          conversations: true,
          leads: true,
        },
      },
    },
  });

  return NextResponse.json({
    comercios: tenants.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      active: t.active,
      billingStatus: t.billingStatus,
      subscriptionStartAt: t.subscriptionStartAt?.toISOString() ?? null,
      subscriptionEndAt: t.subscriptionEndAt?.toISOString() ?? null,
      conversationsInPeriod: t.conversationsInPeriod,
      extraConversationPacks: t.extraConversationPacks,
      createdAt: t.createdAt.toISOString(),
      plan: t.plan
        ? {
            id: t.plan.id,
            name: t.plan.name,
            slug: t.plan.slug,
            priceUsdCents: t.plan.priceUsdCents,
            includedConversations: t.plan.includedConversations,
            extraPackConversations: t.plan.extraPackConversations,
          }
        : null,
      counts: {
        users: t._count.users,
        conversations: t._count.conversations,
        leads: t._count.leads,
      },
    })),
  });
}
