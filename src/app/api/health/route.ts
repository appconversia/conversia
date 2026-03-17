import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("db") !== "1") {
    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  }

  try {
    const count = await prisma.user.count();
    return NextResponse.json({
      status: "ok",
      db: "connected",
      usersCount: count,
    });
  } catch (e) {
    const err = e as Error;
    return NextResponse.json(
      { status: "error", db: "failed", error: err.message },
      { status: 500 }
    );
  }
}
