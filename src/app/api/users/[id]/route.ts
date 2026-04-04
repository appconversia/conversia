import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hashPassword } from "@/lib/auth";
import { getProtectedUserId } from "@/lib/config";
import { updateUserSchema } from "@/lib/validations/user";
import { isAdminOrSuperAdmin } from "@/lib/auth-utils";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!isAdminOrSuperAdmin(session.role)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }
  if (!session.tenantId) {
    return NextResponse.json({ error: "Se requiere cuenta de organización" }, { status: 403 });
  }

  const { id } = await params;
  const user = await prisma.user.findFirst({
    where: { id, tenantId: session.tenantId },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      active: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }
  return NextResponse.json({ user });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!isAdminOrSuperAdmin(session.role)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }
  if (!session.tenantId) {
    return NextResponse.json({ error: "Se requiere cuenta de organización" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const tenantId = session.tenantId;

  if (body.active !== undefined) {
    if (id === session.id) {
      return NextResponse.json(
        { error: "No puedes desactivar tu propia cuenta" },
        { status: 400 }
      );
    }
    const target = await prisma.user.findFirst({ where: { id, tenantId } });
    if (!target) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    const protectedId = await getProtectedUserId(tenantId);
    if (protectedId && target.id === protectedId) {
      return NextResponse.json(
        { error: "No se puede desactivar al usuario protegido del sistema" },
        { status: 400 }
      );
    }

    const user = await prisma.user.update({
      where: { id },
      data: { active: body.active },
      select: { id: true, email: true, name: true, phone: true, role: true, active: true, createdAt: true },
    });
    return NextResponse.json({ user });
  }

  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.errors[0]?.message ?? "Datos inválidos";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const existing = await prisma.user.findFirst({ where: { id, tenantId } });
  if (!existing) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  const protectedId = await getProtectedUserId(tenantId);
  if (protectedId && existing.id === protectedId) {
    return NextResponse.json(
      { error: "No se puede editar al usuario protegido del sistema" },
      { status: 400 }
    );
  }

  const { name, email, phone, role, password } = parsed.data;

  if (email !== existing.email) {
    const duplicate = await prisma.user.findUnique({ where: { email } });
    if (duplicate) {
      return NextResponse.json(
        { error: "Ya existe un usuario con este email" },
        { status: 409 }
      );
    }
  }

  const updateData: { name: string; email: string; phone: string | null; role: "admin" | "colaborador"; password?: string } = {
    name,
    email,
    phone: phone || null,
    role,
  };

  if (password && password.length >= 6) {
    updateData.password = await hashPassword(password);
  }

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: { id: true, email: true, name: true, phone: true, role: true, active: true, createdAt: true },
  });

  return NextResponse.json({ user });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!isAdminOrSuperAdmin(session.role)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }
  if (!session.tenantId) {
    return NextResponse.json({ error: "Se requiere cuenta de organización" }, { status: 403 });
  }

  const { id } = await params;
  const tenantId = session.tenantId;

  if (id === session.id) {
    return NextResponse.json(
      { error: "No puedes eliminar tu propia cuenta" },
      { status: 400 }
    );
  }

  const target = await prisma.user.findFirst({ where: { id, tenantId } });
  if (!target) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  const protectedId = await getProtectedUserId(tenantId);
  if (protectedId && target.id === protectedId) {
    return NextResponse.json(
      { error: "No se puede eliminar al usuario protegido del sistema" },
      { status: 400 }
    );
  }

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
