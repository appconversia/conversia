"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DashboardHero, DashboardHeroGhostLink } from "@/components/dashboard/dashboard-hero";
import { planAllowsExtraConversationPacks } from "@/lib/plan-catalog";

type PlanRow = {
  id: string;
  name: string;
  slug: string;
  maxUsers: number;
  sortOrder: number;
  priceUsdCents: number;
  includedConversations: number;
  extraPackConversations: number;
  extraPackPriceUsdCents: number;
  tagline: string | null;
};

type BillingPayload = {
  ok: boolean;
  code?: string;
  message?: string;
  plans: PlanRow[];
  tenant: {
    name: string;
    billingStatus: string;
    subscriptionStartAt: string | null;
    subscriptionEndAt: string | null;
    cancelSubscriptionAtPeriodEnd: boolean;
    extraConversationPacks: number;
    conversationsInPeriod: number;
    quota: number;
    plan: {
      id: string;
      name: string;
      slug: string;
      priceUsdCents: number;
      includedConversations: number;
      extraPackConversations: number;
      extraPackPriceUsdCents: number;
      tagline: string | null;
    } | null;
    pendingPlan: {
      id: string;
      name: string;
      slug: string;
      priceUsdCents: number;
      includedConversations: number;
      tagline: string | null;
    } | null;
    pendingPlanEffectiveAt: string | null;
  };
  payments: {
    id: string;
    amountUsdCents: number;
    status: string;
    type: string;
    description: string | null;
    checkoutUrl: string | null;
    createdAt: string;
    paidAt: string | null;
  }[];
};

type PreviewJson = {
  proration: { amountUsdCents: number; summary: string; usedProration: boolean };
  targetPlan: { name: string; id: string };
};

function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export default function BillingPage() {
  const [motivoBloqueo, setMotivoBloqueo] = useState<string | null>(null);
  const [data, setData] = useState<BillingPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<string | null>(null);
  const [packs, setPacks] = useState(1);
  const [now, setNow] = useState(() => Date.now());
  const [upgradeTargetId, setUpgradeTargetId] = useState<string>("");
  const [downgradeTargetId, setDowngradeTargetId] = useState<string>("");
  const [preview, setPreview] = useState<PreviewJson | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    const r = await fetch("/api/billing/status", { credentials: "include", cache: "no-store" });
    const j = await r.json();
    if (!r.ok) {
      setErr(j.error ?? "No se pudo cargar la facturación");
      setData(null);
      return;
    }
    setData(j as BillingPayload);
  }, []);

  useEffect(() => {
    void load().finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setMotivoBloqueo(new URLSearchParams(window.location.search).get("motivo"));
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const pay = async (type: "subscription" | "renewal" | "upgrade" | "extra_pack", upgradeId?: string) => {
    setPaying(type + (upgradeId ? `_${upgradeId}` : ""));
    setActionMsg(null);
    try {
      const body: Record<string, unknown> = { type, packs: type === "extra_pack" ? packs : undefined };
      if (type === "upgrade" && upgradeId) body.targetPlanId = upgradeId;
      const r = await fetch("/api/billing/checkout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok) {
        alert(j.error ?? "Error al crear el pago");
        return;
      }
      if (j.checkoutUrl) {
        window.location.href = j.checkoutUrl as string;
      }
    } finally {
      setPaying(null);
    }
  };

  const fetchPreview = useCallback(async (targetPlanId: string) => {
    if (!targetPlanId) {
      setPreview(null);
      return;
    }
    setPreviewLoading(true);
    try {
      const r = await fetch(
        `/api/billing/preview?targetPlanId=${encodeURIComponent(targetPlanId)}`,
        { credentials: "include", cache: "no-store" }
      );
      const j = await r.json();
      if (r.ok) setPreview(j as PreviewJson);
      else setPreview(null);
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!upgradeTargetId) {
      setPreview(null);
      return;
    }
    void fetchPreview(upgradeTargetId);
  }, [upgradeTargetId, fetchPreview]);

  const upgradeOptions = useMemo(() => {
    if (!data?.tenant.plan) return [];
    const cur = data.tenant.plan.priceUsdCents;
    return data.plans.filter((p) => p.priceUsdCents > cur && p.id !== data.tenant.plan?.id);
  }, [data]);

  const downgradeOptions = useMemo(() => {
    if (!data?.tenant.plan) return [];
    const cur = data.tenant.plan.priceUsdCents;
    return data.plans.filter((p) => p.priceUsdCents < cur && p.id !== data.tenant.plan?.id);
  }, [data]);

  const scheduleDowngrade = async () => {
    if (!downgradeTargetId) return;
    setPaying("downgrade");
    setActionMsg(null);
    try {
      const r = await fetch("/api/billing/schedule-downgrade", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetPlanId: downgradeTargetId }),
      });
      const j = await r.json();
      if (!r.ok) {
        alert(j.error ?? "No se pudo programar el cambio");
        return;
      }
      setActionMsg(`Cambio programado a ${j.pendingPlan?.name ?? "el plan elegido"} al final del periodo.`);
      await load();
    } finally {
      setPaying(null);
    }
  };

  const clearPendingDowngrade = async () => {
    setPaying("clear_pending");
    try {
      const r = await fetch("/api/billing/schedule-downgrade", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clear: true }),
      });
      if (!r.ok) {
        const j = await r.json();
        alert(j.error ?? "Error");
        return;
      }
      setActionMsg(null);
      await load();
    } finally {
      setPaying(null);
    }
  };

  const setCancelEnd = async (cancelAtPeriodEnd: boolean) => {
    setPaying("cancel_toggle");
    try {
      const r = await fetch("/api/billing/cancel-at-period-end", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cancelAtPeriodEnd }),
      });
      if (!r.ok) {
        const j = await r.json();
        alert(j.error ?? "Error");
        return;
      }
      await load();
    } finally {
      setPaying(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center text-[#667781]">
        Cargando facturación…
      </div>
    );
  }

  if (err || !data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-800">
        {err ?? "Error"}
        <p className="mt-2 text-sm">
          Si eres administrador de plataforma, la facturación aplica por comercio desde cada cuenta con tenant.
        </p>
      </div>
    );
  }

  const { tenant, payments, ok, code, message, plans } = data;
  const end = tenant.subscriptionEndAt ? new Date(tenant.subscriptionEndAt).getTime() : null;
  const msLeft = end !== null ? end - now : null;
  const expired = msLeft !== null && msLeft <= 0;
  const daysLeft =
    msLeft !== null && msLeft > 0 ? Math.ceil(msLeft / (24 * 60 * 60 * 1000)) : null;

  let countdown = "";
  if (msLeft !== null && msLeft > 0) {
    const s = Math.floor(msLeft / 1000);
    const hh = Math.floor(s / 3600);
    const mm = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    countdown = `${hh}h ${mm}m ${ss}s`;
  }

  const used = tenant.conversationsInPeriod;
  const quota = tenant.quota;
  const pct = quota > 0 ? Math.min(100, Math.round((used / quota) * 100)) : 0;

  return (
    <div className="space-y-8">
      <DashboardHero
        overline="Suscripción"
        title="Facturación"
        description={`Plan, uso de conversaciones del mes y pagos con Bold (USD). Comercio: ${tenant.name}.`}
        actions={
          <>
            <DashboardHeroGhostLink href="/dashboard/configuracion/integracion">Integración</DashboardHeroGhostLink>
            <DashboardHeroGhostLink href="/dashboard/documentacion" muted>
              Ayuda y manuales
            </DashboardHeroGhostLink>
          </>
        }
      />

      {motivoBloqueo && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          Acceso al panel limitado:{" "}
          <span className="font-semibold capitalize">
            {motivoBloqueo === "vencido"
              ? "suscripción vencida"
              : motivoBloqueo === "suspendido"
                ? "cuenta suspendida"
                : motivoBloqueo === "inactivo"
                  ? "comercio inactivo"
                  : motivoBloqueo}
          </span>
          . Regulariza el pago o el estado desde aquí.
        </div>
      )}

      {actionMsg && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {actionMsg}
        </div>
      )}

      {!ok && (code === "expired" || code === "suspended" || code === "inactive") && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-950">
          <p className="font-semibold">Servicio restringido</p>
          <p className="mt-1 text-sm">{message}</p>
          <p className="mt-2 text-sm">
            {code === "expired"
              ? "Renueva con el mismo plan o sube de plan abajo. Tras pagar, el acceso se restablece."
              : "Regulariza el estado para volver a usar conversaciones y el bot."}
          </p>
        </div>
      )}

      {!ok && code === "quota" && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-orange-950">
          <p className="font-semibold">Límite de conversaciones del mes</p>
          <p className="mt-1 text-sm">{message}</p>
          <p className="mt-2 text-sm">Compra packs extra abajo o espera al siguiente periodo.</p>
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-[#E9EDEF] bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[#667781]">Plan actual</h2>
          {tenant.plan ? (
            <>
              <p className="mt-2 text-xl font-bold text-[#111B21]">{tenant.plan.name}</p>
              {tenant.plan.tagline && (
                <p className="mt-1 text-sm text-[#667781]">{tenant.plan.tagline}</p>
              )}
              <p className="mt-3 text-lg font-semibold text-conversia-dark">
                {formatUsd(tenant.plan.priceUsdCents)}
                <span className="text-sm font-normal text-[#667781]"> / mes</span>
              </p>
              <p className="mt-2 text-sm text-[#667781]">
                Incluye {tenant.plan.includedConversations.toLocaleString()} conversaciones por periodo. Cada pack
                extra: +{tenant.plan.extraPackConversations.toLocaleString()} conv. por{" "}
                {formatUsd(tenant.plan.extraPackPriceUsdCents)}.
              </p>
            </>
          ) : (
            <p className="mt-2 text-[#667781]">Sin plan asignado. Contacta al administrador.</p>
          )}

          <div className="mt-4 flex flex-col gap-2">
            {expired ? (
              <button
                type="button"
                disabled={!tenant.plan || paying?.startsWith("renewal")}
                onClick={() => void pay("renewal")}
                className="w-full rounded-xl bg-conversia-primary py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-conversia-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {paying?.startsWith("renewal") ? "Abriendo Bold…" : "Renovar suscripción (Bold)"}
              </button>
            ) : (
              <button
                type="button"
                disabled={!tenant.plan || paying?.startsWith("subscription")}
                onClick={() => void pay("subscription")}
                className="w-full rounded-xl bg-conversia-primary py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-conversia-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {paying?.startsWith("subscription")
                  ? "Abriendo Bold…"
                  : "Pagar / extender suscripción (Bold)"}
              </button>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-[#E9EDEF] bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[#667781]">
            Suscripción y tiempo restante
          </h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-[#667781]">Estado</dt>
              <dd className="capitalize">{tenant.billingStatus}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[#667781]">Fin del periodo</dt>
              <dd>
                {tenant.subscriptionEndAt
                  ? new Date(tenant.subscriptionEndAt).toLocaleString("es")
                  : "—"}
              </dd>
            </div>
            {msLeft !== null && (
              <div className="flex justify-between gap-4">
                <dt className="text-[#667781]">Cuenta regresiva</dt>
                <dd className="font-mono text-[#111B21]">
                  {expired ? (
                    <span className="text-red-600">Vencido</span>
                  ) : (
                    <>
                      {countdown}
                      {daysLeft !== null && (
                        <span className="ml-2 text-xs text-[#667781]">(~{daysLeft} d)</span>
                      )}
                    </>
                  )}
                </dd>
              </div>
            )}
            <div className="flex flex-col gap-2 border-t border-[#E9EDEF] pt-3">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-[#667781]">No renovar al terminar</dt>
                <dd>
                  <button
                    type="button"
                    disabled={paying === "cancel_toggle" || !tenant.subscriptionEndAt}
                    onClick={() => void setCancelEnd(!tenant.cancelSubscriptionAtPeriodEnd)}
                    className={`rounded-lg px-3 py-1 text-xs font-semibold ${
                      tenant.cancelSubscriptionAtPeriodEnd
                        ? "bg-amber-100 text-amber-900"
                        : "bg-[#f0f2f5] text-[#111B21]"
                    }`}
                  >
                    {tenant.cancelSubscriptionAtPeriodEnd ? "Activado (no renovará)" : "Desactivado"}
                  </button>
                </dd>
              </div>
              {tenant.cancelSubscriptionAtPeriodEnd && (
                <p className="text-xs text-amber-800">
                  No se cobrará el siguiente ciclo; al vencer el periodo el acceso seguirá las reglas de la plataforma.
                </p>
              )}
            </div>
          </dl>
        </div>
      </section>

      {tenant.pendingPlan && (
        <section className="rounded-xl border border-blue-200 bg-blue-50 p-5 text-sm text-blue-950">
          <p className="font-semibold">Cambio de plan programado</p>
          <p className="mt-1">
            Pasarás a <strong>{tenant.pendingPlan.name}</strong> el{" "}
            {tenant.pendingPlanEffectiveAt
              ? new Date(tenant.pendingPlanEffectiveAt).toLocaleString("es")
              : "—"}
            .
          </p>
          <button
            type="button"
            disabled={paying === "clear_pending"}
            onClick={() => void clearPendingDowngrade()}
            className="mt-3 text-sm font-medium text-blue-900 underline"
          >
            Cancelar este cambio programado
          </button>
        </section>
      )}

      <section className="rounded-xl border border-[#E9EDEF] bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-[#111B21]">Cambiar de plan</h2>
        <p className="mt-1 text-sm text-[#667781]">
          <strong>Upgrade:</strong> pagas la diferencia prorrateada hasta el fin del periodo.{" "}
          <strong>Downgrade:</strong> se programa al final del periodo pagado.
        </p>

        <div className="mt-6 grid gap-8 lg:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold text-[#111B21]">Subir de plan</h3>
            {upgradeOptions.length === 0 ? (
              <p className="mt-2 text-sm text-[#667781]">Ya estás en el plan más alto disponible.</p>
            ) : (
              <>
                <select
                  className="mt-2 w-full rounded-lg border border-[#E9EDEF] px-3 py-2 text-sm"
                  value={upgradeTargetId}
                  onChange={(e) => setUpgradeTargetId(e.target.value)}
                >
                  <option value="">Elige un plan</option>
                  {upgradeOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {formatUsd(p.priceUsdCents)}/mes · {p.includedConversations.toLocaleString()} conv.
                    </option>
                  ))}
                </select>
                {previewLoading && <p className="mt-2 text-xs text-[#667781]">Calculando prorrateo…</p>}
                {preview && upgradeTargetId && (
                  <div className="mt-3 rounded-lg bg-[#f8f9fa] p-3 text-sm">
                    <p className="font-medium text-[#111B21]">{preview.targetPlan.name}</p>
                    <p className="mt-1 text-[#667781]">{preview.proration.summary}</p>
                    <p className="mt-2 font-semibold text-conversia-dark">
                      A pagar ahora: {formatUsd(preview.proration.amountUsdCents)}
                    </p>
                  </div>
                )}
                <button
                  type="button"
                  disabled={!upgradeTargetId || paying?.startsWith("upgrade") || previewLoading}
                  onClick={() => void pay("upgrade", upgradeTargetId)}
                  className="mt-3 w-full rounded-xl border border-conversia-primary bg-conversia-primary/10 py-2.5 text-sm font-semibold text-conversia-dark hover:bg-conversia-primary/20 disabled:opacity-50"
                >
                  {paying?.startsWith("upgrade") ? "Abriendo Bold…" : "Pagar upgrade (Bold)"}
                </button>
              </>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-[#111B21]">Bajar de plan</h3>
            {downgradeOptions.length === 0 ? (
              <p className="mt-2 text-sm text-[#667781]">No hay planes más bajos disponibles.</p>
            ) : (
              <>
                <select
                  className="mt-2 w-full rounded-lg border border-[#E9EDEF] px-3 py-2 text-sm"
                  value={downgradeTargetId}
                  onChange={(e) => setDowngradeTargetId(e.target.value)}
                >
                  <option value="">Elige un plan</option>
                  {downgradeOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {formatUsd(p.priceUsdCents)}/mes
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={!downgradeTargetId || paying === "downgrade"}
                  onClick={() => void scheduleDowngrade()}
                  className="mt-3 w-full rounded-xl border border-[#E9EDEF] bg-white py-2.5 text-sm font-semibold text-[#111B21] hover:bg-[#f8f9fa] disabled:opacity-50"
                >
                  {paying === "downgrade" ? "Guardando…" : "Programar al fin del periodo"}
                </button>
              </>
            )}
          </div>
        </div>

        <div className="mt-8 overflow-x-auto">
          <h3 className="text-sm font-semibold text-[#111B21]">Todos los planes</h3>
          <table className="mt-3 w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-[#E9EDEF] text-xs font-semibold uppercase text-[#667781]">
              <tr>
                <th className="py-2 pr-4">Plan</th>
                <th className="py-2 pr-4">Precio</th>
                <th className="py-2 pr-4">Conversaciones</th>
                <th className="py-2">Usuarios máx.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E9EDEF]">
              {plans.map((p) => (
                <tr key={p.id} className={p.id === tenant.plan?.id ? "bg-emerald-50/80" : ""}>
                  <td className="py-2 pr-4">
                    {p.name}
                    {p.id === tenant.plan?.id && (
                      <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-emerald-800">
                        Actual
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-4 tabular-nums">{formatUsd(p.priceUsdCents)}</td>
                  <td className="py-2 pr-4">{p.includedConversations.toLocaleString()} / mes</td>
                  <td className="py-2">{p.maxUsers}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-[#E9EDEF] bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-[#111B21]">Uso del mes</h2>
        <p className="mt-1 text-sm text-[#667781]">
          Conversaciones iniciadas en el mes calendario actual (tras el reset mensual).
        </p>
        <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-[#f0f2f5]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-conversia-dark to-conversia-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-2 text-sm font-medium text-[#111B21]">
          {used.toLocaleString()} / {quota.toLocaleString()} conversaciones
          {tenant.extraConversationPacks > 0 && (
            <span className="text-[#667781]">
              {" "}
              ({tenant.extraConversationPacks} pack(s) extra activos)
            </span>
          )}
        </p>
      </section>

      <section className="rounded-xl border border-[#E9EDEF] bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-[#111B21]">Packs extra</h2>
        {tenant.plan && planAllowsExtraConversationPacks(tenant.plan.slug) ? (
          <>
            <p className="mt-1 text-sm text-[#667781]">
              Solo en plan Empresa: cada pack suma +{tenant.plan.extraPackConversations.toLocaleString()}{" "}
              conversaciones por {formatUsd(tenant.plan.extraPackPriceUsdCents)} (hasta 24 packs por compra).
            </p>
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <label className="text-sm">
                <span className="text-[#667781]">Cantidad de packs</span>
                <input
                  type="number"
                  min={1}
                  max={24}
                  value={packs}
                  onChange={(e) => setPacks(Math.min(24, Math.max(1, Number(e.target.value) || 1)))}
                  className="ml-2 w-20 rounded-lg border border-[#E9EDEF] px-2 py-1"
                />
              </label>
              <button
                type="button"
                disabled={paying?.startsWith("extra_pack")}
                onClick={() => void pay("extra_pack")}
                className="rounded-xl border border-conversia-primary bg-conversia-primary/10 px-5 py-2.5 text-sm font-semibold text-conversia-dark hover:bg-conversia-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {paying?.startsWith("extra_pack") ? "Abriendo Bold…" : "Comprar packs con Bold"}
              </button>
            </div>
          </>
        ) : (
          <p className="mt-1 text-sm text-[#667781]">
            Los packs de +1.000 conversaciones por US$15 están disponibles únicamente en el plan{" "}
            <strong>Empresa</strong>. Sube de plan para habilitarlos.
          </p>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[#111B21]">Historial de pagos</h2>
        <div className="mt-3 overflow-hidden rounded-xl border border-[#E9EDEF]">
          {payments.length === 0 ? (
            <p className="p-6 text-center text-sm text-[#667781]">Aún no hay pagos registrados.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-[#f0f2f5] text-xs font-semibold uppercase text-[#667781]">
                <tr>
                  <th className="px-4 py-2">Fecha</th>
                  <th className="px-4 py-2">Tipo</th>
                  <th className="px-4 py-2">Monto</th>
                  <th className="px-4 py-2">Estado</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E9EDEF]">
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-2 whitespace-nowrap text-[#667781]">
                      {new Date(p.createdAt).toLocaleString("es")}
                    </td>
                    <td className="px-4 py-2">{p.type}</td>
                    <td className="px-4 py-2 tabular-nums">{formatUsd(p.amountUsdCents)}</td>
                    <td className="px-4 py-2 capitalize">{p.status}</td>
                    <td className="px-4 py-2 text-right">
                      {p.checkoutUrl && p.status === "pending" && (
                        <a
                          href={p.checkoutUrl}
                          className="text-sm font-medium text-conversia-dark underline"
                        >
                          Continuar pago
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <p className="text-xs text-[#667781]">
        Los pagos se procesan en Bold en dólares (USD). Tras pagar, el webhook marca el recibo y actualiza tu
        suscripción o packs.{" "}
        <Link href="/dashboard/documentacion" className="text-conversia-dark underline">
          Documentación
        </Link>
      </p>
    </div>
  );
}
