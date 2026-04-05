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
      setMsg(
        "Guardado. Usa las llaves de «Botón de pagos» en bold.co → Integraciones → Llaves de integración."
      );
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
        <h1 className="text-2xl font-bold text-[#111B21]">Bold — Botón de pagos (USD)</h1>
        <p className="mt-1 text-[#667781]">
          Integración oficial:{" "}
          <strong>Llaves de integración para botón de pagos</strong> (producción o pruebas). La{" "}
          <strong>llave de identidad</strong> va en el header <code className="text-xs">Authorization: x-api-key …</code>{" "}
          al crear links. La <strong>llave secreta</strong> valida el webhook (
          <a
            href="https://developers.bold.co/webhook"
            target="_blank"
            rel="noopener noreferrer"
            className="text-conversia-dark underline"
          >
            firma HMAC
          </a>
          ). Documentación:{" "}
          <a
            href="https://developers.bold.co/pagos-en-linea/llaves-de-integracion"
            target="_blank"
            rel="noopener noreferrer"
            className="text-conversia-dark underline"
          >
            Llaves de integración
          </a>
          ,{" "}
          <a
            href="https://developers.bold.co/pagos-en-linea/api-integration"
            target="_blank"
            rel="noopener noreferrer"
            className="text-conversia-dark underline"
          >
            API Link de pagos
          </a>
          .
        </p>
      </div>

      <div className="rounded-xl border border-[#E9EDEF] bg-[#f8faf9] p-5 text-sm text-[#334a40]">
        <p className="font-semibold text-[#111B21]">Webhook en Panel de Comercios Bold</p>
        <ol className="mt-3 list-decimal space-y-2 pl-5">
          <li>
            <a href="https://comercios.bold.co" target="_blank" rel="noopener noreferrer" className="underline">
              comercios.bold.co
            </a>{" "}
            → <strong>Integraciones</strong> → activa llaves de <strong>Botón de pagos</strong> si aún no lo hiciste.
          </li>
          <li>
            <strong>Webhooks</strong> → Configurar webhook → URL de punto de conexión:
          </li>
        </ol>
        <code className="mt-2 block break-all rounded-lg bg-white px-3 py-2 text-xs text-[#075E54]">
          {origin}/api/webhook/bold
        </code>
        <p className="mt-3 text-xs text-[#667781]">
          Debes guardar aquí la <strong>misma llave secreta</strong> que ves en Bold (producción). Con «Usar ambiente
          sandbox» la firma usa clave vacía, como indica Bold para pruebas.
        </p>
      </div>

      <form
        onSubmit={(e) => void save(e)}
        className="max-w-xl space-y-4 rounded-xl border border-[#E9EDEF] bg-white p-6 shadow-sm"
      >
        <h2 className="text-lg font-semibold text-[#111B21]">Credenciales (mismo par que en Bold)</h2>
        {preview && (
          <p className="text-sm text-[#667781]">
            Llave de identidad guardada: <span className="font-mono text-[#111B21]">{preview}</span>
          </p>
        )}
        <label className="block text-sm">
          <span className="font-medium text-[#111B21]">Llave de identidad</span>
          <span className="block text-[#667781]">Pégala desde Bold → Integraciones → Llaves → Botón de pagos.</span>
          <input
            type="password"
            autoComplete="off"
            value={identityKey}
            onChange={(e) => setIdentityKey(e.target.value)}
            placeholder="Reemplazar si rotaste llaves"
            className="mt-1 w-full rounded-lg border border-[#E9EDEF] px-3 py-2 font-mono text-sm"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={sandbox} onChange={(e) => setSandbox(e.target.checked)} />
          <span className="text-[#667781]">Usar ambiente de pruebas (llaves de prueba + firma con clave vacía)</span>
        </label>
        {secretSet && (
          <p className="text-sm text-emerald-800">Llave secreta guardada en servidor (no se muestra).</p>
        )}
        <label className="block text-sm">
          <span className="font-medium text-[#111B21]">Llave secreta</span>
          <span className="block text-[#667781]">
            Obligatoria en producción para aceptar webhooks. No la expongas al frontend.
          </span>
          <input
            type="password"
            autoComplete="off"
            value={secretKey}
            onChange={(e) => setSecretKey(e.target.value)}
            placeholder="Pegar llave secreta de producción o pruebas según el checkbox"
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
