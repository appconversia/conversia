import { describe, it, expect } from "vitest";
import { isSuperAdmin, isAdminOrSuperAdmin } from "../auth-utils";

describe("auth-utils", () => {
  describe("isSuperAdmin", () => {
    it("devuelve true para super_admin", () => {
      expect(isSuperAdmin("super_admin")).toBe(true);
      expect(isSuperAdmin("SUPER_ADMIN")).toBe(true);
    });
    it("devuelve false para admin y colaborador", () => {
      expect(isSuperAdmin("admin")).toBe(false);
      expect(isSuperAdmin("colaborador")).toBe(false);
    });
    it("devuelve false para undefined o vacío", () => {
      expect(isSuperAdmin(undefined)).toBe(false);
      expect(isSuperAdmin("")).toBe(false);
    });
  });

  describe("isAdminOrSuperAdmin", () => {
    it("devuelve true para super_admin y admin", () => {
      expect(isAdminOrSuperAdmin("super_admin")).toBe(true);
      expect(isAdminOrSuperAdmin("admin")).toBe(true);
    });
    it("devuelve false para colaborador", () => {
      expect(isAdminOrSuperAdmin("colaborador")).toBe(false);
    });
    it("devuelve false para undefined o vacío", () => {
      expect(isAdminOrSuperAdmin(undefined)).toBe(false);
      expect(isAdminOrSuperAdmin("")).toBe(false);
    });
  });
});
