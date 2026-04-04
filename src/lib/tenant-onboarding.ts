import { randomBytes } from "crypto";
import { prisma } from "./db";
import { hashPassword } from "./auth";
import { KEYS } from "./config";

const SYSTEM_TAGS = [
  { slug: "bot", name: "Bot", order: 0 },
  { slug: "sin_asignar", name: "Sin Asignar", order: 1 },
  { slug: "asistidas", name: "Asistidas", order: 2 },
];

function slugify(s: string): string {
  const base = s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return base || "org";
}

async function uniqueTenantSlug(baseName: string): Promise<string> {
  let slug = slugify(baseName);
  const existing = await prisma.tenant.findUnique({ where: { slug } });
  if (!existing) return slug;
  for (let i = 0; i < 10; i++) {
    const suffix = randomBytes(2).toString("hex");
    slug = `${slugify(baseName)}-${suffix}`;
    const e = await prisma.tenant.findUnique({ where: { slug } });
    if (!e) return slug;
  }
  return `${slugify(baseName)}-${randomBytes(4).toString("hex")}`;
}

const PLAN_FREE_ID = "plan_free";

/**
 * Crea organización (tenant), etiquetas de sistema, usuario bot y administrador inicial.
 */
export async function createTenantWithOwner(params: {
  organizationName: string;
  adminEmail: string;
  adminName: string;
  passwordHash: string;
}) {
  const slug = await uniqueTenantSlug(params.organizationName);
  const botPasswordHash = await hashPassword(randomBytes(32).toString("hex"));

  return prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        name: params.organizationName,
        slug,
        planId: PLAN_FREE_ID,
        active: true,
      },
    });

    for (const t of SYSTEM_TAGS) {
      await tx.conversationTag.create({
        data: { tenantId: tenant.id, ...t, isSystem: true },
      });
    }

    const botEmail = `bot-${tenant.id}@system.conversia.local`;
    const botUser = await tx.user.create({
      data: {
        email: botEmail,
        password: botPasswordHash,
        name: "Bot Conversia",
        role: "sistema",
        tenantId: tenant.id,
      },
    });

    const admin = await tx.user.create({
      data: {
        email: params.adminEmail,
        password: params.passwordHash,
        name: params.adminName.trim(),
        role: "admin",
        tenantId: tenant.id,
      },
    });

    await tx.appConfig.createMany({
      data: [
        { tenantId: tenant.id, key: KEYS.SYSTEM_PROTECTED_USER_ID, value: admin.id },
        { tenantId: tenant.id, key: KEYS.BOT_USER_ID, value: botUser.id },
      ],
    });

    return { tenant, admin };
  });
}
