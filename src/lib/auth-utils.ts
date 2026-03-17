/** Roles desde BD - sin hardcode */
export function isSuperAdmin(role: string | undefined): boolean {
  return String(role ?? "").toLowerCase() === "super_admin";
}

export function isAdminOrSuperAdmin(role: string | undefined): boolean {
  const r = String(role ?? "").toLowerCase();
  return r === "super_admin" || r === "admin";
}
