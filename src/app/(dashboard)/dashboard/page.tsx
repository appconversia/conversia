"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useUser } from "@/contexts/user-context";
import { PlatformAdminHome } from "@/components/dashboard/platform-admin-home";
import {
  DashboardHero,
  DashboardHeroGhostLink,
  DashboardHeroPrimaryLink,
} from "@/components/dashboard/dashboard-hero";

type Stats = {
  conversations: {
    total: number;
    unassigned: number;
    assigned: number;
    handoffPending: number;
  };
  messages: { today: number; thisWeek: number };
  team: { activeUsers: number; activeSessions: number };
  bot: { flowsTotal: number; flowsActive: number };
  activity: {
    conversationsByDay: { date: string; count: number }[];
    recent: {
      id: string;
      channel: string;
      assignedTo: { id: string; name: string | null; email: string } | null;
      otherUser: { id: string; name: string | null; email: string } | null;
      lastMessage: { content: string; createdAt: string } | null;
      createdAt: string;
    }[];
    byAssignee: {
      userId: string | null;
      user: { id: string; name: string | null; email: string } | null;
      count: number;
    }[];
  };
};

function formatDateShort(dateStr: string) {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Hoy";
  if (d.toDateString() === yesterday.toDateString()) return "Ayer";
  return d.toLocaleDateString("es", { day: "numeric", month: "short" });
}

function formatDateWeekday(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("es", { weekday: "short" });
}

function truncate(str: string, max: number) {
  if (str.length <= max) return str;
  return str.slice(0, max) + "…";
}

export default function DashboardPage() {
  const user = useUser();
  const isPlatformShell =
    user?.role === "super_admin" && (user?.tenantId === null || user?.tenantId === undefined);
  if (isPlatformShell) return <PlatformAdminHome />;
  return <TenantDashboardHome />;
}

function TenantDashboardHome() {
  const user = useUser();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const r = await fetch("/api/dashboard/stats", {
          credentials: "include",
          cache: "no-store",
        });
        if (!r.ok) throw new Error("Error al cargar estadísticas");
        const data = await r.json();
        if (!cancelled) setStats(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-conversia-primary border-t-transparent" />
          <p className="text-sm text-[#667781]">Cargando tablero…</p>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
        {error ?? "No se pudieron cargar las estadísticas"}
      </div>
    );
  }

  const { conversations, messages, team, bot, activity } = stats;
  const maxBar = Math.max(1, ...activity.conversationsByDay.map((d) => d.count));

  return (
    <div className="space-y-6 pb-8">
      <DashboardHero
        overline="Tu comercio"
        title="Dashboard"
        description="Resumen de actividad, conversaciones y equipo. Accesos rápidos a lo que más usas cada día."
        actions={
          <>
            <DashboardHeroPrimaryLink href="/dashboard/conversaciones">Abrir Chats</DashboardHeroPrimaryLink>
            {isAdmin ? (
              <DashboardHeroGhostLink href="/dashboard/bot">Bot y flujos</DashboardHeroGhostLink>
            ) : null}
            <DashboardHeroGhostLink href="/dashboard/documentacion" muted>
              Guías y manuales
            </DashboardHeroGhostLink>
          </>
        }
      />

      {/* KPIs */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <KpiCard
          title="Conversaciones totales"
          value={conversations.total}
          href="/dashboard/conversaciones"
        />
        <KpiCard
          title="Sin asignar"
          value={conversations.unassigned}
          href="/dashboard/conversaciones?tab=sin_asignar"
          accent={conversations.unassigned > 0}
        />
        <KpiCard
          title="Handoff pendiente"
          value={conversations.handoffPending}
          href="/dashboard/conversaciones"
          accent={conversations.handoffPending > 0}
        />
        <KpiCard
          title="Mensajes hoy"
          value={messages.today}
          subtitle={`${messages.thisWeek} esta semana`}
        />
        <KpiCard
          title="Usuarios activos"
          value={team.activeUsers}
        />
        <KpiCard
          title="Sesiones activas"
          value={team.activeSessions}
        />
        <KpiCard
          title="Flujos bot activos"
          value={`${bot.flowsActive}/${bot.flowsTotal}`}
          href="/dashboard/bot"
        />
      </section>

      {/* Gráfico + Carga equipo + Recientes */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Tendencias últimos 7 días */}
        <section className="lg:col-span-2">
          <div className="rounded-xl border border-[#E9EDEF] bg-white p-4 shadow-sm sm:p-5">
            <h2 className="text-lg font-semibold text-[#111B21]">Conversaciones por día</h2>
            <p className="mt-0.5 text-sm text-[#667781]">Últimos 7 días</p>
            <div className="mt-4 flex h-32 items-end justify-between gap-2 sm:gap-3">
              {activity.conversationsByDay.map((d) => (
                <div key={d.date} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full min-h-[4px] rounded-t transition-all duration-300"
                    style={{
                      height: `${Math.max(8, (d.count / maxBar) * 100)}%`,
                      backgroundColor: "var(--wa-primary)",
                    }}
                  />
                  <span className="truncate text-[10px] text-[#667781] sm:text-xs">
                    {formatDateWeekday(d.date)}
                  </span>
                  <span className="text-xs font-medium text-[#111B21]">{d.count}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Carga por asignado */}
        <section>
          <div className="rounded-xl border border-[#E9EDEF] bg-white p-4 shadow-sm sm:p-5">
            <h2 className="text-lg font-semibold text-[#111B21]">Carga por agente</h2>
            <p className="mt-0.5 text-sm text-[#667781]">Conversaciones asignadas</p>
            <ul className="mt-4 space-y-3">
              {activity.byAssignee.length === 0 ? (
                <li className="text-sm text-[#667781]">Sin asignaciones</li>
              ) : (
                activity.byAssignee.map((item) => (
                  <li
                    key={item.userId ?? "unknown"}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="truncate text-[#111B21]">
                      {item.user?.name ?? item.user?.email ?? "—"}
                    </span>
                    <span
                      className="ml-2 shrink-0 rounded-full bg-conversia-primary/20 px-2 py-0.5 text-xs font-medium text-conversia-dark"
                    >
                      {item.count}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </section>
      </div>

      {/* Conversaciones recientes */}
      <section>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#111B21]">Conversaciones recientes</h2>
            <p className="mt-0.5 text-sm text-[#667781]">Últimas 5 conversaciones</p>
          </div>
          <Link
            href="/dashboard/conversaciones"
            className="text-sm font-medium text-conversia-primary hover:text-conversia-primary-hover"
          >
            Ver todas →
          </Link>
        </div>
        <div className="mt-4 rounded-xl border border-[#E9EDEF] bg-white shadow-sm overflow-hidden">
          {activity.recent.length === 0 ? (
            <div className="py-12 text-center text-[#667781]">
              No hay conversaciones recientes
            </div>
          ) : (
            <ul className="divide-y divide-[#E9EDEF]">
              {activity.recent.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/dashboard/conversaciones?conversationId=${c.id}`}
                    className="flex items-center gap-3 p-4 hover:bg-[#F0F2F5] transition-colors"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-conversia-primary text-sm font-medium text-white">
                      {c.channel === "bot" ? "🤖" : "💬"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-[#111B21]">
                        {c.otherUser
                          ? c.otherUser.name || c.otherUser.email
                          : c.channel === "bot"
                            ? "Chat con Bot"
                            : c.assignedTo
                              ? c.assignedTo.name || c.assignedTo.email
                              : "Conversación"}
                      </p>
                      <p className="truncate text-sm text-[#667781]">
                        {c.lastMessage?.content
                          ? truncate(c.lastMessage.content, 60)
                          : "Sin mensajes"}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-[#667781]">
                      {formatDateShort(c.createdAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function KpiCard({
  title,
  value,
  subtitle,
  href,
  accent,
}: {
  title: string;
  value: number | string;
  subtitle?: string;
  href?: string;
  accent?: boolean;
}) {
  const content = (
    <div
      className={`rounded-xl border p-4 shadow-sm transition-colors sm:p-5 ${
        accent
          ? "border-conversia-primary/40 bg-conversia-primary/5"
          : "border-[#E9EDEF] bg-white"
      }`}
    >
      <p className="text-sm font-medium text-[#667781]">{title}</p>
      <p
        className={`mt-1 text-2xl font-bold sm:text-3xl ${
          accent ? "text-conversia-dark" : "text-[#111B21]"
        }`}
      >
        {value}
      </p>
      {subtitle && (
        <p className="mt-1 text-xs text-[#667781]">{subtitle}</p>
      )}
      {href && (
        <span className="mt-2 inline-block text-xs font-medium text-conversia-primary">
          Ver detalles →
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block transition-opacity hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-conversia-primary focus:ring-offset-2 rounded-xl">
        {content}
      </Link>
    );
  }
  return content;
}
