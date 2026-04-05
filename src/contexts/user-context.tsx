"use client";

import { createContext, useContext } from "react";

export type UserContextValue = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  /** null = super admin de plataforma (sin organización) */
  tenantId: string | null;
} | null;

const UserContext = createContext<UserContextValue>(null);

export function UserProvider({
  user,
  children,
}: {
  user: UserContextValue;
  children: React.ReactNode;
}) {
  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}

export function useUser() {
  return useContext(UserContext);
}

export function useCanEditBotConfig(): boolean {
  const user = useUser();
  if (!user?.role) return false;
  const r = String(user.role).trim().toLowerCase();
  return r === "super_admin" || r === "admin";
}

/** Super admin SaaS: mismo rol pero sin tenant */
export function useIsPlatformShell(): boolean {
  const user = useUser();
  return !!user && user.role === "super_admin" && user.tenantId === null;
}
