"use client";

import { useRouter } from "next/navigation";

interface HeaderProps {
  onMenuClick: () => void;
  userName?: string | null;
  userEmail?: string | null;
  userRole?: string;
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  colaborador: "Colaborador",
};

export function Header({ onMenuClick, userName, userEmail, userRole }: HeaderProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const roleLabel = userRole ? ROLE_LABELS[userRole] ?? userRole : "";
  const displayName = userName?.trim() || userEmail || "Usuario";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-[#202C33] px-4 lg:px-6">
      <button
        onClick={onMenuClick}
        aria-label="Abrir menú"
        className="rounded-lg p-2 text-white hover:bg-[#2A3942] transition-colors lg:hidden"
      >
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <div className="flex-1" />

      <div className="flex items-center gap-3 sm:gap-4">
        <div className="hidden sm:flex sm:flex-col sm:items-end sm:gap-0.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white truncate max-w-[140px] sm:max-w-[200px]" title={displayName}>
              {displayName}
            </span>
            {roleLabel && (
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                  userRole === "super_admin"
                    ? "bg-[#25D366]/20 text-[#25D366]"
                    : userRole === "admin"
                      ? "bg-violet-500/20 text-violet-300"
                      : "bg-[#2A3942] text-[#8696A0]"
                }`}
              >
                {roleLabel}
              </span>
            )}
          </div>
          {userEmail && (
            <span className="text-xs text-[#8696A0] truncate max-w-[200px]" title={userEmail}>
              {userEmail}
            </span>
          )}
        </div>
        <button
          onClick={handleLogout}
          className="rounded-lg px-3 py-1.5 text-sm text-[#25D366] hover:bg-[#2A3942] transition-colors whitespace-nowrap"
        >
          Salir
        </button>
      </div>
    </header>
  );
}
