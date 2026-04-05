"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { MobileSidebarOverlay } from "@/components/dashboard/mobile-sidebar-overlay";
import { UserProvider } from "@/contexts/user-context";

type MeUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  tenantId: string | null;
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<MeUser | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const isChat = pathname?.includes("/conversaciones");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (!data.user) {
          router.replace("/login");
          return;
        }
        const u = data.user as MeUser;
        setUser(u);
      })
      .catch(() => router.replace("/login"));
  }, [mounted, router]);

  /** Super admin plataforma: solo inicio, /dashboard/platform/* y guías (sin datos de un tenant). */
  useEffect(() => {
    if (!user || !pathname) return;
    const isPlatformShell = user.role === "super_admin" && user.tenantId === null;
    if (!isPlatformShell) return;
    const allowed =
      pathname === "/dashboard" ||
      pathname.startsWith("/dashboard/platform") ||
      pathname.startsWith("/dashboard/documentacion");
    if (!allowed) {
      router.replace("/dashboard");
    }
  }, [user, pathname, router]);

  /** Comercios: si la suscripción está vencida, suspendida o inactiva, solo facturación y guías. */
  useEffect(() => {
    if (!user?.tenantId || !pathname) return;
    if (pathname.startsWith("/dashboard/billing")) return;
    if (pathname.startsWith("/dashboard/documentacion")) return;
    if (pathname.startsWith("/dashboard/configuracion")) return;

    let cancelled = false;
    fetch("/api/billing/status", { credentials: "include", cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) return null;
        return r.json() as Promise<{ ok?: boolean; code?: string }>;
      })
      .then((data) => {
        if (cancelled || !data) return;
        if (data.ok) return;
        const code = data.code;
        if (code === "quota") return;
        if (code === "expired" || code === "suspended" || code === "inactive") {
          router.replace(
            `/dashboard/billing?motivo=${encodeURIComponent(code === "expired" ? "vencido" : code === "suspended" ? "suspendido" : "inactivo")}`
          );
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [user?.tenantId, user?.id, pathname, router]);

  if (!mounted || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#ECE5DD]">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-conversia-primary/30" />
          <p className="text-[#667781]">Cargando…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#ECE5DD]">
      <MobileSidebarOverlay open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((c) => !c)}
        isMobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        userRole={user.role}
        tenantId={user.tenantId}
      />

      <div
        className={`transition-all duration-300 ${
          sidebarCollapsed ? "lg:ml-[72px]" : "lg:ml-64"
        }`}
      >
        <Header
          onMenuClick={() => setMobileMenuOpen(true)}
          userName={user.name}
          userEmail={user.email}
          userRole={user.role}
          tenantId={user.tenantId}
        />

        <main className={`min-h-[calc(100vh-4rem)] ${isChat ? "p-0" : "p-4 lg:p-6"}`}>
          <UserProvider
            user={
              user
                ? {
                    id: user.id ?? "",
                    email: user.email,
                    name: user.name,
                    role: user.role ?? "colaborador",
                    tenantId: user.tenantId ?? null,
                  }
                : null
            }
          >
            {isChat ? (
              <div className="h-[calc(100vh-4rem)]">{children}</div>
            ) : (
              <div className="rounded-xl bg-white shadow-sm p-6 min-h-[60vh]">{children}</div>
            )}
          </UserProvider>
        </main>
      </div>
    </div>
  );
}
