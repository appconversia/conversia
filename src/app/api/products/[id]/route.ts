import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { syncProductsWithBot } from "@/lib/products/sync-bot";

const ADMIN_ROLES = ["admin", "super_admin"];

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!ADMIN_ROLES.includes(session.role)) return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  if (!session.tenantId) return NextResponse.json({ error: "Se requiere cuenta de organización" }, { status: 403 });

  const { id } = await params;
  const product = await prisma.product.findFirst({
    where: { id, category: { tenantId: session.tenantId } },
    include: { category: { select: { id: true, name: true } } },
  });
  if (!product) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });

  return NextResponse.json({
    ...product,
    price: Number(product.price),
    category: product.category.name,
    categoryId: product.category.id,
    photos: product.photos ? JSON.parse(product.photos) : [],
    videos: product.videos ? JSON.parse(product.videos) : [],
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!ADMIN_ROLES.includes(session.role)) return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  if (!session.tenantId) return NextResponse.json({ error: "Se requiere cuenta de organización" }, { status: 403 });

  const { id } = await params;
  const existing = await prisma.product.findFirst({
    where: { id, category: { tenantId: session.tenantId } },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
  const body = await request.json() as {
    name?: string;
    description?: string;
    price?: number;
    stock?: number;
    available?: boolean;
    categoryId?: string;
    characteristics?: string;
    photos?: string[];
    videos?: string[];
    order?: number;
  };

  const product = await prisma.product.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name.trim() }),
      ...(body.description !== undefined && { description: body.description.trim() }),
      ...(body.price !== undefined && { price: Number(body.price) }),
      ...(body.stock !== undefined && { stock: Number(body.stock) }),
      ...(body.available !== undefined && { available: !!body.available }),
      ...(body.categoryId !== undefined && { categoryId: body.categoryId.trim() }),
      ...(body.characteristics !== undefined && { characteristics: body.characteristics?.trim() || null }),
      ...(body.photos !== undefined && { photos: body.photos?.length ? JSON.stringify(body.photos) : null }),
      ...(body.videos !== undefined && { videos: body.videos?.length ? JSON.stringify(body.videos) : null }),
      ...(body.order !== undefined && { order: Number(body.order) }),
    },
    include: { category: { select: { id: true, name: true } } },
  });
  await syncProductsWithBot(session.tenantId).catch((err) => console.error("syncProductsWithBot after update:", err));
  return NextResponse.json({
    ...product,
    price: Number(product.price),
    category: product.category.name,
    categoryId: product.category.id,
    photos: product.photos ? JSON.parse(product.photos) : [],
    videos: product.videos ? JSON.parse(product.videos) : [],
  });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!ADMIN_ROLES.includes(session.role)) return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  if (!session.tenantId) return NextResponse.json({ error: "Se requiere cuenta de organización" }, { status: 403 });

  const { id } = await params;
  const existing = await prisma.product.findFirst({
    where: { id, category: { tenantId: session.tenantId } },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
  await prisma.product.delete({ where: { id } });
  await syncProductsWithBot(session.tenantId).catch((err) => console.error("syncProductsWithBot after delete:", err));
  return NextResponse.json({ ok: true });
}
