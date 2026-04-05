"use client";

import { useCallback, useEffect, useState } from "react";

export default function PlatformPagosPage() {
  const [preview, setPreview] = useState<string | null>(null);
  const [sandbox, setSandbox] = useState(false);
  const [secretSet, setSecretSet] = useState(false);
  const [identityKey, setIdentityKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://tu-dominio.vercel.app";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/platform/settings", { credentials: "include", cache: "no-store" });
      const j = await r.json();
      if (r.ok) {
        setPreview(j.boldIdentityKeyPreview ?? null);
        setSandbox(!!j.boldUseSandbox);
        setSecretSet(!!j.boldSecretKeySet);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const r = await fetch("/api/platform/settings", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          boldIdentityKey: identityKey.trim() || undefined,
          boldSecretKey: secretKey.trim() || undefined,
          boldUseSandbox: sandbox,
        }),
      });
      const j = await r.json();
      if (!r.ok) {
        setMsg(j.error ?? "Error al guardar");
        return;
      }
      setMsg("Guardado. La pasarela usará estas credenciales para todos los comercios.");
      setIdentityKey("");
      setSecretKey("");
      void load();
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-[#667781]">Cargando…</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#111B21]">Pagos Bold (USD)</h1>
        <p className="mt-1 text-[#667781]">
          Configura la llave de identidad de Bold para generar links de pago en dólares para cada comercio. La
          tienda en Bold debe estar en <strong>USD</strong>.
        </p>
      </div>

      <div className="rounded-xl border border-[#E9EDEF] bg-[#f8faf9] p-5 text-sm text-[#334a40]">
        <p className="font-semibold text-[#111B21]">Webhook (notificaciones de pago)</p>
        <p className="mt-2">
          Registra esta URL pública en el panel de Bold para marcar pagos como pagados y activar suscripción o
          packs:
        </p>
        <code className="mt-2 block break-all rounded-lg bg-white px-3 py-2 text-xs text-[#075E54]">
          {origin}/api/webhook/bold
        </code>
        <p className="mt-3 text-xs text-[#667781]">
          Documentación:{" "}
          <a
            href="https://developers.bold.co/pagos-en-linea/api-integration"
            target="_blank"
            rel="noopener noreferrer"
            className="text-conversia-dark underline"
          >
            developers.bold.co — API de links de pago
          </a>
        </p>
      </div>

      <form onSubmit={(e) => void save(e)} className="max-w-xl space-y-4 rounded-xl border border-[#E9EDEF] bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[#111B21]">Credenciales</h2>
        {preview && (
          <p className="text-sm text-[#667781]">
            Llave de identidad guardada: <span className="font-mono text-[#111B21]">{preview}</span>
          </p>
        )}
        <label className="block text-sm">
          <span className="text-[#667781]">Nueva llave de identidad (x-api-key)</span>
          <input
            type="password"
            autoComplete="off"
            value={identityKey}
            onChange={(e) => setIdentityKey(e.target.value)}
            placeholder="Pegar para reemplazar"
            className="mt-1 w-full rounded-lg border border-[#E9EDEF] px-3 py-2 font-mono text-sm"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={sandbox} onChange={(e) => setSandbox(e.target.checked)} />
          <span className="text-[#667781]">Usar ambiente sandbox (pruebas)</span>
        </label>
        {secretSet && (
          <p className="text-sm text-[#667781]">Llave secreta (webhook) ya configurada.</p>
        )}
        <label className="block text-sm">
          <span className="text-[#667781]">Llave secreta (opcional, verificación webhook)</span>
          <input
            type="password"
            autoComplete="off"
            value={secretKey}
            onChange={(e) => setSecretKey(e.target.value)}
            placeholder="Opcional — reservado para firma HMAC si Bold lo exige"
            className="mt-1 w-full rounded-lg border border-[#E9EDEF] px-3 py-2 font-mono text-sm"
          />
        </label>
        {msg && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            {msg}
          </div>
        )}
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-conversia-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-conversia-primary-hover disabled:opacity-60"
        >
          {saving ? "Guardando…" : "Guardar"}
        </button>
      </form>
    </div>
  );
}
