import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    where: { active: true, id: { not: session.id } },
    select: { id: true, email: true, name: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ users });
}
