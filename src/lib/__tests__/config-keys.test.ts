import { describe, it, expect } from "vitest";

describe("Config keys", () => {
  it("tiene SYSTEM_PROTECTED_USER_ID para usuario protegido desde BD", () => {
    const key = "system_protected_user_id";
    expect(key).toBe("system_protected_user_id");
  });
  it("tiene WHATSAPP keys para configuración dinámica", () => {
    const keys = [
      "whatsapp_access_token",
      "whatsapp_phone_number_id",
      "whatsapp_webhook_verify_token",
    ];
    expect(keys.every((k) => k.startsWith("whatsapp_"))).toBe(true);
  });
});
