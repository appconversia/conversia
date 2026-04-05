"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type ProductImage = {
  id: string;
  name: string;
  url: string;
  description: string;
  order: number;
};

type ConfigState = {
  whatsapp: {
    accessToken: string;
    accessTokenMasked: boolean;
    phoneNumberId: string;
    businessAccountId: string;
    webhookVerifyToken: string;
    appSecretMasked?: boolean;
    metaAppId: string;
    enabled: boolean;
    webhookUrl: string;
  };
  bot?: {
    defaultProvider: string;
    enabled: boolean;
    model: string;
    systemPrompt: string;
    openaiApiKeyMasked?: boolean;
    anthropicApiKeyMasked?: boolean;
    googleApiKeyMasked?: boolean;
  };
  appBaseUrl: string;
};

export default function ConfiguracionPage() {
  const router = useRouter();
  const [config, setConfig] = useState<ConfigState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const [form, setForm] = useState({
    accessToken: "",
    phoneNumberId: "",
    businessAccountId: "",
    webhookVerifyToken: "",
    metaAppId: "",
    /** Nuevo valor; vacío = no cambiar (salvo clearMetaAppSecret) */
    metaAppSecret: "",
    clearMetaAppSecret: false,
    enabled: false,
    appBaseUrl: "",
  });
  const [botForm, setBotForm] = useState({
    defaultProvider: "openai" as "openai" | "anthropic" | "google",
    enabled: false,
    model: "",
    systemPrompt: "",
    openaiApiKey: "",
    anthropicApiKey: "",
    googleApiKey: "",
  });

  const [productCatalog, setProductCatalog] = useState<ProductImage[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogSaving, setCatalogSaving] = useState(false);
  const [catalogSyncing, setCatalogSyncing] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: "", url: "", description: "" });
  const [registeringWhatsApp, setRegisteringWhatsApp] = useState(false);
  const [subscribeLoading, setSubscribeLoading] = useState(false);
  const [registerPin, setRegisterPin] = useState("");
  const [diagnostics, setDiagnostics] = useState<{
    loading: boolean;
    data: { ok?: boolean; results?: Record<string, { ok: boolean; message: string }>; hints?: string[] } | null;
  }>({ loading: false, data: null });

  const [profile, setProfile] = useState<{
    about?: string;
    address?: string;
    description?: string;
    email?: string;
    profile_picture_url?: string;
    vertical?: string;
    websites?: string[];
  } | null>(null);
  const [profileForm, setProfileForm] = useState({
    about: "",
    address: "",
    description: "",
    email: "",
    vertical: "",
    websites: ["", ""],
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profilePhotoUploading, setProfilePhotoUploading] = useState(false);
  const [profileToast, setProfileToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [verticalOptions, setVerticalOptions] = useState<{ value: string; label: string }[]>([]);

  const [businessHours, setBusinessHours] = useState<{
    timezone: string;
    schedule: { dayOfWeek: number; start: string; end: string; enabled: boolean }[];
  } | null>(null);
  const [businessHoursLoading, setBusinessHoursLoading] = useState(false);
  const [businessHoursSaving, setBusinessHoursSaving] = useState(false);
  const [businessHoursToast, setBusinessHoursToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const loadCatalog = async () => {
    setCatalogLoading(true);
    try {
      const r = await fetch("/api/bot/product-catalog");
      if (r.ok) {
        const data = await r.json();
        setProductCatalog(data);
      }
    } catch {
      // Ignorar si falla (ej. sin permisos)
    } finally {
      setCatalogLoading(false);
    }
  };

  const loadConfig = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/config");
      if (r.status === 401) {
        router.replace("/login");
        return;
      }
      if (r.status === 403) {
        router.replace("/dashboard");
        return;
      }
      const data = await r.json();
      setConfig(data);
      setForm({
        accessToken: "",
        phoneNumberId: data.whatsapp?.phoneNumberId ?? "",
        businessAccountId: data.whatsapp?.businessAccountId ?? "",
        webhookVerifyToken: data.whatsapp?.webhookVerifyToken ?? "",
        metaAppId: data.whatsapp?.metaAppId ?? "",
        metaAppSecret: "",
        clearMetaAppSecret: false,
        enabled: data.whatsapp?.enabled ?? false,
        appBaseUrl: data.appBaseUrl ?? "",
      });
      const validProvider = ["openai", "anthropic", "google"].includes(data.bot?.defaultProvider)
        ? data.bot.defaultProvider
        : "openai";
      setBotForm({
        defaultProvider: validProvider as "openai" | "anthropic" | "google",
        enabled: data.bot?.enabled ?? false,
        model: data.bot?.model ?? "",
        systemPrompt: data.bot?.systemPrompt ?? "",
        openaiApiKey: "",
        anthropicApiKey: "",
        googleApiKey: "",
      });
    } catch {
      setError("Error al cargar la configuración");
    } finally {
      setLoading(false);
    }
  };

  const loadProfile = async () => {
    if (!config?.whatsapp?.phoneNumberId) return;
    setProfileLoading(true);
    setProfileToast(null);
    try {
      const r = await fetch("/api/whatsapp/business-profile");
      const data = await r.json().catch(() => ({}));
      if (r.ok && data.profile) {
        const p = data.profile as typeof profile;
        setProfile(p);
        setProfileForm({
          about: p?.about ?? "",
          address: p?.address ?? "",
          description: p?.description ?? "",
          email: p?.email ?? "",
          vertical: p?.vertical ?? "",
          websites: Array.isArray(p?.websites) ? [p.websites[0] ?? "", p.websites[1] ?? ""] : ["", ""],
        });
        if (Array.isArray(data.verticalOptions)) setVerticalOptions(data.verticalOptions);
      } else if (data.verticalOptions) {
        setVerticalOptions(data.verticalOptions);
      }
    } catch {
      setProfileToast({ message: "Error al cargar perfil de negocio", type: "error" });
    } finally {
      setProfileLoading(false);
    }
  };

  const loadBusinessHours = async () => {
    setBusinessHoursLoading(true);
    setBusinessHoursToast(null);
    try {
      const r = await fetch("/api/config/business-hours");
      if (r.ok) {
        const data = await r.json();
        const schedule = data.schedule ?? [];
        const fullSchedule = [0, 1, 2, 3, 4, 5, 6].map((d) => {
          const found = schedule.find((s: { dayOfWeek: number }) => s.dayOfWeek === d);
          return found ?? { dayOfWeek: d, start: "09:00", end: "18:00", enabled: d >= 1 && d <= 5 };
        });
        setBusinessHours({
          timezone: data.timezone ?? "America/Bogota",
          schedule: fullSchedule,
        });
      } else if (r.status === 403) {
        setBusinessHoursToast({ message: "Solo super administradores pueden configurar el horario", type: "error" });
      } else {
        setBusinessHoursToast({ message: "Error al cargar horario", type: "error" });
      }
    } catch {
      setBusinessHoursToast({ message: "Error al cargar horario", type: "error" });
    } finally {
      setBusinessHoursLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
    loadCatalog();
    loadBusinessHours();
  }, []);

  useEffect(() => {
    if (config?.whatsapp?.phoneNumberId) loadProfile();
  }, [config?.whatsapp?.phoneNumberId]);

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newProduct.name.trim();
    const url = newProduct.url.trim();
    if (!name || !url) return;
    setProductCatalog((prev) => [
      ...prev,
      {
        id: crypto.randomUUID?.() ?? `p-${Date.now()}`,
        name,
        url,
        description: newProduct.description.trim(),
        order: prev.length,
      },
    ]);
    setNewProduct({ name: "", url: "", description: "" });
  };

  const handleRemoveProduct = (id: string) => {
    setProductCatalog((prev) => prev.filter((p) => p.id !== id));
  };

  const handleSyncFromProducts = async () => {
    setCatalogSyncing(true);
    setToast(null);
    try {
      const r = await fetch("/api/products/sync-bot", { method: "POST" });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Error al sincronizar");
      setToast({ message: data.message ?? "Catálogo sincronizado desde Productos", type: "success" });
      await loadCatalog();
    } catch (e) {
      setToast({ message: e instanceof Error ? e.message : "Error al sincronizar", type: "error" });
    } finally {
      setCatalogSyncing(false);
    }
  };

  const handleSaveCatalog = async (e: React.FormEvent) => {
    e.preventDefault();
    setCatalogSaving(true);
    setToast(null);
    try {
      const r = await fetch("/api/bot/product-catalog", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productCatalog.map((p, i) => ({ ...p, order: i }))),
      });
      const data = await r.json();
      if (!r.ok) {
        setToast({ message: data.error ?? "Error al guardar catálogo", type: "error" });
        return;
      }
      setProductCatalog(data);
      setToast({ message: "Catálogo guardado correctamente", type: "success" });
    } catch {
      setToast({ message: "Error de conexión al guardar catálogo", type: "error" });
    } finally {
      setCatalogSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setToast(null);
    try {
      const r = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          whatsapp: {
            accessToken: form.accessToken.trim() || undefined,
            phoneNumberId: form.phoneNumberId.trim(),
            businessAccountId: form.businessAccountId.trim(),
            webhookVerifyToken: form.webhookVerifyToken.trim(),
            metaAppId: form.metaAppId.trim(),
            ...(form.clearMetaAppSecret
              ? { appSecret: "" }
              : form.metaAppSecret.trim()
                ? { appSecret: form.metaAppSecret.trim() }
                : {}),
            enabled: form.enabled,
          },
          appBaseUrl: form.appBaseUrl.trim(),
          bot: {
            defaultProvider: botForm.defaultProvider,
            enabled: botForm.enabled,
            model: botForm.model.trim() || undefined,
            systemPrompt: botForm.systemPrompt.trim() || undefined,
            openaiApiKey: botForm.openaiApiKey.trim() || undefined,
            anthropicApiKey: botForm.anthropicApiKey.trim() || undefined,
            googleApiKey: botForm.googleApiKey.trim() || undefined,
          },
        }),
      });
      const data = await r.json();
      if (!r.ok) {
        setError(data.error ?? "Error al guardar");
        return;
      }
      setConfig(data);
      setForm((prev) => ({
        ...prev,
        accessToken: "",
        metaAppSecret: "",
        clearMetaAppSecret: false,
      }));
      if (data.bot) {
        setBotForm((prev) => ({
          ...prev,
          defaultProvider: data.bot.defaultProvider ?? prev.defaultProvider,
          enabled: data.bot.enabled ?? prev.enabled,
          model: data.bot.model ?? prev.model,
          systemPrompt: data.bot.systemPrompt ?? prev.systemPrompt,
          openaiApiKey: "",
          anthropicApiKey: "",
          googleApiKey: "",
        }));
      }
      setToast({ message: "Configuración guardada correctamente", type: "success" });
    } catch {
      setError("Error de conexión al guardar");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-conversia-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <>
      <div className="mb-6">
        <Link
          href="/dashboard/configuracion"
          className="inline-flex items-center gap-1 text-sm font-medium text-conversia-primary hover:underline"
        >
          ← Volver a Configuración
        </Link>
      </div>
      <form onSubmit={handleSubmit} className="space-y-8 max-w-2xl">
      {toast && (
        <div
          className={`rounded-lg px-4 py-3 ${
            toast.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
          }`}
        >
          {toast.message}
        </div>
      )}
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-red-800">{error}</div>
      )}

      {/* WhatsApp API */}
      <section className="rounded-xl border border-[#E9EDEF] bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-conversia-primary/20">
            <svg className="h-6 w-6 text-conversia-primary" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[#111B21]">WhatsApp Cloud API</h2>
            <p className="text-sm text-[#667781]">
              Conecta la app para recibir y enviar mensajes de clientes (respeta políticas Meta)
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
              className="h-4 w-4 rounded border-gray-300 text-conversia-primary focus:ring-conversia-primary"
            />
            <span className="text-sm font-medium text-[#111B21]">Activar integración WhatsApp</span>
          </label>

          <div>
            <label className="mb-1 block text-sm font-medium text-[#111B21]">Access Token</label>
            <input
              type="password"
              value={form.accessToken}
              onChange={(e) => setForm((f) => ({ ...f, accessToken: e.target.value }))}
              placeholder={config?.whatsapp?.accessTokenMasked ? "•••••••• (dejar vacío para mantener actual)" : "EAAxxxxxxxx..."}
              className="w-full rounded-lg border border-[#E9EDEF] px-3 py-2 text-sm text-[#111B21] placeholder:text-[#667781] focus:border-conversia-primary focus:outline-none focus:ring-1 focus:ring-conversia-primary"
              autoComplete="off"
            />
            <p className="mt-1 text-xs text-[#667781]">
              Meta for Developers → Tu App → WhatsApp → Getting started. Usa token temporal o System User permanente.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[#111B21]">Phone Number ID</label>
            <input
              type="text"
              value={form.phoneNumberId}
              onChange={(e) => setForm((f) => ({ ...f, phoneNumberId: e.target.value }))}
              placeholder="123456789012345"
              className="w-full rounded-lg border border-[#E9EDEF] px-3 py-2 text-sm text-[#111B21] placeholder:text-[#667781] focus:border-conversia-primary focus:outline-none focus:ring-1 focus:ring-conversia-primary"
            />
            <p className="mt-1 text-xs text-[#667781]">WhatsApp → Getting started → Phone number ID</p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[#111B21]">WhatsApp Business Account ID</label>
            <input
              type="text"
              value={form.businessAccountId}
              onChange={(e) => setForm((f) => ({ ...f, businessAccountId: e.target.value }))}
              placeholder="123456789012345"
              className="w-full rounded-lg border border-[#E9EDEF] px-3 py-2 text-sm text-[#111B21] placeholder:text-[#667781] focus:border-conversia-primary focus:outline-none focus:ring-1 focus:ring-conversia-primary"
            />
            <p className="mt-1 text-xs text-[#667781]">WhatsApp → Getting started → Business account ID</p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[#111B21]">App ID (Meta)</label>
            <input
              type="text"
              inputMode="numeric"
              value={form.metaAppId}
              onChange={(e) => setForm((f) => ({ ...f, metaAppId: e.target.value.replace(/[^\d]/g, "") }))}
              placeholder="Ej. 123456789012345"
              className="w-full rounded-lg border border-[#E9EDEF] px-3 py-2 text-sm text-[#111B21] placeholder:text-[#667781] focus:border-conversia-primary focus:outline-none focus:ring-1 focus:ring-conversia-primary"
              autoComplete="off"
            />
            <p className="mt-1 text-xs text-[#667781]">
              developers.facebook.com → Tu app → Información básica → «ID de aplicación». Necesario para subir la foto de perfil del número (Resumable Upload).
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[#111B21]">Webhook Verify Token</label>
            <input
              type="text"
              value={form.webhookVerifyToken}
              onChange={(e) => setForm((f) => ({ ...f, webhookVerifyToken: e.target.value }))}
              placeholder="mi_token_secreto_webhook"
              className="w-full rounded-lg border border-[#E9EDEF] px-3 py-2 text-sm text-[#111B21] placeholder:text-[#667781] focus:border-conversia-primary focus:outline-none focus:ring-1 focus:ring-conversia-primary"
              autoComplete="off"
            />
            <p className="mt-1 text-xs text-[#667781]">
              Token que tú defines. Debe coincidir con el que introduces en Meta al configurar el webhook.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[#111B21]">App Secret (Meta)</label>
            <input
              type="password"
              value={form.metaAppSecret}
              onChange={(e) => setForm((f) => ({ ...f, metaAppSecret: e.target.value, clearMetaAppSecret: false }))}
              placeholder={
                config?.whatsapp?.appSecretMasked
                  ? "•••••••• (dejar vacío para no cambiar)"
                  : "Pegar desde Meta → Tu app → Configuración → Básico → Secreto de la app"
              }
              className="w-full rounded-lg border border-[#E9EDEF] px-3 py-2 text-sm text-[#111B21] placeholder:text-[#667781] focus:border-conversia-primary focus:outline-none focus:ring-1 focus:ring-conversia-primary"
              autoComplete="off"
            />
            <p className="mt-1 text-xs text-[#667781]">
              Obligatorio en producción: verifica la firma <code className="rounded bg-[#F0F2F5] px-1">X-Hub-Signature-256</code> de
              Meta. Debe ser el <strong>Secreto de la app</strong> de la misma app de Meta que usa este comercio (developers.facebook.com →
              Tu app → Configuración → Básico).
            </p>
            {config?.whatsapp?.appSecretMasked && (
              <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm text-[#667781]">
                <input
                  type="checkbox"
                  checked={form.clearMetaAppSecret}
                  onChange={(e) => setForm((f) => ({ ...f, clearMetaAppSecret: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300 text-conversia-primary"
                />
                Eliminar App Secret guardado para este comercio
              </label>
            )}
          </div>

          {config?.whatsapp?.webhookUrl && (
            <div className="rounded-lg bg-[#F0F2F5] p-4">
              <p className="mb-1 text-xs font-medium text-[#667781]">URL de webhook (configurar en Meta)</p>
              <p className="break-all font-mono text-sm text-[#111B21]">{config?.whatsapp?.webhookUrl}</p>
              <p className="mt-2 text-xs text-[#667781]">
                En Meta: App → WhatsApp → Configuration → Webhook → Callback URL y Verify token.
              </p>
              <div className="mt-3 flex flex-wrap items-end gap-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#667781]">PIN de verificación (6 dígitos)</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={registerPin}
                    onChange={(e) => setRegisterPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="123456"
                    className="w-28 rounded-lg border border-[#E9EDEF] px-3 py-2 text-sm font-mono tracking-widest placeholder:text-[#667781] focus:border-conversia-primary focus:outline-none focus:ring-1 focus:ring-conversia-primary"
                    autoComplete="one-time-code"
                  />
                </div>
                <button
                  type="button"
                  disabled={registeringWhatsApp || !registerPin || registerPin.length !== 6 || !form.phoneNumberId || (!form.accessToken && !config?.whatsapp?.accessTokenMasked)}
                  onClick={async () => {
                    setRegisteringWhatsApp(true);
                    setToast(null);
                    try {
                      const r = await fetch("/api/whatsapp/register", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ pin: registerPin }),
                      });
                      const data = await r.json().catch(() => ({}));
                      if (r.ok) {
                        setToast({ message: data.message ?? "Número registrado", type: "success" });
                        setRegisterPin("");
                      } else {
                        setToast({ message: data.error ?? "Error al registrar", type: "error" });
                      }
                    } catch {
                      setToast({ message: "Error de conexión", type: "error" });
                    } finally {
                      setRegisteringWhatsApp(false);
                    }
                  }}
                  className="rounded-lg bg-conversia-primary px-4 py-2 text-sm font-medium text-white hover:bg-[#20BD5C] disabled:opacity-50"
                >
                  {registeringWhatsApp ? "Registrando…" : "Registrar número en Meta"}
                </button>
              </div>
              <p className="mt-1 text-xs text-[#667781]">
                PIN de verificación en dos pasos (2FA) que configuraste en WhatsApp Business. Obligatorio para pasar de Pendiente a activo.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={subscribeLoading || !form.businessAccountId || (!form.accessToken && !config?.whatsapp?.accessTokenMasked)}
                  onClick={async () => {
                    setSubscribeLoading(true);
                    setToast(null);
                    try {
                      const r = await fetch("/api/whatsapp/subscribe", { method: "POST" });
                      const data = await r.json().catch(() => ({}));
                      if (r.ok) {
                        setToast({ message: data.message ?? "Webhook suscrito", type: "success" });
                      } else {
                        setToast({ message: data.error ?? "Error al suscribir", type: "error" });
                      }
                    } catch {
                      setToast({ message: "Error de conexión", type: "error" });
                    } finally {
                      setSubscribeLoading(false);
                    }
                  }}
                  className="rounded-lg bg-[#128C7E] px-4 py-2 text-sm font-medium text-white hover:bg-[#0a6e62] disabled:opacity-50"
                >
                  {subscribeLoading ? "Suscribiendo…" : "Suscribir webhook"}
                </button>
                <button
                  type="button"
                  disabled={diagnostics.loading || !form.phoneNumberId || (!form.accessToken && !config?.whatsapp?.accessTokenMasked)}
                  onClick={async () => {
                    setDiagnostics({ loading: true, data: null });
                    try {
                      const r = await fetch("/api/whatsapp/diagnostics");
                      const data = await r.json().catch(() => ({}));
                      setDiagnostics({ loading: false, data });
                    } catch {
                      setDiagnostics({ loading: false, data: { ok: false, results: {}, hints: ["Error de conexión"] } });
                    }
                  }}
                  className="rounded-lg border border-conversia-primary bg-white px-4 py-2 text-sm font-medium text-conversia-primary hover:bg-conversia-primary/5 disabled:opacity-50"
                >
                  {diagnostics.loading ? "Verificando…" : "Verificar conexión Meta"}
                </button>
              </div>
              <p className="mt-2 text-xs text-[#667781]">
                Si los mensajes no llegan a la app, haz clic en &quot;Suscribir webhook&quot; para conectar Meta con nuestro servidor.
              </p>
              {diagnostics.data && (
                <div className={`mt-3 rounded-lg p-3 text-sm ${diagnostics.data.ok ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-900"}`}>
                  {diagnostics.data.results && (
                    <ul className="space-y-1">
                      {Object.entries(diagnostics.data.results).map(([k, v]) => (
                        <li key={k}>
                          <span className="font-medium">{k}:</span> {v.ok ? "✅" : "❌"} {v.message}
                        </li>
                      ))}
                    </ul>
                  )}
                  {diagnostics.data.hints && diagnostics.data.hints.length > 0 && (
                    <ul className="mt-2 space-y-1 border-t border-amber-200 pt-2 text-xs">
                      {diagnostics.data.hints.map((h, i) => (
                        <li key={i}>• {h}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}
          <div className="rounded-lg bg-amber-50 p-4">
            <p className="mb-2 text-xs font-medium text-amber-900">URLs para Meta Developer (Información básica)</p>
            <p className="text-xs text-amber-800">
              Para pasar de prueba a producción, configura en Meta: Política de privacidad, Términos del servicio y Eliminación de datos.
            </p>
            <ul className="mt-2 space-y-1 text-xs text-amber-800">
              <li>
                <a href="/privacidad" target="_blank" rel="noopener noreferrer" className="text-conversia-primary underline">
                  /privacidad
                </a>
              </li>
              <li>
                <a href="/terminos" target="_blank" rel="noopener noreferrer" className="text-conversia-primary underline">
                  /terminos
                </a>
              </li>
              <li>
                <a href="/eliminacion-datos" target="_blank" rel="noopener noreferrer" className="text-conversia-primary underline">
                  /eliminacion-datos
                </a>
              </li>
            </ul>
            <p className="mt-2 text-xs text-amber-700">
              Usa la URL base de tu app (ej.{" "}
              {config?.whatsapp?.webhookUrl?.replace(/\/api\/webhook\/whatsapp.*$/, "") || form.appBaseUrl || config?.appBaseUrl || ""}
              ) + la ruta.
            </p>
          </div>
        </div>
      </section>

      {/* Perfil de negocio WhatsApp */}
      <section className="rounded-xl border border-[#E9EDEF] bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-conversia-primary/20">
            <svg className="h-6 w-6 text-conversia-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[#111B21]">Perfil de negocio WhatsApp</h2>
            <p className="text-sm text-[#667781]">
              Información visible para los clientes en tu número de negocio (about, dirección, email, webs)
            </p>
          </div>
        </div>
        {profileToast && (
          <div
            className={`mb-4 rounded-lg px-4 py-3 ${profileToast.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}
          >
            {profileToast.message}
          </div>
        )}
        {!form.phoneNumberId ? (
          <p className="text-sm text-[#667781]">Configura Phone Number ID en la sección superior para cargar y editar el perfil.</p>
        ) : profileLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-conversia-primary border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="flex flex-col items-center gap-2">
                {profile?.profile_picture_url && profile.profile_picture_url.startsWith("http") ? (
                  <img
                    src={profile.profile_picture_url}
                    alt="Foto actual"
                    className="h-20 w-20 rounded-full object-cover border-2 border-[#E9EDEF]"
                  />
                ) : (
                  <div className="h-20 w-20 rounded-full bg-[#E9EDEF] flex items-center justify-center text-[#667781] text-2xl font-semibold">
                    ?
                  </div>
                )}
                <label className="cursor-pointer">
                  <span className="rounded-lg border border-conversia-primary px-3 py-2 text-sm font-medium text-conversia-primary hover:bg-conversia-primary/5 inline-block">
                    {profilePhotoUploading ? "Subiendo…" : "Cambiar foto"}
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png"
                    className="hidden"
                    disabled={profilePhotoUploading}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (!file || file.size > 5 * 1024 * 1024) {
                        setProfileToast({ message: "Imagen JPG/PNG, máximo 5 MB", type: "error" });
                        return;
                      }
                      setProfilePhotoUploading(true);
                      setProfileToast(null);
                      try {
                        const fd = new FormData();
                        fd.append("file", file);
                        const r = await fetch("/api/whatsapp/business-profile/photo", {
                          method: "POST",
                          body: fd,
                        });
                        const data = await r.json().catch(() => ({}));
                        if (r.ok) {
                          setProfileToast({ message: "Foto actualizada", type: "success" });
                          loadProfile();
                        } else {
                          setProfileToast({ message: data.error ?? "Error al subir foto", type: "error" });
                        }
                      } catch {
                        setProfileToast({ message: "Error de conexión", type: "error" });
                      } finally {
                        setProfilePhotoUploading(false);
                      }
                    }}
                  />
                </label>
                <p className="text-xs text-[#667781]">640×640, JPG/PNG, máx. 5 MB</p>
              </div>
              <div className="flex-1 space-y-3 min-w-0">
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#111B21]">Acerca de (1-139 caracteres)</label>
                  <input
                    type="text"
                    value={profileForm.about}
                    onChange={(e) => setProfileForm((f) => ({ ...f, about: e.target.value.slice(0, 139) }))}
                    placeholder="Breve descripción del negocio"
                    className="w-full rounded-lg border border-[#E9EDEF] px-3 py-2 text-sm placeholder:text-[#667781] focus:border-conversia-primary focus:outline-none focus:ring-1 focus:ring-conversia-primary"
                    maxLength={139}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#111B21]">Descripción (opcional, hasta 512)</label>
                  <textarea
                    value={profileForm.description}
                    onChange={(e) => setProfileForm((f) => ({ ...f, description: e.target.value.slice(0, 512) }))}
                    placeholder="Descripción del negocio"
                    className="w-full rounded-lg border border-[#E9EDEF] px-3 py-2 text-sm placeholder:text-[#667781] focus:border-conversia-primary focus:outline-none focus:ring-1 focus:ring-conversia-primary"
                    rows={2}
                    maxLength={512}
                  />
                </div>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#111B21]">Dirección (opcional)</label>
              <input
                type="text"
                value={profileForm.address}
                onChange={(e) => setProfileForm((f) => ({ ...f, address: e.target.value.slice(0, 256) }))}
                placeholder="Calle, ciudad, país"
                className="w-full rounded-lg border border-[#E9EDEF] px-3 py-2 text-sm placeholder:text-[#667781] focus:border-conversia-primary focus:outline-none focus:ring-1 focus:ring-conversia-primary"
                maxLength={256}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#111B21]">Email (opcional)</label>
              <input
                type="email"
                value={profileForm.email}
                onChange={(e) => setProfileForm((f) => ({ ...f, email: e.target.value.slice(0, 128) }))}
                placeholder="contacto@ejemplo.com"
                className="w-full rounded-lg border border-[#E9EDEF] px-3 py-2 text-sm placeholder:text-[#667781] focus:border-conversia-primary focus:outline-none focus:ring-1 focus:ring-conversia-primary"
                maxLength={128}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#111B21]">Categoría</label>
              <select
                value={profileForm.vertical}
                onChange={(e) => setProfileForm((f) => ({ ...f, vertical: e.target.value }))}
                className="w-full rounded-lg border border-[#E9EDEF] px-3 py-2 text-sm"
              >
                {verticalOptions.length > 0
                  ? verticalOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))
                  : (
                      <>
                        <option value="">Sin categoría</option>
                        <option value="RETAIL">Compras y retail</option>
                        <option value="RESTAURANT">Restaurante</option>
                        <option value="OTHER">Otro</option>
                      </>
                    )}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#111B21]">Sitios web (máx. 2)</label>
              <input
                type="url"
                value={profileForm.websites[0]}
                onChange={(e) =>
                  setProfileForm((f) => ({
                    ...f,
                    websites: [e.target.value, f.websites[1]],
                  }))
                }
                placeholder="https://www.ejemplo.com"
                className="mb-2 w-full rounded-lg border border-[#E9EDEF] px-3 py-2 text-sm placeholder:text-[#667781] focus:border-conversia-primary focus:outline-none focus:ring-1 focus:ring-conversia-primary"
              />
              <input
                type="url"
                value={profileForm.websites[1]}
                onChange={(e) =>
                  setProfileForm((f) => ({
                    ...f,
                    websites: [f.websites[0], e.target.value],
                  }))
                }
                placeholder="https://www.otro-sitio.com"
                className="w-full rounded-lg border border-[#E9EDEF] px-3 py-2 text-sm placeholder:text-[#667781] focus:border-conversia-primary focus:outline-none focus:ring-1 focus:ring-conversia-primary"
              />
            </div>
            <button
              type="button"
              disabled={profileSaving}
              onClick={async () => {
                setProfileSaving(true);
                setProfileToast(null);
                try {
                  const r = await fetch("/api/whatsapp/business-profile", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      about: profileForm.about.trim() || "",
                      address: profileForm.address.trim() || undefined,
                      description: profileForm.description.trim() || undefined,
                      email: profileForm.email.trim() || undefined,
                      vertical: profileForm.vertical || undefined,
                      websites: profileForm.websites.filter((w) => w.trim()),
                    }),
                  });
                  const data = await r.json().catch(() => ({}));
                  if (r.ok) {
                    setProfileToast({ message: "Perfil guardado correctamente", type: "success" });
                    loadProfile();
                  } else {
                    setProfileToast({ message: data.error ?? "Error al guardar", type: "error" });
                  }
                } catch {
                  setProfileToast({ message: "Error de conexión", type: "error" });
                } finally {
                  setProfileSaving(false);
                }
              }}
              className="rounded-lg bg-conversia-primary px-4 py-2 text-sm font-medium text-white hover:bg-[#20BD5C] disabled:opacity-50"
            >
              {profileSaving ? "Guardando…" : "Guardar perfil de negocio"}
            </button>
          </div>
        )}
      </section>

      {/* Horario de atención */}
      <section className="rounded-xl border border-[#E9EDEF] bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
            <svg className="h-6 w-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[#111B21]">Horario de atención</h2>
            <p className="text-sm text-[#667781]">
              Fuera de horario el bot informa que los agentes atenderán cuando estén disponibles (sin handoff inmediato)
            </p>
          </div>
        </div>
        {businessHoursToast && (
          <div
            className={`mb-4 rounded-lg px-4 py-3 ${businessHoursToast.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}
          >
            {businessHoursToast.message}
          </div>
        )}
        {businessHoursLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-conversia-primary border-t-transparent" />
          </div>
        ) : businessHours ? (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-[#111B21]">Zona horaria</label>
              <select
                value={businessHours.timezone}
                onChange={(e) => setBusinessHours((b) => b ? { ...b, timezone: e.target.value } : null)}
                className="w-full rounded-lg border border-[#E9EDEF] px-3 py-2 text-sm"
              >
                <option value="America/Bogota">America/Bogota</option>
                <option value="America/Mexico_City">America/Mexico_City</option>
                <option value="America/Argentina/Buenos_Aires">America/Argentina/Buenos_Aires</option>
                <option value="America/Lima">America/Lima</option>
                <option value="Europe/Madrid">Europe/Madrid</option>
              </select>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-[#111B21]">Horarios por día</p>
              <div className="space-y-2">
                {[
                  { d: 0, label: "Domingo" },
                  { d: 1, label: "Lunes" },
                  { d: 2, label: "Martes" },
                  { d: 3, label: "Miércoles" },
                  { d: 4, label: "Jueves" },
                  { d: 5, label: "Viernes" },
                  { d: 6, label: "Sábado" },
                ].map(({ d, label }) => {
                  const dayConfig = businessHours.schedule.find((s) => s.dayOfWeek === d) ?? {
                    dayOfWeek: d,
                    start: "09:00",
                    end: "18:00",
                    enabled: false,
                  };
                  return (
                    <div key={d} className="flex flex-wrap items-center gap-2">
                      <label className="flex w-24 items-center gap-1">
                        <input
                          type="checkbox"
                          checked={dayConfig.enabled}
                          onChange={(e) => {
                            setBusinessHours((b) => {
                              if (!b) return null;
                              const s = [...b.schedule];
                              const idx = s.findIndex((x) => x.dayOfWeek === d);
                              if (idx >= 0) {
                                s[idx] = { ...s[idx]!, enabled: e.target.checked };
                              } else {
                                s.push({ dayOfWeek: d, start: "09:00", end: "18:00", enabled: e.target.checked });
                              }
                              return { ...b, schedule: s };
                            });
                          }}
                          className="h-4 w-4 rounded border-gray-300 text-conversia-primary"
                        />
                        <span className="text-sm">{label}</span>
                      </label>
                      <input
                        type="time"
                        value={dayConfig.start}
                        onChange={(e) => {
                          setBusinessHours((b) => {
                            if (!b) return null;
                            const s = [...b.schedule];
                            const idx = s.findIndex((x) => x.dayOfWeek === d);
                            if (idx >= 0) s[idx] = { ...s[idx]!, start: e.target.value };
                            else s.push({ dayOfWeek: d, start: e.target.value, end: "18:00", enabled: true });
                            return { ...b, schedule: s };
                          });
                        }}
                        className="rounded border border-[#E9EDEF] px-2 py-1 text-sm"
                        disabled={!dayConfig.enabled}
                      />
                      <span className="text-[#667781]">a</span>
                      <input
                        type="time"
                        value={dayConfig.end}
                        onChange={(e) => {
                          setBusinessHours((b) => {
                            if (!b) return null;
                            const s = [...b.schedule];
                            const idx = s.findIndex((x) => x.dayOfWeek === d);
                            if (idx >= 0) s[idx] = { ...s[idx]!, end: e.target.value };
                            else s.push({ dayOfWeek: d, start: "09:00", end: e.target.value, enabled: true });
                            return { ...b, schedule: s };
                          });
                        }}
                        className="rounded border border-[#E9EDEF] px-2 py-1 text-sm"
                        disabled={!dayConfig.enabled}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
            <button
              type="button"
              disabled={businessHoursSaving}
              onClick={async () => {
                setBusinessHoursSaving(true);
                setBusinessHoursToast(null);
                try {
                  const r = await fetch("/api/config/business-hours", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      timezone: businessHours.timezone,
                      schedule: businessHours.schedule,
                    }),
                  });
                  const data = await r.json().catch(() => ({}));
                  if (r.ok) {
                    setBusinessHoursToast({ message: "Horario guardado correctamente", type: "success" });
                  } else {
                    setBusinessHoursToast({ message: data.error ?? "Error al guardar", type: "error" });
                  }
                } catch {
                  setBusinessHoursToast({ message: "Error de conexión", type: "error" });
                } finally {
                  setBusinessHoursSaving(false);
                }
              }}
              className="rounded-lg bg-conversia-primary px-4 py-2 text-sm font-medium text-white hover:bg-[#20BD5C] disabled:opacity-50"
            >
              {businessHoursSaving ? "Guardando…" : "Guardar horario"}
            </button>
          </div>
        ) : null}
      </section>

      {/* Bot IA - conversacional y multimodal */}
      <section className="rounded-xl border border-[#E9EDEF] bg-white p-6 shadow-sm">
        <h2 className="mb-2 text-lg font-semibold text-[#111B21]">Bot IA (conversacional)</h2>
        <p className="mb-4 text-sm text-[#667781]">
          El bot procesa texto, imágenes, audio y video usando la API configurada. Selecciona el proveedor y modelo.
        </p>
        <div className="space-y-4">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={botForm.enabled}
              onChange={(e) => setBotForm((b) => ({ ...b, enabled: e.target.checked }))}
              className="h-4 w-4 rounded border-gray-300 text-conversia-primary focus:ring-conversia-primary"
            />
            <span className="text-sm font-medium text-[#111B21]">Activar bot IA</span>
          </label>
          <div>
            <label className="mb-1 block text-sm font-medium text-[#111B21]">Proveedor</label>
            <select
              value={botForm.defaultProvider}
              onChange={(e) => setBotForm((b) => ({ ...b, defaultProvider: e.target.value as "openai" | "anthropic" | "google" }))}
              className="w-full rounded-lg border border-[#E9EDEF] px-3 py-2 text-sm"
            >
              <option value="openai">OpenAI (GPT-4o, Whisper para audio)</option>
              <option value="anthropic">Anthropic (Claude)</option>
              <option value="google">Google (Gemini - multimodal nativo)</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[#111B21]">Modelo</label>
            <input
              type="text"
              value={botForm.model}
              onChange={(e) => setBotForm((b) => ({ ...b, model: e.target.value }))}
              placeholder="gpt-4o-mini, claude-3-5-haiku, gemini-1.5-flash"
              className="w-full rounded-lg border border-[#E9EDEF] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[#111B21]">API Key (dejar vacío para mantener)</label>
            <div className="grid gap-2 sm:grid-cols-3">
              <input
                type="password"
                value={botForm.openaiApiKey}
                onChange={(e) => setBotForm((b) => ({ ...b, openaiApiKey: e.target.value }))}
                placeholder={config?.bot?.openaiApiKeyMasked ? "••••••••" : "sk-..."}
                className="rounded-lg border border-[#E9EDEF] px-3 py-2 text-sm"
              />
              <input
                type="password"
                value={botForm.anthropicApiKey}
                onChange={(e) => setBotForm((b) => ({ ...b, anthropicApiKey: e.target.value }))}
                placeholder={config?.bot?.anthropicApiKeyMasked ? "••••••••" : "sk-ant-..."}
                className="rounded-lg border border-[#E9EDEF] px-3 py-2 text-sm"
              />
              <input
                type="password"
                value={botForm.googleApiKey}
                onChange={(e) => setBotForm((b) => ({ ...b, googleApiKey: e.target.value }))}
                placeholder={config?.bot?.googleApiKeyMasked ? "••••••••" : "AIza..."}
                className="rounded-lg border border-[#E9EDEF] px-3 py-2 text-sm"
              />
            </div>
            <p className="mt-1 text-xs text-[#667781]">OpenAI | Anthropic | Google (una para el proveedor seleccionado)</p>
          </div>
        </div>
      </section>

      {/* General */}
      <section className="rounded-xl border border-[#E9EDEF] bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-[#111B21]">General</h2>
        <div>
          <label className="mb-1 block text-sm font-medium text-[#111B21]">URL base de la aplicación</label>
          <input
            type="url"
            value={form.appBaseUrl}
            onChange={(e) => setForm((f) => ({ ...f, appBaseUrl: e.target.value }))}
            placeholder="https://tu-dominio.vercel.app"
            className="w-full rounded-lg border border-[#E9EDEF] px-3 py-2 text-sm text-[#111B21] placeholder:text-[#667781] focus:border-conversia-primary focus:outline-none focus:ring-1 focus:ring-conversia-primary"
          />
          <p className="mt-1 text-xs text-[#667781]">
            URL pública de la app (para generar la URL del webhook). Si está vacío, se usa VERCEL_URL o localhost.
          </p>
        </div>
      </section>

      {/* Catálogo de productos - Bot de ventas */}
      <section className="rounded-xl border border-[#E9EDEF] bg-white p-6 shadow-sm">
        <h2 className="mb-2 text-lg font-semibold text-[#111B21]">Catálogo de productos</h2>
        <p className="mb-2 text-sm text-[#667781]">
          Imágenes que el bot envía en el flujo de ventas por WhatsApp. Usa URL completa (ej. Vercel Blob o /uploads/xxx).
        </p>
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50/50 px-3 py-2 text-xs text-amber-800">
          <strong>Importante:</strong> El catálogo se sincroniza automáticamente desde la página <strong>Productos</strong> al crear, editar o eliminar productos. Si los productos del chat no coinciden, usa &quot;Sincronizar desde Productos&quot; abajo.
        </p>
        {catalogLoading ? (
          <div className="py-4 text-sm text-[#667781]">Cargando catálogo…</div>
        ) : (
          <>
            {productCatalog.length > 0 && (
              <ul className="mb-4 space-y-2">
                {productCatalog.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between rounded-lg border border-[#E9EDEF] bg-[#F0F2F5]/50 px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="font-medium text-[#111B21]">{p.name}</span>
                      <span className="ml-2 text-xs text-[#667781]">{p.url.length > 40 ? `${p.url.slice(0, 40)}…` : p.url}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveProduct(p.id)}
                      className="ml-2 rounded px-2 py-1 text-sm text-red-600 hover:bg-red-50"
                    >
                      Quitar
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <form onSubmit={handleAddProduct} className="mb-4 flex flex-wrap gap-2">
              <input
                type="text"
                value={newProduct.name}
                onChange={(e) => setNewProduct((n) => ({ ...n, name: e.target.value }))}
                placeholder="Nombre"
                className="rounded-lg border border-[#E9EDEF] px-3 py-2 text-sm w-32"
              />
              <input
                type="url"
                value={newProduct.url}
                onChange={(e) => setNewProduct((n) => ({ ...n, url: e.target.value }))}
                placeholder="URL de imagen"
                className="min-w-[200px] flex-1 rounded-lg border border-[#E9EDEF] px-3 py-2 text-sm"
              />
              <input
                type="text"
                value={newProduct.description}
                onChange={(e) => setNewProduct((n) => ({ ...n, description: e.target.value }))}
                placeholder="Descripción (opcional)"
                className="min-w-[140px] flex-1 rounded-lg border border-[#E9EDEF] px-3 py-2 text-sm"
              />
              <button
                type="submit"
                className="rounded-lg bg-conversia-primary/80 px-3 py-2 text-sm font-medium text-white hover:bg-conversia-primary"
              >
                Añadir
              </button>
            </form>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleSyncFromProducts}
                disabled={catalogSyncing}
                className="rounded-lg bg-[#128C7E] px-4 py-2 text-sm font-medium text-white hover:bg-[#0a6e62] disabled:opacity-50"
              >
                {catalogSyncing ? "Sincronizando…" : "Sincronizar desde Productos"}
              </button>
              <button
                type="button"
                onClick={handleSaveCatalog}
                disabled={catalogSaving}
                className="rounded-lg border border-conversia-primary px-4 py-2 text-sm font-medium text-conversia-primary hover:bg-conversia-primary/10 disabled:opacity-50"
              >
                {catalogSaving ? "Guardando…" : "Guardar catálogo (manual)"}
              </button>
            </div>
          </>
        )}
      </section>

      {/* Políticas */}
      <section className="rounded-xl border border-amber-200 bg-amber-50/50 p-6">
        <h2 className="mb-2 text-sm font-semibold text-amber-900">Políticas de WhatsApp</h2>
        <ul className="space-y-1 text-xs text-amber-800">
          <li>• Cumple con WhatsApp Business Messaging Policy</li>
          <li>• Opt-in explícito del usuario para mensajes de negocio</li>
          <li>• Solo plantillas aprobadas para mensajes iniciados por el negocio</li>
          <li>• Ver documentación: business.whatsapp.com/policy</li>
        </ul>
      </section>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-conversia-primary px-4 py-2.5 font-medium text-white hover:bg-conversia-primary-hover disabled:opacity-50"
        >
          {saving ? "Guardando…" : "Guardar configuración"}
        </button>
        <button
          type="button"
          onClick={loadConfig}
          disabled={loading}
          className="rounded-lg border border-[#E9EDEF] px-4 py-2.5 font-medium text-[#111B21] hover:bg-[#F0F2F5] disabled:opacity-50"
        >
          Recargar
        </button>
      </div>
    </form>
    </>
  );
}
