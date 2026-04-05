"use client";

import Link from "next/link";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  userRole?: string;
  /** null = administrador de plataforma (sin organización) */
  tenantId?: string | null;
}

const platformNavItems = [
  {
    href: "/dashboard",
    label: "Inicio",
    icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  },
  {
    href: "/dashboard/platform/organizaciones",
    label: "Organizaciones",
    icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
  },
  {
    href: "/dashboard/documentacion",
    label: "Guías",
    icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
  },
];

const tenantNavItems = [
  { href: "/dashboard", label: "Inicio", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6", adminOnly: false, superAdminOnly: false },
  { href: "/dashboard/conversaciones", label: "Conversaciones", icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z", adminOnly: false, superAdminOnly: false },
  { href: "/dashboard/categorias", label: "Categorías", icon: "M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7a2 2 0 010-2.828l7-7A2 2 0 0112 3h5c2.828 0 5 2.172 5 5v1H7V3z", adminOnly: true, superAdminOnly: false },
  { href: "/dashboard/etiquetas", label: "Etiquetas", icon: "M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7a2 2 0 010-2.828l7-7A2 2 0 0112 3h5c2.828 0 5 2.172 5 5v1H7V3z", adminOnly: true, superAdminOnly: false },
  { href: "/dashboard/productos", label: "Productos", icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4", adminOnly: true, superAdminOnly: false },
  { href: "/dashboard/usuarios", label: "Usuarios", icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z", adminOnly: true, superAdminOnly: false },
  { href: "/dashboard/bot", label: "Bot con IA", icon: "M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z", adminOnly: true, superAdminOnly: false },
  { href: "/dashboard/plantillas", label: "Plantillas", icon: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z", adminOnly: true, superAdminOnly: false },
  { href: "/dashboard/documentacion", label: "Documentación", icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253", adminOnly: true, superAdminOnly: false },
  { href: "/dashboard/configuracion", label: "Configuración", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z", adminOnly: false, superAdminOnly: true },
  { href: "/dashboard/logs", label: "Logs", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z", adminOnly: false, superAdminOnly: true },
];

export function Sidebar({
  collapsed,
  onToggle,
  isMobileOpen,
  onCloseMobile,
  userRole,
  tenantId,
}: SidebarProps) {
  const showMobile = isMobileOpen === true;
  const role = String(userRole ?? "").toLowerCase();
  const isAdmin = role === "admin" || role === "super_admin";
  const isSuperAdmin = role === "super_admin";
  const isPlatformShell = isSuperAdmin && (tenantId === null || tenantId === undefined);

  const navItems = isPlatformShell
    ? platformNavItems
    : tenantNavItems.filter((item) => {
        if (item.superAdminOnly) return isSuperAdmin;
        if (item.adminOnly) return isAdmin;
        return true;
      });

  const brandSubtitle = isPlatformShell ? "Plataforma" : null;

  return (
    <>
      <aside
        className={`fixed left-0 top-0 z-40 h-screen bg-[#111B21] text-white transition-all duration-300 ease-in-out hidden lg:block ${
          collapsed ? "w-[72px]" : "w-64"
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-[#202C33] px-4">
          {!collapsed && (
            <Link href="/dashboard" className="flex min-w-0 flex-col font-semibold leading-tight">
              <span className="text-lg truncate">Conversia</span>
              {brandSubtitle && (
                <span className="text-[10px] font-medium uppercase tracking-wider text-conversia-primary">
                  {brandSubtitle}
                </span>
              )}
            </Link>
          )}
          <button
            onClick={onToggle}
            aria-label={collapsed ? "Expandir menú" : "Contraer menú"}
            className="rounded-lg p-2 hover:bg-[#202C33] transition-colors"
          >
            <svg
              className={`h-6 w-6 transition-transform ${collapsed ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
              />
            </svg>
          </button>
        </div>
        <nav className="mt-4 space-y-1 px-2">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[#E9EDEF] hover:bg-[#202C33] transition-colors"
            >
              <svg
                className="h-6 w-6 shrink-0 text-conversia-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
              </svg>
              {!collapsed && <span>{item.label}</span>}
            </Link>
          ))}
        </nav>
      </aside>

      <aside
        className={`fixed left-0 top-0 z-40 h-screen w-64 bg-[#111B21] text-white transition-transform duration-300 ease-out lg:hidden ${
          showMobile ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-[#202C33] px-4">
          <div className="flex flex-col">
            <span className="font-semibold">Menú</span>
            {brandSubtitle && (
              <span className="text-[10px] font-medium uppercase tracking-wider text-conversia-primary">
                {brandSubtitle}
              </span>
            )}
          </div>
          <button
            onClick={onCloseMobile}
            aria-label="Cerrar"
            className="rounded-lg p-2 hover:bg-[#202C33]"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <nav className="mt-4 space-y-1 px-2">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={onCloseMobile}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[#E9EDEF] hover:bg-[#202C33]"
            >
              <svg className="h-6 w-6 shrink-0 text-conversia-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
              </svg>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>
    </>
  );
}
