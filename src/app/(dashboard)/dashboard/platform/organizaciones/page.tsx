"use client";

import { useState, useEffect, useCallback } from "react";

type TenantRow = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  createdAt: string;
  plan: { id: string; name: string; slug: string } | null;
  counts: { users: number; conversations: number; leads: number };
};

export default function OrganizacionesPlatformPage() {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [rows, setRows] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 320);
    return () => clearTimeout(t);
  }, [q]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = new URL("/api/platform/tenants", window.location.origin);
      url.searchParams.set("limit", "120");
      if (debounced) url.searchParams.set("q", debounced);
      const r = await fetch(url.toString(), { credentials: "include", cache: "no-store" });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error ?? "Error al cargar");
      }
      const data = await r.json();
      setRows(data.tenants ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [debounced]);

  useEffect(() => {
    void load();
  }, [load]);

  const totals = rows.reduce(
    (acc, t) => {
      acc.users += t.counts.users;
      acc.conv += t.counts.conversations;
      acc.leads += t.counts.leads;
      return acc;
    },
    { users: 0, conv: 0, leads: 0 }
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#111B21] sm:text-3xl">Organizaciones</h1>
        <p className="mt-1 text-[#667781]">
          Busca por nombre o slug, revisa plan y métricas rápidas por cuenta.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-[#E9EDEF] bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-[#667781]">En vista</p>
          <p className="mt-1 text-2xl font-bold text-[#111B21]">{rows.length}</p>
        </div>
        <div className="rounded-xl border border-[#E9EDEF] bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-[#667781]">Usuarios (suma)</p>
          <p className="mt-1 text-2xl font-bold text-[#111B21]">{totals.users}</p>
        </div>
        <div className="rounded-xl border border-[#E9EDEF] bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-[#667781]">Conversaciones (suma)</p>
          <p className="mt-1 text-2xl font-bold text-[#111B21]">{totals.conv}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#667781]">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre o slug…"
            className="w-full rounded-xl border border-[#E9EDEF] py-3 pl-11 pr-4 text-[#111B21] shadow-sm outline-none transition focus:border-conversia-primary focus:ring-2 focus:ring-conversia-primary/20"
          />
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-xl border border-[#E9EDEF] bg-white px-4 py-3 text-sm font-medium text-[#111B21] shadow-sm hover:bg-[#f8f9fa]"
        >
          Actualizar
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}

      <div className="overflow-hidden rounded-xl border border-[#E9EDEF] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="bg-[#f0f2f5] text-xs font-semibold uppercase tracking-wide text-[#667781]">
              <tr>
                <th className="px-4 py-3">Organización</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3 text-right">Usuarios</th>
                <th className="px-4 py-3 text-right">Conversaciones</th>
                <th className="px-4 py-3 text-right">Leads</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Alta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E9EDEF]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center text-[#667781]">
                    Cargando…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center text-[#667781]">
                    No hay resultados.
                  </td>
                </tr>
              ) : (
                rows.map((t) => (
                  <tr key={t.id} className="hover:bg-[#fafafa]">
                    <td className="px-4 py-3 font-medium text-[#111B21]">{t.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-[#667781]">{t.slug}</td>
                    <td className="px-4 py-3 text-[#111B21]">{t.plan?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{t.counts.users}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{t.counts.conversations}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{t.counts.leads}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          t.active ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {t.active ? "Activa" : "Inactiva"}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-[#667781]">
                      {new Date(t.createdAt).toLocaleDateString("es", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-[#667781]">
        Los totales de la parte superior corresponden solo a las filas mostradas (máx. 120). Usa la búsqueda para
        acotar.
      </p>
    </div>
  );
}
