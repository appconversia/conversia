import { hash, compare } from "bcryptjs";
import { randomBytes } from "crypto";
import { prisma } from "./db";
import { cookies } from "next/headers";

const SALT_ROUNDS = 12;
const SESSION_COOKIE = "conversia_session";
const SESSION_DAYS = 7;

export async function hashPassword(password: string): Promise<string> {
  return hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return compare(password, hashedPassword);
}

export function generateToken(): string {
  return randomBytes(32).toString("hex");
}

export async function createSession(userId: string): Promise<string> {
  const token = generateToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DAYS);

  await prisma.session.create({
    data: { userId, token, expiresAt },
  });

  return token;
}

export async function getSession(): Promise<{ id: string; email: string; name: string | null; role: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) await prisma.session.delete({ where: { id: session.id } });
    return null;
  }

  const role = String(session.user.role ?? "colaborador");
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: role as "super_admin" | "admin" | "colaborador",
  };
}

export async function deleteSession(token: string): Promise<void> {
  await prisma.session.deleteMany({ where: { token } });
}
