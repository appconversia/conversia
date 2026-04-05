import { NextResponse } from "next/server";
import { requirePlatformSession } from "@/lib/tenant-session";
import { getPlatformSetting, setPlatformSetting, PLATFORM_KEYS } from "@/lib/platform-settings";

export async function GET() {
  const gate = await requirePlatformSession();
  if (!gate.ok) return gate.response;

  const identity = await getPlatformSetting(PLATFORM_KEYS.BOLD_IDENTITY_KEY);
  const secret = await getPlatformSetting(PLATFORM_KEYS.BOLD_SECRET_KEY);
  const sandbox = await getPlatformSetting(PLATFORM_KEYS.BOLD_USE_SANDBOX);

  return NextResponse.json({
    boldIdentityKeySet: !!identity,
    boldIdentityKeyPreview: identity ? `${identity.slice(0, 6)}…${identity.slice(-4)}` : null,
    boldSecretKeySet: !!secret,
    boldUseSandbox: sandbox === "true" || sandbox === "1",
  });
}

export async function PUT(request: Request) {
  const gate = await requirePlatformSession();
  if (!gate.ok) return gate.response;

  const body = (await request.json().catch(() => ({}))) as {
    boldIdentityKey?: string;
    boldSecretKey?: string;
    boldUseSandbox?: boolean;
  };

  if (body.boldIdentityKey !== undefined) {
    const v = body.boldIdentityKey.trim();
    if (v.length > 0) {
      await setPlatformSetting(PLATFORM_KEYS.BOLD_IDENTITY_KEY, v);
    }
  }
  if (body.boldSecretKey !== undefined) {
    const v = body.boldSecretKey.trim();
    if (v.length > 0) {
      await setPlatformSetting(PLATFORM_KEYS.BOLD_SECRET_KEY, v);
    }
  }
  if (body.boldUseSandbox !== undefined) {
    await setPlatformSetting(PLATFORM_KEYS.BOLD_USE_SANDBOX, body.boldUseSandbox ? "true" : "false");
  }

  return NextResponse.json({ ok: true });
}
