import { prisma } from "./db";

export const PLATFORM_KEYS = {
  BOLD_IDENTITY_KEY: "bold_identity_key",
  BOLD_SECRET_KEY: "bold_secret_key",
  BOLD_USE_SANDBOX: "bold_use_sandbox",
} as const;

export async function getPlatformSetting(key: string): Promise<string | null> {
  const row = await prisma.platformSetting.findUnique({ where: { key } });
  return row?.value ?? null;
}

export async function setPlatformSetting(key: string, value: string): Promise<void> {
  await prisma.platformSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}

export async function getBoldIdentityKey(): Promise<string | null> {
  return getPlatformSetting(PLATFORM_KEYS.BOLD_IDENTITY_KEY);
}

export async function isBoldSandbox(): Promise<boolean> {
  const v = await getPlatformSetting(PLATFORM_KEYS.BOLD_USE_SANDBOX);
  return v === "true" || v === "1";
}
