import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hashPassword } from "@/lib/auth";
import { getProtectedUserId } from "@/lib/config";
import { createUserSchema } from "@/lib/validations/user";
import { isAdminOrSuperAdmin } from "@/lib/auth-utils";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (!isAdminOrSuperAdmin(session.role)) {
      return NextResponse.json(
        { error: "Solo administradores pueden acceder al módulo de usuarios" },
        { status: 403 }
      );
    }

    const [users, protectedUserId] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          active: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      getProtectedUserId(),
    ]);
    return NextResponse.json({ users, protectedUserIds: protectedUserId ? [protectedUserId] : [] });
  } catch (e) {
    const err = e as Error;
    console.error("GET /api/users error:", err);
    const msg =
      process.env.NODE_ENV === "development"
        ? err.message ?? String(e)
        : "Error al cargar usuarios. Verifica la conexión a la base de datos.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!isAdminOrSuperAdmin(session.role)) {
    return NextResponse.json(
      { error: "Solo administradores pueden crear usuarios." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const parsed = createUserSchema.safeParse(body);

    if (!parsed.success) {
      const msg = parsed.error.errors[0]?.message ?? "Datos inválidos";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const { name, email, phone, password, role } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "Ya existe un usuario con este email" },
        { status: 409 }
      );
    }

    const hashedPassword = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        phone: phone || null,
        role,
      },
    });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        active: user.active,
      },
    });
  } catch (e) {
    console.error("Create user error:", e);
    return NextResponse.json(
      { error: "Error al crear el usuario" },
      { status: 500 }
    );
  }
}
