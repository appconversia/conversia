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
        if (u.role === "super_admin" && u.tenantId === null) {
          router.replace("/platform");
          return;
        }
        setUser(u);
      })
      .catch(() => router.replace("/login"));
  }, [mounted, router]);

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
        />

        <main className={`min-h-[calc(100vh-4rem)] ${isChat ? "p-0" : "p-4 lg:p-6"}`}>
          <UserProvider user={user ? { id: user.id ?? "", email: user.email, name: user.name, role: user.role ?? "colaborador" } : null}>
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
