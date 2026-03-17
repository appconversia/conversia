"use client";

import { createContext, useContext } from "react";

type UserContextValue = {
  id: string;
  email: string;
  name: string | null;
  role: string;
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
