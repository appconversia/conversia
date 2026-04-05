"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type BillingPayload = {
  ok: boolean;
  code?: string;
  message?: string;
  tenant: {
    name: string;
    billingStatus: string;
    subscriptionStartAt: string | null;
    subscriptionEndAt: string | null;
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

function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export default function BillingPage() {
  const [data, setData] = useState<BillingPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<string | null>(null);
  const [packs, setPacks] = useState(1);
  const [now, setNow] = useState(() => Date.now());

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
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const pay = async (type: "subscription" | "extra_pack") => {
    setPaying(type);
    try {
      const r = await fetch("/api/billing/checkout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, packs: type === "extra_pack" ? packs : undefined }),
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

  const { tenant, payments, ok, code, message } = data;
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
      <div>
        <h1 className="text-2xl font-bold text-[#111B21]">Facturación</h1>
        <p className="mt-1 text-[#667781]">
          Plan, uso de conversaciones del mes y pagos con Bold (USD). Comercio:{" "}
          <span className="font-medium text-[#111B21]">{tenant.name}</span>
        </p>
      </div>

      {!ok && (code === "expired" || code === "suspended" || code === "inactive") && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-950">
          <p className="font-semibold">Servicio restringido</p>
          <p className="mt-1 text-sm">{message}</p>
          <p className="mt-2 text-sm">
            Renueva o regulariza el pago para volver a usar conversaciones y el bot.
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
          <button
            type="button"
            disabled={!tenant.plan || paying === "subscription"}
            onClick={() => void pay("subscription")}
            className="mt-4 w-full rounded-xl bg-conversia-primary py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-conversia-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {paying === "subscription" ? "Abriendo Bold…" : "Pagar suscripción con Bold"}
          </button>
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
          </dl>
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
        <p className="mt-1 text-sm text-[#667781]">
          Añade conversaciones sin cambiar de plan. Cada pack suma el cupo indicado en tu plan.
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
            disabled={!tenant.plan || paying === "extra_pack"}
            onClick={() => void pay("extra_pack")}
            className="rounded-xl border border-conversia-primary bg-conversia-primary/10 px-5 py-2.5 text-sm font-semibold text-conversia-dark hover:bg-conversia-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {paying === "extra_pack" ? "Abriendo Bold…" : "Comprar packs con Bold"}
          </button>
        </div>
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
