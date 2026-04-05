import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/** Catálogo público de planes (landing / billing). */
export async function GET() {
  const plans = await prisma.plan.findMany({
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      maxUsers: true,
      sortOrder: true,
      priceUsdCents: true,
      includedConversations: true,
      extraPackConversations: true,
      extraPackPriceUsdCents: true,
      tagline: true,
    },
  });
  return NextResponse.json({ plans });
}
