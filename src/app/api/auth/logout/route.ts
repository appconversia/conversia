import { NextResponse } from "next/server";
import { deleteSession } from "@/lib/auth";
import { cookies } from "next/headers";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("conversia_session")?.value;
    if (token) await deleteSession(token);

    cookieStore.delete("conversia_session");
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Logout error:", e);
    return NextResponse.json({ success: true });
  }
}
