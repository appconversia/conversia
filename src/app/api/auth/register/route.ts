import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, createSession } from "@/lib/auth";
import { registerSchema } from "@/lib/validations/auth";
import { createTenantWithOwner } from "@/lib/tenant-onboarding";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }

    const { email, password, name, organizationName } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "Ya existe una cuenta con este email" },
        { status: 409 }
      );
    }

    const hashedPassword = await hashPassword(password);
    const { admin } = await createTenantWithOwner({
      organizationName: organizationName.trim(),
      adminEmail: email.trim().toLowerCase(),
      adminName: name.trim(),
      passwordHash: hashedPassword,
    });

    const token = await createSession(admin.id);
    const cookieStore = await cookies();
    cookieStore.set("conversia_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return NextResponse.json({
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        tenantId: admin.tenantId,
      },
    });
  } catch (e) {
    console.error("Register error:", e);
    return NextResponse.json(
      { error: "Error al crear la cuenta" },
      { status: 500 }
    );
  }
}
