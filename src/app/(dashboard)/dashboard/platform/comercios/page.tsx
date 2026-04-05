"use client";

import { useState, useEffect, useCallback } from "react";
import {
  DashboardHero,
  DashboardHeroGhostLink,
  DashboardHeroPrimaryLink,
} from "@/components/dashboard/dashboard-hero";

type PlanOpt = {
  id: string;
  name: string;
  slug: string;
  priceUsdCents: number;
  includedConversations: number;
  extraPackConversations?: number;
};

type TenantRow = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  billingStatus: string;
  subscriptionStartAt: string | null;
  subscriptionEndAt: string | null;
  conversationsInPeriod: number;
  extraConversationPacks: number;
  createdAt: string;
  plan: PlanOpt | null;
  counts: { users: number; conversations: number; leads: number };
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function ComerciosPlatformPage() {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [rows, setRows] = useState<TenantRow[]>([]);
  const [plans, setPlans] = useState<PlanOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<TenantRow | null>(null);
  const [edit, setEdit] = useState<TenantRow | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 320);
    return () => clearTimeout(t);
  }, [q]);

  const loadPlans = useCallback(async () => {
    const r = await fetch("/api/plans", { cache: "no-store" });
    if (!r.ok) return;
    const data = await r.json();
    setPlans(data.plans ?? []);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = new URL("/api/platform/comercios", window.location.origin);
      url.searchParams.set("limit", "120");
      if (debounced) url.searchParams.set("q", debounced);
      const r = await fetch(url.toString(), { credentials: "include", cache: "no-store" });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error ?? "Error al cargar");
      }
      const data = await r.json();
      setRows(data.comercios ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [debounced]);

  useEffect(() => {
    void loadPlans();
  }, [loadPlans]);

  useEffect(() => {
    void load();
  }, [load]);

  const onDelete = async (t: TenantRow) => {
    if (
      !confirm(
        `¿Desactivar el comercio "${t.name}"? Los usuarios no podrán operar hasta reactivarlo.`
      )
    )
      return;
    const r = await fetch(`/api/platform/comercios/${t.id}`, { method: "DELETE", credentials: "include" });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      alert(j.error ?? "Error");
      return;
    }
    void load();
  };

  const onToggleActive = async (t: TenantRow) => {
    setSaving(true);
    try {
      const r = await fetch(`/api/platform/comercios/${t.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !t.active }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        alert(j.error ?? "Error");
        return;
      }
      void load();
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async (form: FormData) => {
    if (!edit) return;
    setSaving(true);
    try {
      const body = {
        name: String(form.get("name") ?? "").trim(),
        slug: String(form.get("slug") ?? "").trim().toLowerCase(),
        planId: String(form.get("planId") ?? "") || null,
        active: form.get("active") === "on",
        billingStatus: String(form.get("billingStatus") ?? "trial"),
        subscriptionStartAt: String(form.get("subscriptionStartAt") ?? "") || null,
        subscriptionEndAt: String(form.get("subscriptionEndAt") ?? "") || null,
        extraConversationPacks: Math.max(0, Number(form.get("extraConversationPacks")) || 0),
        conversationsInPeriod: Math.max(0, Number(form.get("conversationsInPeriod")) || 0),
      };
      const r = await fetch(`/api/platform/comercios/${edit.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        alert(j.error ?? "Error al guardar");
        return;
      }
      setEdit(null);
      void load();
    } finally {
      setSaving(false);
    }
  };

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
      <DashboardHero
        overline="Administración SaaS"
        title="Comercios"
        description="Cada comercio es un espacio aislado: equipo, conversaciones y facturación propia."
        actions={
          <>
            <DashboardHeroPrimaryLink href="/dashboard/platform/ventas">Ventas e ingresos</DashboardHeroPrimaryLink>
            <DashboardHeroGhostLink href="/dashboard/documentacion" muted>
              Guías y manuales
            </DashboardHeroGhostLink>
          </>
        }
      />

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
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="bg-[#f0f2f5] text-xs font-semibold uppercase tracking-wide text-[#667781]">
              <tr>
                <th className="px-3 py-3">Comercio</th>
                <th className="px-3 py-3">Slug</th>
                <th className="px-3 py-3">Plan</th>
                <th className="px-3 py-3">Facturación</th>
                <th className="px-3 py-3 whitespace-nowrap">Vence</th>
                <th className="px-3 py-3 text-right">Uso / mes</th>
                <th className="px-3 py-3 text-right">Usuarios</th>
                <th className="px-3 py-3 text-right">Conv.</th>
                <th className="px-3 py-3">Estado</th>
                <th className="px-3 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E9EDEF]">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-16 text-center text-[#667781]">
                    Cargando…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-16 text-center text-[#667781]">
                    No hay resultados.
                  </td>
                </tr>
              ) : (
                rows.map((t) => (
                  <tr key={t.id} className="hover:bg-[#fafafa]">
                    <td className="px-3 py-3 font-medium text-[#111B21]">{t.name}</td>
                    <td className="px-3 py-3 font-mono text-xs text-[#667781]">{t.slug}</td>
                    <td className="px-3 py-3 text-[#111B21]">{t.plan?.name ?? "—"}</td>
                    <td className="px-3 py-3 text-xs capitalize text-[#667781]">{t.billingStatus}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-[#667781]">
                      {formatDate(t.subscriptionEndAt)}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-[#111B21]">
                      {t.conversationsInPeriod}
                      {t.plan ? (
                        <span className="text-[#667781]">
                          {" "}
                          /{" "}
                          {t.plan.includedConversations +
                            t.extraConversationPacks * (t.plan.extraPackConversations ?? 1000)}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">{t.counts.users}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{t.counts.conversations}</td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          t.active ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {t.active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex flex-wrap justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setDetail(t)}
                          className="rounded-lg border border-[#E9EDEF] px-2 py-1 text-xs font-medium hover:bg-[#f0f2f5]"
                        >
                          Ver
                        </button>
                        <button
                          type="button"
                          onClick={() => setEdit(t)}
                          className="rounded-lg border border-conversia-primary/30 px-2 py-1 text-xs font-medium text-conversia-dark hover:bg-conversia-primary/5"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => void onToggleActive(t)}
                          className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100"
                        >
                          {t.active ? "Inactivar" : "Activar"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void onDelete(t)}
                          className="rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-800 hover:bg-red-100"
                        >
                          Borrar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-[#667781]">
        Los totales corresponden solo a las filas mostradas (máx. 120). &quot;Borrar&quot; desactiva el comercio y
        suspende la facturación.
      </p>

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-[#111B21]">{detail.name}</h2>
            <p className="mt-1 font-mono text-sm text-[#667781]">{detail.slug}</p>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-[#667781]">Plan</dt>
                <dd>{detail.plan?.name ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[#667781]">Facturación</dt>
                <dd className="capitalize">{detail.billingStatus}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[#667781]">Inicio suscripción</dt>
                <dd>{formatDate(detail.subscriptionStartAt)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[#667781]">Fin suscripción</dt>
                <dd>{formatDate(detail.subscriptionEndAt)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[#667781]">Packs extra</dt>
                <dd>{detail.extraConversationPacks}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[#667781]">Conversaciones (mes)</dt>
                <dd>{detail.conversationsInPeriod}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[#667781]">Usuarios</dt>
                <dd>{detail.counts.users}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[#667781]">Conversaciones totales</dt>
                <dd>{detail.counts.conversations}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[#667781]">Leads</dt>
                <dd>{detail.counts.leads}</dd>
              </div>
            </dl>
            <button
              type="button"
              onClick={() => setDetail(null)}
              className="mt-6 w-full rounded-xl bg-[#111B21] py-2.5 text-sm font-medium text-white"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {edit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void saveEdit(new FormData(e.currentTarget));
            }}
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
          >
            <h2 className="text-lg font-semibold text-[#111B21]">Editar comercio</h2>
            <p className="mt-1 text-sm text-[#667781]">{edit.name}</p>
            <div className="mt-4 space-y-3">
              <label className="block text-sm">
                <span className="text-[#667781]">Nombre</span>
                <input
                  name="name"
                  defaultValue={edit.name}
                  className="mt-1 w-full rounded-lg border border-[#E9EDEF] px-3 py-2"
                  required
                />
              </label>
              <label className="block text-sm">
                <span className="text-[#667781]">Slug</span>
                <input
                  name="slug"
                  defaultValue={edit.slug}
                  className="mt-1 w-full rounded-lg border border-[#E9EDEF] px-3 py-2 font-mono text-sm"
                  required
                />
              </label>
              <label className="block text-sm">
                <span className="text-[#667781]">Plan</span>
                <select
                  name="planId"
                  defaultValue={edit.plan?.id ?? ""}
                  className="mt-1 w-full rounded-lg border border-[#E9EDEF] px-3 py-2"
                >
                  <option value="">— Sin plan —</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (${(p.priceUsdCents / 100).toFixed(0)})
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="text-[#667781]">Estado facturación</span>
                <select
                  name="billingStatus"
                  defaultValue={edit.billingStatus}
                  className="mt-1 w-full rounded-lg border border-[#E9EDEF] px-3 py-2 capitalize"
                >
                  <option value="trial">trial</option>
                  <option value="active">active</option>
                  <option value="past_due">past_due</option>
                  <option value="suspended">suspended</option>
                </select>
              </label>
              <label className="block text-sm">
                <span className="text-[#667781]">Inicio suscripción (ISO o vacío)</span>
                <input
                  name="subscriptionStartAt"
                  type="datetime-local"
                  defaultValue={
                    edit.subscriptionStartAt
                      ? edit.subscriptionStartAt.slice(0, 16)
                      : ""
                  }
                  className="mt-1 w-full rounded-lg border border-[#E9EDEF] px-3 py-2"
                />
              </label>
              <label className="block text-sm">
                <span className="text-[#667781]">Fin suscripción</span>
                <input
                  name="subscriptionEndAt"
                  type="datetime-local"
                  defaultValue={
                    edit.subscriptionEndAt ? edit.subscriptionEndAt.slice(0, 16) : ""
                  }
                  className="mt-1 w-full rounded-lg border border-[#E9EDEF] px-3 py-2"
                />
              </label>
              <label className="block text-sm">
                <span className="text-[#667781]">Packs extra de conversaciones</span>
                <input
                  name="extraConversationPacks"
                  type="number"
                  min={0}
                  defaultValue={edit.extraConversationPacks}
                  className="mt-1 w-full rounded-lg border border-[#E9EDEF] px-3 py-2"
                />
              </label>
              <label className="block text-sm">
                <span className="text-[#667781]">Uso conversaciones (periodo actual)</span>
                <input
                  name="conversationsInPeriod"
                  type="number"
                  min={0}
                  defaultValue={edit.conversationsInPeriod}
                  className="mt-1 w-full rounded-lg border border-[#E9EDEF] px-3 py-2"
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input name="active" type="checkbox" defaultChecked={edit.active} className="rounded" />
                <span className="text-[#667781]">Comercio activo</span>
              </label>
            </div>
            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={() => setEdit(null)}
                className="flex-1 rounded-xl border border-[#E9EDEF] py-2.5 text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 rounded-xl bg-conversia-primary py-2.5 text-sm font-medium text-white disabled:opacity-60"
              >
                {saving ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
