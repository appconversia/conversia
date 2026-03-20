"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCanEditBotConfig } from "@/contexts/user-context";

type Flow = {
  id: string;
  name: string;
  description: string | null;
  flowJson: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type BotConfig = {
  openaiApiKeyMasked?: boolean;
  anthropicApiKeyMasked?: boolean;
  googleApiKeyMasked?: boolean;
  defaultProvider: string;
  enabled: boolean;
  n8nWebhookUrl: string;
  systemPrompt?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
};

type Tab = "flujos" | "probar" | "config";

export default function BotPage() {
  const router = useRouter();
  const canEditBotConfig = useCanEditBotConfig();
  const [tab, setTab] = useState<Tab>("flujos");
  const [flows, setFlows] = useState<Flow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFlow, setSelectedFlow] = useState<Flow | null>(null);
  const [editingFlow, setEditingFlow] = useState<Flow | null>(null);
  const [flowJsonEdit, setFlowJsonEdit] = useState("");
  const [testMessage, setTestMessage] = useState("");
  const [testResponse, setTestResponse] = useState("");
  const [testHistory, setTestHistory] = useState<{ role: string; content: string }[]>([]);
  const [testLoading, setTestLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<{ bot?: BotConfig } | null>(null);
  const [configLoading, setConfigLoading] = useState(false);
  const [configSaving, setConfigSaving] = useState(false);
  const [, setCanEditConfig] = useState(false);
  const [configForm, setConfigForm] = useState({
    botOpenaiKey: "",
    botAnthropicKey: "",
    botGoogleKey: "",
    botProvider: "openai" as string,
    botEnabled: false,
    botN8nWebhook: "",
    botSystemPrompt: "",
    botModel: "",
    botTemperature: 0.7,
    botMaxTokens: 1024,
  });
  const [batchForm, setBatchForm] = useState({ enabled: false, delayMs: 2500, maxBatchSize: 10 });
  const [batchSaving, setBatchSaving] = useState(false);

  const loadFlows = async () => {
    try {
      const r = await fetch("/api/bot/flows");
      if (r.status === 401) {
        router.replace("/login");
        return;
      }
      const data = await r.json();
      setFlows(data.flows ?? []);
    } catch {
      setFlows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!canEditBotConfig) {
      router.replace("/dashboard");
      return;
    }
    loadFlows();
  }, [canEditBotConfig, router]);

  const loadConfig = async () => {
    setConfigLoading(true);
    try {
      const r = await fetch("/api/bot/config", { credentials: "include" });
      const data = await r.json();
      if (r.status === 403) {
        setCanEditConfig(false);
        setConfig(null);
        return;
      }
      if (r.ok && data.canEdit) {
        setConfig({ bot: data.bot });
        setCanEditConfig(true);
        setConfigForm({
          botOpenaiKey: "",
          botAnthropicKey: "",
          botGoogleKey: "",
          botProvider: data.bot?.defaultProvider ?? "openai",
          botEnabled: data.bot?.enabled ?? false,
          botN8nWebhook: data.bot?.n8nWebhookUrl ?? "",
          botSystemPrompt: data.bot?.systemPrompt ?? "",
          botModel: data.bot?.model ?? "",
          botTemperature: data.bot?.temperature ?? 0.7,
          botMaxTokens: data.bot?.maxTokens ?? 1024,
        });
      } else {
        setCanEditConfig(false);
        setConfig(null);
      }
    } catch {
      setCanEditConfig(false);
      setConfig(null);
    } finally {
      setConfigLoading(false);
    }
  };

  useEffect(() => {
    if (tab === "config" && canEditBotConfig) {
      loadConfig();
      loadBatchConfig();
    }
  }, [tab, canEditBotConfig]);

  const loadBatchConfig = async () => {
    try {
      const r = await fetch("/api/bot/batch-config", { credentials: "include" });
      const data = await r.json();
      if (r.ok && data.batch) {
        setBatchForm({
          enabled: data.batch.enabled ?? false,
          delayMs: data.batch.delayMs ?? 2500,
          maxBatchSize: data.batch.maxBatchSize ?? 10,
        });
      }
    } catch {
      // keep current batchForm
    }
  };

  const handleSaveBatchConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setBatchSaving(true);
    setToast(null);
    try {
      const r = await fetch("/api/bot/batch-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ batch: batchForm }),
      });
      const data = await r.json();
      if (r.ok && data.batch) {
        setBatchForm({ enabled: data.batch.enabled, delayMs: data.batch.delayMs, maxBatchSize: data.batch.maxBatchSize });
        setToast({ message: "Agrupación de mensajes guardada", type: "success" });
      } else {
        setToast({ message: data.error ?? "Error al guardar", type: "error" });
      }
    } catch {
      setToast({ message: "Error de conexión", type: "error" });
    } finally {
      setBatchSaving(false);
    }
  };

  // Si es colaborador y tiene tab config (ej. URL), volver a flujos
  useEffect(() => {
    if (tab === "config" && !canEditBotConfig) setTab("flujos");
  }, [tab, canEditBotConfig]);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfigSaving(true);
    setToast(null);
    try {
      const r = await fetch("/api/bot/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          bot: {
            openaiApiKey: configForm.botOpenaiKey.trim() || undefined,
            anthropicApiKey: configForm.botAnthropicKey.trim() || undefined,
            googleApiKey: configForm.botGoogleKey.trim() || undefined,
            defaultProvider: configForm.botProvider,
            enabled: configForm.botEnabled,
            n8nWebhookUrl: configForm.botN8nWebhook.trim(),
            systemPrompt: configForm.botSystemPrompt.trim() || undefined,
            model: configForm.botModel.trim() || undefined,
            temperature: configForm.botTemperature,
            maxTokens: configForm.botMaxTokens,
          },
        }),
      });
      const data = await r.json();
      if (r.ok) {
        setConfig({ bot: data.bot });
        setConfigForm((prev) => ({ ...prev, botOpenaiKey: "", botAnthropicKey: "", botGoogleKey: "" }));
        setToast({ message: "Configuración guardada", type: "success" });
      } else {
        setToast({ message: data.error ?? "Error al guardar", type: "error" });
      }
    } catch {
      setToast({ message: "Error de conexión", type: "error" });
    } finally {
      setConfigSaving(false);
    }
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      const r = await fetch("/api/bot/flows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Nuevo flujo",
          description: "",
          flowJson: JSON.stringify({ nodes: [], edges: [] }, null, 2),
        }),
      });
      const data = await r.json();
      if (r.ok && data.flow) {
        setFlows((prev) => [data.flow, ...prev]);
        setSelectedFlow(data.flow);
        setEditingFlow(data.flow);
        setFlowJsonEdit(JSON.stringify(JSON.parse(data.flow.flowJson), null, 2));
        setToast({ message: "Flujo creado", type: "success" });
      } else {
        setToast({ message: data.error ?? "Error al crear", type: "error" });
      }
    } catch {
      setToast({ message: "Error de conexión", type: "error" });
    } finally {
      setCreating(false);
    }
  };

  const handleSelect = (flow: Flow) => {
    setSelectedFlow(flow);
    setEditingFlow(flow);
    try {
      const parsed = JSON.parse(flow.flowJson);
      setFlowJsonEdit(JSON.stringify(parsed, null, 2));
    } catch {
      setFlowJsonEdit(flow.flowJson);
    }
  };

  const handleSave = async () => {
    if (!editingFlow) return;
    setSaving(true);
    try {
      JSON.parse(flowJsonEdit);
    } catch {
      setToast({ message: "JSON inválido", type: "error" });
      setSaving(false);
      return;
    }
    try {
      const r = await fetch(`/api/bot/flows/${editingFlow.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flowJson: flowJsonEdit }),
      });
      if (r.ok) {
        const data = await r.json();
        setFlows((prev) => prev.map((f) => (f.id === data.id ? data : f)));
        setEditingFlow(data);
        setSelectedFlow(data);
        setToast({ message: "Guardado", type: "success" });
      } else {
        const d = await r.json();
        setToast({ message: d.error ?? "Error", type: "error" });
      }
    } catch {
      setToast({ message: "Error de conexión", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (flow: Flow) => {
    const willActivate = !flow.isActive;
    if (willActivate) {
      await Promise.all(
        flows.filter((f) => f.isActive).map((f) =>
          fetch(`/api/bot/flows/${f.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isActive: false }),
          })
        )
      );
    }
    const r = await fetch(`/api/bot/flows/${flow.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: willActivate }),
    });
    if (r.ok) {
      const data = await r.json();
      setFlows((prev) => prev.map((f) => (f.id === data.id ? data : f)));
      if (selectedFlow?.id === flow.id) setSelectedFlow(data);
      setToast({ message: willActivate ? "Flujo activado" : "Flujo desactivado", type: "success" });
    }
  };

  const handleDelete = async (flow: Flow) => {
    if (!confirm(`¿Eliminar "${flow.name}"?`)) return;
    const r = await fetch(`/api/bot/flows/${flow.id}`, { method: "DELETE" });
    if (r.ok) {
      setFlows((prev) => prev.filter((f) => f.id !== flow.id));
      if (selectedFlow?.id === flow.id) {
        setSelectedFlow(null);
        setEditingFlow(null);
      }
      setToast({ message: "Eliminado", type: "success" });
    }
  };

  const handleTestSend = async () => {
    const msg = testMessage.trim();
    if (!msg || testLoading) return;

    setTestLoading(true);
    setTestResponse("");
    try {
      const r = await fetch("/api/bot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          message: msg,
          history: testHistory,
        }),
      });
      const data = await r.json();
      if (r.ok) {
        setTestHistory((prev) => [
          ...prev,
          { role: "user", content: msg },
          { role: "assistant", content: data.response ?? "" },
        ]);
        setTestResponse(data.response ?? "");
        setTestMessage("");
      } else {
        setTestResponse(`Error: ${data.error ?? "No se pudo conectar"}`);
      }
    } catch {
      setTestResponse("Error de conexión");
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`rounded-lg px-4 py-2 ${toast.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
          {toast.message}
        </div>
      )}

      <div className="flex gap-2 border-b border-[#E9EDEF]">
        <button
          type="button"
          onClick={() => setTab("flujos")}
          className={`rounded-t-lg px-4 py-2 text-sm font-medium ${
            tab === "flujos" ? "bg-[#25D366]/20 text-[#075E54]" : "text-[#667781] hover:bg-[#F0F2F5]"
          }`}
        >
          Flujos
        </button>
        <button
          type="button"
          onClick={() => setTab("probar")}
          className={`rounded-t-lg px-4 py-2 text-sm font-medium ${
            tab === "probar" ? "bg-[#25D366]/20 text-[#075E54]" : "text-[#667781] hover:bg-[#F0F2F5]"
          }`}
        >
          Probar bot
        </button>
        {canEditBotConfig && (
          <button
            type="button"
            onClick={() => setTab("config")}
            className={`rounded-t-lg px-4 py-2 text-sm font-medium ${
              tab === "config" ? "bg-[#25D366]/20 text-[#075E54]" : "text-[#667781] hover:bg-[#F0F2F5]"
            }`}
          >
            Configuración
          </button>
        )}
      </div>

      {tab === "flujos" && (
        <div className="flex gap-4">
          <div className="w-72 shrink-0 space-y-2">
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating}
              className="w-full rounded-lg bg-[#25D366] px-4 py-2 text-sm font-medium text-white hover:bg-[#20bd5a] disabled:opacity-50"
            >
              + Nuevo flujo
            </button>
            {loading ? (
              <div className="py-4 text-center text-sm text-[#667781]">Cargando…</div>
            ) : flows.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[#E9EDEF] p-4 text-center text-sm text-[#667781]">
                No hay flujos. Crea uno para empezar.
              </div>
            ) : (
              flows.map((f) => (
                <div
                  key={f.id}
                  className={`rounded-lg border p-3 ${
                    selectedFlow?.id === f.id ? "border-[#25D366] bg-[#25D366]/10" : "border-[#E9EDEF] hover:bg-[#F0F2F5]"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleSelect(f)}
                    className="w-full text-left"
                  >
                    <p className="font-medium text-[#111B21]">{f.name}</p>
                    {f.description && <p className="truncate text-xs text-[#667781]">{f.description}</p>}
                    <span className={`mt-1 inline-block text-xs ${f.isActive ? "text-green-600" : "text-[#667781]"}`}>
                      {f.isActive ? "● Activo" : "Inactivo"}
                    </span>
                  </button>
                  <div className="mt-2 flex gap-1">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(f)}
                      className="rounded px-2 py-1 text-xs text-[#25D366] hover:bg-[#25D366]/10"
                    >
                      {f.isActive ? "Desactivar" : "Activar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(f)}
                      className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="min-w-0 flex-1 rounded-xl border border-[#E9EDEF] bg-white p-4">
            {selectedFlow ? (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-medium text-[#111B21]">{editingFlow?.name}</h3>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="rounded-lg bg-[#25D366] px-3 py-1.5 text-sm text-white hover:bg-[#20bd5a] disabled:opacity-50"
                  >
                    {saving ? "Guardando…" : "Guardar"}
                  </button>
                </div>
                <p className="mb-2 text-xs text-[#667781]">
                  JSON del flujo (compatible con n8n/React Flow). Nodos: trigger, condition, ai_chat, respond
                </p>
                <textarea
                  value={flowJsonEdit}
                  onChange={(e) => setFlowJsonEdit(e.target.value)}
                  className="h-[400px] w-full rounded-lg border border-[#E9EDEF] p-3 font-mono text-sm"
                  spellCheck={false}
                />
              </>
            ) : (
              <div className="flex h-64 items-center justify-center text-[#667781]">
                Selecciona un flujo o crea uno nuevo
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "probar" && (
        <div className="max-w-2xl rounded-xl border border-[#E9EDEF] bg-white p-6">
          <p className="mb-4 text-sm text-[#667781]">
            Prueba el bot con IA (asesor virtual: memoria conversacional, catálogo, clasificación de interés, registro de leads y escalamiento a asesor). Configura las API keys y edita el prompt del sistema en la pestaña Configuración.
          </p>
          <div className="space-y-4">
            {testHistory.map((h, i) => (
              <div
                key={i}
                className={`rounded-lg px-4 py-2 ${
                  h.role === "user" ? "ml-8 bg-[#D9FDD3]" : "mr-8 bg-white border border-[#E9EDEF]"
                }`}
              >
                <p className="text-xs text-[#667781]">{h.role === "user" ? "Tú" : "Bot"}</p>
                <p className="text-sm text-[#111B21]">{h.content}</p>
              </div>
            ))}
            <div className="flex gap-2">
              <input
                type="text"
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleTestSend()}
                placeholder="Escribe un mensaje..."
                className="flex-1 rounded-lg border border-[#E9EDEF] px-3 py-2 text-sm focus:border-[#25D366] focus:outline-none focus:ring-1 focus:ring-[#25D366]"
              />
              <button
                type="button"
                onClick={handleTestSend}
                disabled={testLoading || !testMessage.trim()}
                className="rounded-lg bg-[#25D366] px-4 py-2 text-sm font-medium text-white hover:bg-[#20bd5a] disabled:opacity-50"
              >
                {testLoading ? "…" : "Enviar"}
              </button>
            </div>
            {testResponse && testHistory.length === 0 && (
              <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{testResponse}</div>
            )}
          </div>
        </div>
      )}

      {tab === "config" && canEditBotConfig && (
        <div className="max-w-2xl rounded-xl border border-[#E9EDEF] bg-white p-6 shadow-sm">
          {configLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#25D366] border-t-transparent" />
            </div>
          ) : (
            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366]/20">
                  <svg className="h-6 w-6 text-[#25D366]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[#111B21]">Bot con IA</h2>
                  <p className="text-sm text-[#667781]">OpenAI, Claude o Gemini. Flujos tipo n8n.</p>
                </div>
              </div>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={configForm.botEnabled}
                  onChange={(e) => setConfigForm((f) => ({ ...f, botEnabled: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300 text-[#25D366] focus:ring-[#25D366]"
                />
                <span className="text-sm font-medium text-[#111B21]">Activar bot con IA</span>
              </label>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#111B21]">Proveedor por defecto</label>
                <select
                  value={configForm.botProvider}
                  onChange={(e) => setConfigForm((f) => ({ ...f, botProvider: e.target.value }))}
                  className="w-full rounded-lg border border-[#E9EDEF] px-3 py-2 text-sm text-[#111B21] focus:border-[#25D366] focus:outline-none focus:ring-1 focus:ring-[#25D366]"
                >
                  <option value="openai">OpenAI (GPT)</option>
                  <option value="anthropic">Claude (Anthropic)</option>
                  <option value="google">Gemini (Google)</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#111B21]">OpenAI API Key</label>
                <input
                  type="password"
                  value={configForm.botOpenaiKey}
                  onChange={(e) => setConfigForm((f) => ({ ...f, botOpenaiKey: e.target.value }))}
                  placeholder={config?.bot?.openaiApiKeyMasked ? "•••••••• (vacío = mantener)" : "sk-..."}
                  className="w-full rounded-lg border border-[#E9EDEF] px-3 py-2 text-sm focus:border-[#25D366] focus:outline-none focus:ring-1 focus:ring-[#25D366]"
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#111B21]">Anthropic (Claude) API Key</label>
                <input
                  type="password"
                  value={configForm.botAnthropicKey}
                  onChange={(e) => setConfigForm((f) => ({ ...f, botAnthropicKey: e.target.value }))}
                  placeholder={config?.bot?.anthropicApiKeyMasked ? "•••••••• (vacío = mantener)" : "sk-ant-..."}
                  className="w-full rounded-lg border border-[#E9EDEF] px-3 py-2 text-sm focus:border-[#25D366] focus:outline-none focus:ring-1 focus:ring-[#25D366]"
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#111B21]">Google (Gemini) API Key</label>
                <input
                  type="password"
                  value={configForm.botGoogleKey}
                  onChange={(e) => setConfigForm((f) => ({ ...f, botGoogleKey: e.target.value }))}
                  placeholder={config?.bot?.googleApiKeyMasked ? "•••••••• (vacío = mantener)" : "AIza..."}
                  className="w-full rounded-lg border border-[#E9EDEF] px-3 py-2 text-sm focus:border-[#25D366] focus:outline-none focus:ring-1 focus:ring-[#25D366]"
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#111B21]">Instrucciones del sistema (persona del bot)</label>
                <textarea
                  value={configForm.botSystemPrompt}
                  onChange={(e) => setConfigForm((f) => ({ ...f, botSystemPrompt: e.target.value }))}
                  placeholder="Eres un asistente de atención al cliente..."
                  rows={3}
                  className="w-full rounded-lg border border-[#E9EDEF] px-3 py-2 text-sm focus:border-[#25D366] focus:outline-none focus:ring-1 focus:ring-[#25D366]"
                />
                <p className="mt-1 text-xs text-[#667781]">Define cómo debe comportarse el bot</p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#111B21]">Modelo (opcional)</label>
                <input
                  type="text"
                  value={configForm.botModel}
                  onChange={(e) => setConfigForm((f) => ({ ...f, botModel: e.target.value }))}
                  placeholder="gpt-4o-mini, claude-3-5-haiku, gemini-1.5-flash..."
                  className="w-full rounded-lg border border-[#E9EDEF] px-3 py-2 text-sm focus:border-[#25D366] focus:outline-none focus:ring-1 focus:ring-[#25D366]"
                />
                <p className="mt-1 text-xs text-[#667781]">Vacío = modelo por defecto del proveedor</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#111B21]">Temperatura (0–1)</label>
                  <input
                    type="number"
                    min={0}
                    max={1}
                    step={0.1}
                    value={configForm.botTemperature}
                    onChange={(e) => setConfigForm((f) => ({ ...f, botTemperature: parseFloat(e.target.value) || 0.7 }))}
                    className="w-full rounded-lg border border-[#E9EDEF] px-3 py-2 text-sm focus:border-[#25D366] focus:outline-none focus:ring-1 focus:ring-[#25D366]"
                  />
                  <p className="mt-1 text-xs text-[#667781]">Creatividad. 0.7 = equilibrado</p>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#111B21]">Máx. tokens</label>
                  <input
                    type="number"
                    min={100}
                    max={4096}
                    value={configForm.botMaxTokens}
                    onChange={(e) => setConfigForm((f) => ({ ...f, botMaxTokens: parseInt(e.target.value, 10) || 1024 }))}
                    className="w-full rounded-lg border border-[#E9EDEF] px-3 py-2 text-sm focus:border-[#25D366] focus:outline-none focus:ring-1 focus:ring-[#25D366]"
                  />
                  <p className="mt-1 text-xs text-[#667781]">Longitud máxima de respuesta</p>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#111B21]">Webhook n8n (opcional)</label>
                <input
                  type="url"
                  value={configForm.botN8nWebhook}
                  onChange={(e) => setConfigForm((f) => ({ ...f, botN8nWebhook: e.target.value }))}
                  placeholder="https://tu-n8n.com/webhook/..."
                  className="w-full rounded-lg border border-[#E9EDEF] px-3 py-2 text-sm focus:border-[#25D366] focus:outline-none focus:ring-1 focus:ring-[#25D366]"
                />
                <p className="mt-1 text-xs text-[#667781]">Para delegar flujos a n8n</p>
              </div>
              <button
                type="submit"
                disabled={configSaving}
                className="rounded-lg bg-[#25D366] px-4 py-2.5 font-medium text-white hover:bg-[#20bd5a] disabled:opacity-50"
              >
                {configSaving ? "Guardando…" : "Guardar configuración"}
              </button>

              {/* Agrupación de mensajes (tipo Redis) */}
              <div className="mt-8 border-t border-[#E9EDEF] pt-8">
                <h3 className="mb-2 text-base font-semibold text-[#111B21]">Agrupación de mensajes (tipo Redis)</h3>
                <p className="mb-4 text-sm text-[#667781]">
                  Acumula varios mensajes del cliente (texto, imagen, audio) en una ventana de tiempo y procesa un solo lote para una respuesta coherente. Similar a un buffer Redis: reduce respuestas fragmentadas cuando el usuario escribe varios mensajes seguidos. Para procesar lotes con poca demora, configura un cron externo (ej. cron-job.org) que llame a GET /api/cron/process-batches cada 10–60 s con header Authorization: Bearer TU_CRON_SECRET. En Vercel Hobby el cron está limitado a 1 vez/día.
                </p>
                <form onSubmit={handleSaveBatchConfig} className="space-y-4">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={batchForm.enabled}
                      onChange={(e) => setBatchForm((f) => ({ ...f, enabled: e.target.checked }))}
                      className="h-4 w-4 rounded border-gray-300 text-[#25D366] focus:ring-[#25D366]"
                    />
                    <span className="text-sm font-medium text-[#111B21]">Activar agrupación</span>
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-[#111B21]">Delay (ms)</label>
                      <input
                        type="number"
                        min={500}
                        max={30000}
                        step={500}
                        value={batchForm.delayMs}
                        onChange={(e) => setBatchForm((f) => ({ ...f, delayMs: parseInt(e.target.value, 10) || 2500 }))}
                        className="w-full rounded-lg border border-[#E9EDEF] px-3 py-2 text-sm focus:border-[#25D366] focus:outline-none focus:ring-1 focus:ring-[#25D366]"
                      />
                      <p className="mt-1 text-xs text-[#667781]">500–30000. Tiempo de espera antes de procesar (ej. 2500 = 2.5 s)</p>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-[#111B21]">Máx. mensajes por lote</label>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={batchForm.maxBatchSize}
                        onChange={(e) => setBatchForm((f) => ({ ...f, maxBatchSize: parseInt(e.target.value, 10) || 10 }))}
                        className="w-full rounded-lg border border-[#E9EDEF] px-3 py-2 text-sm focus:border-[#25D366] focus:outline-none focus:ring-1 focus:ring-[#25D366]"
                      />
                      <p className="mt-1 text-xs text-[#667781]">1–50. Si se alcanza, se procesa de inmediato</p>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={batchSaving}
                    className="rounded-lg bg-[#075E54] px-4 py-2 text-sm font-medium text-white hover:bg-[#054d47] disabled:opacity-50"
                  >
                    {batchSaving ? "Guardando…" : "Guardar agrupación"}
                  </button>
                </form>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
