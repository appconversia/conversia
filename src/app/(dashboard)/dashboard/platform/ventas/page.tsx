"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type RangeKey = "today" | "yesterday" | "7d" | "30d" | "month" | "year" | "all";

type Analytics = {
  range: { key: string; label: string; from: string; to: string };
  summary: {
    revenueUsdCents: number;
    revenueUsd: string;
    paymentsPaidCount: number;
    pendingPaymentsCount: number;
    failedPaymentsCount: number;
    subscriptionPayments: { count: number; usdCents: number };
    extraPackPayments: { count: number; usdCents: number };
    newComerciosCount: number;
    newUsersColaboradoresCount: number;
    newActivationsBillingActive: number;
    tenantsActiveTotal: number;
    mrrSnapshotUsdCents: number;
    mrrSnapshotUsd: string;
    arrEstimateUsd: string;
  };
  tenantsByBillingStatus: Record<string, number>;
  tenantsByPlan: {
    planId: string | null;
    planName: string;
    planSlug: string | null;
    tenantCount: number;
    priceUsdCents: number;
    mrrIfAllActiveUsdCents: number;
  }[];
  series: {
    revenueByDay: { date: string; usdCents: number; paymentCount: number }[];
    newTenantsByDay: { date: string; count: number }[];
    newUsersByDay: { date: string; count: number }[];
  };
  recentPayments: {
    id: string;
    tenantName: string;
    tenantSlug: string;
    amountUsd: string;
    type: string;
    paidAt: string | null;
    description: string | null;
  }[];
  topTenantsByRevenue: {
    tenantId: string;
    name: string;
    slug: string;
    revenueUsd: string;
    revenueUsdCents: number;
    paymentCount: number;
  }[];
};

const RANGE_OPTIONS: { value: RangeKey; label: string }[] = [
  { value: "today", label: "Hoy" },
  { value: "yesterday", label: "Ayer" },
  { value: "7d", label: "7 días" },
  { value: "30d", label: "30 días" },
  { value: "month", label: "Este mes" },
  { value: "year", label: "Este año" },
  { value: "all", label: "Todo" },
];

function centsLabel(c: number) {
  return (c / 100).toLocaleString("es-CO", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
}

function BarChart({
  data,
  valueKey,
  color,
  formatValue,
}: {
  data: { date: string; [k: string]: number | string }[];
  valueKey: string;
  color: string;
  formatValue: (n: number) => string;
}) {
  const max = Math.max(1, ...data.map((d) => Number(d[valueKey]) || 0));
  return (
    <div className="flex h-48 items-end gap-0.5 overflow-x-auto pb-6 pt-2">
      {data.map((d) => {
        const v = Number(d[valueKey]) || 0;
        const h = Math.round((v / max) * 100);
        const short = d.date.slice(5);
        return (
          <div key={d.date} className="group flex min-w-[22px] flex-1 flex-col items-center justify-end">
            <div
              className={`w-full min-h-[4px] rounded-t transition-all ${color}`}
              style={{ height: `${Math.max(4, h)}%` }}
              title={`${d.date}: ${formatValue(v)}`}
            />
            <span className="mt-1 rotate-45 text-[9px] text-[#667781] origin-left whitespace-nowrap opacity-70 group-hover:opacity-100">
              {short}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function PlatformVentasPage() {
  const [range, setRange] = useState<RangeKey>("30d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (useCustom && customFrom && customTo) {
        params.set("range", "custom");
        params.set("from", customFrom);
        params.set("to", customTo);
      } else {
        params.set("range", range);
      }
      const r = await fetch(`/api/platform/sales-analytics?${params}`, { credentials: "include", cache: "no-store" });
      const j = await r.json();
      if (!r.ok) {
        setError(j.error ?? "Error al cargar");
        setData(null);
        return;
      }
      setData(j as Analytics);
    } catch {
      setError("Error de red");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [range, useCustom, customFrom, customTo]);

  useEffect(() => {
    void load();
  }, [load]);

  const billingLabels: Record<string, string> = {
    trial: "Prueba",
    active: "Activo (pagando)",
    past_due: "Vencido",
    suspended: "Suspendido",
  };

  const planTotalTenants = useMemo(
    () => data?.tenantsByPlan.reduce((s, p) => s + p.tenantCount, 0) ?? 0,
    [data]
  );

  if (loading && !data) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-[#075E54] border-t-transparent" />
          <p className="text-sm text-[#667781]">Cargando ingresos y suscripciones…</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-800">
        {error}
      </div>
    );
  }

  if (!data) return null;

  const { summary, series } = data;

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#111B21]">Ventas e ingresos</h1>
          <p className="mt-1 max-w-2xl text-sm text-[#667781]">
            Ingresos por suscripciones y packs extra (Bold), nuevos comercios, usuarios del panel y distribución por plan. Solo
            administración de plataforma.
          </p>
        </div>
        <div className="flex flex-col gap-2 rounded-xl border border-[#E9EDEF] bg-[#f8faf9] p-4 text-sm">
          <label className="flex items-center gap-2 text-[#111B21]">
            <input
              type="checkbox"
              checked={useCustom}
              onChange={(e) => setUseCustom(e.target.checked)}
              className="rounded border-gray-300"
            />
            Rango personalizado
          </label>
          {useCustom ? (
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="rounded-lg border border-[#E9EDEF] px-2 py-1"
              />
              <span className="text-[#667781]">—</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="rounded-lg border border-[#E9EDEF] px-2 py-1"
              />
              <button
                type="button"
                onClick={() => void load()}
                className="rounded-lg bg-[#075E54] px-3 py-1.5 text-white hover:bg-[#064a42]"
              >
                Aplicar
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {RANGE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setUseCustom(false);
                    setRange(opt.value);
                  }}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    range === opt.value && !useCustom
                      ? "bg-[#075E54] text-white"
                      : "bg-white text-[#111B21] ring-1 ring-[#E9EDEF] hover:bg-[#E9EDEF]/60"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
          <p className="text-xs text-[#667781]">
            Periodo: <strong>{data.range.label}</strong> · {new Date(data.range.from).toLocaleString("es")} —{" "}
            {new Date(data.range.to).toLocaleString("es")}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">{error}</div>
      )}

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-[#0d3d36]/15 bg-gradient-to-br from-[#075E54] to-[#064a42] p-5 text-white shadow-md">
          <p className="text-xs font-medium uppercase tracking-wide text-white/80">Ingresos cobrados (periodo)</p>
          <p className="mt-2 text-3xl font-bold tracking-tight">${summary.revenueUsd}</p>
          <p className="mt-1 text-xs text-white/75">{summary.paymentsPaidCount} pagos confirmados</p>
        </div>
        <div className="rounded-2xl border border-[#E9EDEF] bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-[#667781]">MRR snapshot (activos)</p>
          <p className="mt-2 text-2xl font-bold text-[#111B21]">${summary.mrrSnapshotUsd}</p>
          <p className="mt-1 text-xs text-[#667781]">ARR estimado: ${summary.arrEstimateUsd} · comercios activos: {summary.tenantsActiveTotal}</p>
        </div>
        <div className="rounded-2xl border border-[#E9EDEF] bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-[#667781]">Nuevos comercios</p>
          <p className="mt-2 text-2xl font-bold text-[#111B21]">{summary.newComerciosCount}</p>
          <p className="mt-1 text-xs text-[#667781]">Usuarios nuevos (panel): {summary.newUsersColaboradoresCount}</p>
        </div>
        <div className="rounded-2xl border border-[#E9EDEF] bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-[#667781]">Suscripciones / packs</p>
          <p className="mt-2 text-sm text-[#111B21]">
            Mensualidades: {centsLabel(summary.subscriptionPayments.usdCents)} ({summary.subscriptionPayments.count} pagos)
          </p>
          <p className="mt-1 text-sm text-[#111B21]">
            Packs extra: {centsLabel(summary.extraPackPayments.usdCents)} ({summary.extraPackPayments.count})
          </p>
          <p className="mt-2 text-xs text-amber-800">
            Pendientes en periodo: {summary.pendingPaymentsCount} · Fallidos: {summary.failedPaymentsCount}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#E9EDEF] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#111B21]">Ingresos por día (USD)</h2>
          <p className="text-xs text-[#667781]">Suma de pagos Bold marcados como pagados</p>
          <BarChart
            data={series.revenueByDay.map((d) => ({ ...d, v: d.usdCents }))}
            valueKey="v"
            color="bg-[#25D366]"
            formatValue={(n) => centsLabel(n)}
          />
        </div>
        <div className="rounded-2xl border border-[#E9EDEF] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#111B21]">Altas de comercios por día</h2>
          <p className="text-xs text-[#667781]">Nuevas organizaciones registradas</p>
          <BarChart
            data={series.newTenantsByDay.map((d) => ({ ...d, v: d.count }))}
            valueKey="v"
            color="bg-[#128C7E]"
            formatValue={(n) => String(n)}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-[#E9EDEF] bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-[#111B21]">Nuevos usuarios del panel por día</h2>
        <p className="text-xs text-[#667781]">Cuentas con comercio (admin, colaborador, etc.)</p>
        <BarChart
          data={series.newUsersByDay.map((d) => ({ ...d, v: d.count }))}
          valueKey="v"
          color="bg-[#34B7F1]"
          formatValue={(n) => String(n)}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#E9EDEF] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#111B21]">Comercios por plan</h2>
          <ul className="mt-4 space-y-3">
            {data.tenantsByPlan.map((p) => (
              <li key={p.planId ?? "none"} className="flex items-center justify-between gap-2 border-b border-[#f0f2f4] pb-2 last:border-0">
                <div>
                  <p className="font-medium text-[#111B21]">{p.planName}</p>
                  <p className="text-xs text-[#667781]">
                    {p.tenantCount} comercios · listado {(p.priceUsdCents / 100).toFixed(2)} USD/mes
                  </p>
                </div>
                <span className="text-sm font-semibold text-[#075E54]">
                  {planTotalTenants > 0 ? Math.round((p.tenantCount / planTotalTenants) * 100) : 0}%
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-[#E9EDEF] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#111B21]">Estado de facturación</h2>
          <ul className="mt-4 space-y-2">
            {Object.entries(data.tenantsByBillingStatus).map(([k, v]) => (
              <li key={k} className="flex justify-between text-sm">
                <span className="text-[#667781]">{billingLabels[k] ?? k}</span>
                <span className="font-semibold text-[#111B21]">{v}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-[#667781]">
            Activaciones con facturación &quot;active&quot; iniciada en el periodo:{" "}
            <strong>{summary.newActivationsBillingActive}</strong>
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#E9EDEF] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#111B21]">Top comercios por ingresos (periodo)</h2>
          <ul className="mt-4 space-y-2">
            {data.topTenantsByRevenue.length === 0 ? (
              <li className="text-sm text-[#667781]">Sin pagos en este rango.</li>
            ) : (
              data.topTenantsByRevenue.map((t, i) => (
                <li key={t.tenantId} className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-[#667781]">
                    {i + 1}.{" "}
                    <Link href={`/dashboard/platform/comercios`} className="font-medium text-[#075E54] hover:underline">
                      {t.name}
                    </Link>
                  </span>
                  <span className="font-semibold text-[#111B21]">
                    ${t.revenueUsd} <span className="text-xs font-normal text-[#667781]">({t.paymentCount} pagos)</span>
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>
        <div className="rounded-2xl border border-[#E9EDEF] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#111B21]">Últimos pagos (periodo)</h2>
          <div className="mt-4 max-h-80 overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#E9EDEF] text-xs text-[#667781]">
                  <th className="pb-2 pr-2">Fecha</th>
                  <th className="pb-2 pr-2">Comercio</th>
                  <th className="pb-2 pr-2">Tipo</th>
                  <th className="pb-2 text-right">Monto</th>
                </tr>
              </thead>
              <tbody>
                {data.recentPayments.map((p) => (
                  <tr key={p.id} className="border-b border-[#f5f6f6]">
                    <td className="py-2 pr-2 text-xs text-[#667781]">
                      {p.paidAt ? new Date(p.paidAt).toLocaleString("es", { dateStyle: "short", timeStyle: "short" }) : "—"}
                    </td>
                    <td className="py-2 pr-2 font-medium text-[#111B21]">{p.tenantName}</td>
                    <td className="py-2 pr-2 text-xs capitalize text-[#667781]">{p.type.replace("_", " ")}</td>
                    <td className="py-2 text-right font-semibold">${p.amountUsd}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-[#667781]">
        Los ingresos reflejan pagos confirmados vía Bold. El MRR es una foto de comercios en estado activo con plan asignado (precio mensual
        del plan × 1 por comercio).
      </p>
    </div>
  );
}
