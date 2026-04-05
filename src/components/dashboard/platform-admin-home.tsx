"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type Stats = {
  scope?: string;
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

type TenantRow = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  createdAt: string;
  plan: { id: string; name: string; slug: string } | null;
  counts: { users: number; conversations: number; leads: number };
};

function formatDateShort(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" });
}

function formatDateWeekday(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("es", { weekday: "short" });
}

function truncate(str: string, max: number) {
  if (str.length <= max) return str;
  return str.slice(0, max) + "…";
}

export function PlatformAdminHome() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [rStats, rTenants] = await Promise.all([
          fetch("/api/dashboard/stats", { credentials: "include", cache: "no-store" }),
          fetch("/api/platform/comercios?limit=8", { credentials: "include", cache: "no-store" }),
        ]);
        if (!rStats.ok) throw new Error("No se pudieron cargar las métricas globales");
        if (!rTenants.ok) throw new Error("No se pudieron cargar los comercios");
        const [dataStats, dataTenants] = await Promise.all([rStats.json(), rTenants.json()]);
        if (!cancelled) {
          setStats(dataStats);
          setTenants(dataTenants.comercios ?? []);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-conversia-primary border-t-transparent" />
          <p className="text-sm text-[#667781]">Cargando panel de plataforma…</p>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-800">
        {error ?? "Error al cargar"}
      </div>
    );
  }

  const { conversations, messages, team, bot, activity } = stats;
  const maxBar = Math.max(1, ...activity.conversationsByDay.map((d) => d.count));

  return (
    <div className="space-y-8 pb-8">
      <div className="relative overflow-hidden rounded-2xl border border-[#0d3d36]/20 bg-gradient-to-br from-[#075E54] via-[#064a42] to-[#022c28] p-6 sm:p-8 text-white shadow-lg">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-conversia-primary/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 left-10 h-48 w-48 rounded-full bg-teal-400/10 blur-2xl" />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#D9FDD3]/90">Administración SaaS</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Visión global de Conversia</h1>
          <p className="mt-2 max-w-2xl text-sm text-[#E9EDEF]/90">
            Métricas agregadas de todos los comercios, actividad reciente y acceso rápido a la gestión de cuentas.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/dashboard/platform/comercios"
              className="inline-flex items-center rounded-xl bg-conversia-primary px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-conversia-primary-hover"
            >
              Gestionar comercios
            </Link>
            <Link
              href="/dashboard/platform/ventas"
              className="inline-flex items-center rounded-xl border border-white/35 bg-white/15 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/25"
            >
              Ventas e ingresos
            </Link>
            <Link
              href="/dashboard/documentacion"
              className="inline-flex items-center rounded-xl border border-white/25 bg-white/10 px-5 py-2.5 text-sm font-medium text-white backdrop-blur transition hover:bg-white/15"
            >
              Guías y manuales
            </Link>
          </div>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          title="Conversaciones (todas)"
          value={conversations.total}
          hint="En todos los comercios"
        />
        <Kpi title="Mensajes hoy" value={messages.today} sub={`${messages.thisWeek} esta semana`} />
        <Kpi title="Usuarios activos" value={team.activeUsers} hint="Cuentas de equipo" />
        <Kpi
          title="Flujos bot activos"
          value={`${bot.flowsActive}/${bot.flowsTotal}`}
          hint="Automatización"
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <div className="rounded-xl border border-[#E9EDEF] bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-[#111B21]">Conversaciones por día</h2>
            <p className="text-sm text-[#667781]">Últimos 7 días · agregado global</p>
            <div className="mt-6 flex h-36 items-end justify-between gap-2">
              {activity.conversationsByDay.map((d) => (
                <div key={d.date} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full min-h-[6px] rounded-t-md bg-gradient-to-t from-conversia-dark to-conversia-primary transition-all"
                    style={{ height: `${Math.max(10, (d.count / maxBar) * 100)}%` }}
                  />
                  <span className="text-[10px] text-[#667781]">{formatDateWeekday(d.date)}</span>
                  <span className="text-xs font-semibold text-[#111B21]">{d.count}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-[#E9EDEF] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#111B21]">Comercios recientes</h2>
          <p className="text-sm text-[#667781]">Últimas altas</p>
          <ul className="mt-4 space-y-3">
            {tenants.length === 0 ? (
              <li className="text-sm text-[#667781]">No hay comercios registrados.</li>
            ) : (
              tenants.map((t) => (
                <li
                  key={t.id}
                  className="flex items-start justify-between gap-2 border-b border-[#f0f2f5] pb-3 last:border-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-[#111B21]">{t.name}</p>
                    <p className="truncate text-xs text-[#667781] font-mono">{t.slug}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      t.active ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {t.active ? "Activa" : "Pausada"}
                  </span>
                </li>
              ))
            )}
          </ul>
          <Link
            href="/dashboard/platform/comercios"
            className="mt-4 inline-flex w-full justify-center rounded-lg border border-conversia-primary/30 py-2 text-sm font-medium text-conversia-dark hover:bg-conversia-primary/5"
          >
            Ver todas →
          </Link>
        </section>
      </div>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#111B21]">Conversaciones recientes (global)</h2>
            <p className="text-sm text-[#667781]">Últimas 5 en cualquier comercio</p>
          </div>
          <span className="rounded-full bg-[#111B21]/5 px-3 py-1 text-xs font-medium text-[#667781]">
            Solo lectura
          </span>
        </div>
        <div className="overflow-hidden rounded-xl border border-[#E9EDEF] bg-white shadow-sm">
          {activity.recent.length === 0 ? (
            <div className="py-14 text-center text-[#667781]">Sin conversaciones aún</div>
          ) : (
            <ul className="divide-y divide-[#E9EDEF]">
              {activity.recent.map((c) => (
                <li key={c.id} className="flex items-center gap-3 p-4 hover:bg-[#F0F2F5]/80">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-conversia-primary/15 text-lg">
                    {c.channel === "bot" ? "🤖" : "💬"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-[#111B21]">
                      {c.otherUser
                        ? c.otherUser.name || c.otherUser.email
                        : c.channel === "bot"
                          ? "Chat con Bot"
                          : "Conversación"}
                    </p>
                    <p className="truncate text-sm text-[#667781]">
                      {c.lastMessage?.content ? truncate(c.lastMessage.content, 72) : "Sin mensajes"}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-[#667781]">{formatDateShort(c.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function Kpi({
  title,
  value,
  sub,
  hint,
}: {
  title: string;
  value: number | string;
  sub?: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-[#E9EDEF] bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-[#667781]">{title}</p>
      <p className="mt-1 text-3xl font-bold tracking-tight text-[#111B21]">{value}</p>
      {sub && <p className="mt-1 text-xs text-[#667781]">{sub}</p>}
      {hint && !sub && <p className="mt-1 text-xs text-[#667781]">{hint}</p>}
    </div>
  );
}
