"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

type WhatsAppTemplate = {
  id: string;
  name: string;
  status: "APPROVED" | "PENDING" | "REJECTED" | "IN_APPEAL" | "PAUSED" | "disabled";
  category: string;
  language: string;
  components?: Array<{
    type: string;
    text?: string;
    format?: string;
    example?: { body_text?: string[][] };
    buttons?: Array<{ type: string; text?: string }>;
  }>;
  quality_score?: string;
  rejected_reason?: string;
};

const STATUS_LABELS: Record<string, string> = {
  APPROVED: "Aprobada",
  PENDING: "Pendiente",
  REJECTED: "Rechazada",
  IN_APPEAL: "En apelación",
  PAUSED: "Pausada",
  disabled: "Deshabilitada",
};

const STATUS_COLORS: Record<string, string> = {
  APPROVED: "bg-green-100 text-green-800",
  PENDING: "bg-amber-100 text-amber-800",
  REJECTED: "bg-red-100 text-red-800",
  IN_APPEAL: "bg-blue-100 text-blue-800",
  PAUSED: "bg-gray-100 text-gray-800",
  disabled: "bg-gray-100 text-gray-600",
};

const CATEGORY_LABELS: Record<string, string> = {
  AUTHENTICATION: "Autenticación",
  MARKETING: "Marketing",
  UTILITY: "Utilidad",
  SERVICE: "Servicio",
};

function getBodyPreview(t: WhatsAppTemplate): string {
  const body = t.components?.find((c) => c.type === "BODY");
  if (!body?.text) return "—";
  const text = body.text;
  if (text.length > 60) return text.slice(0, 60) + "…";
  return text;
}

export default function PlantillasPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [filterLanguage, setFilterLanguage] = useState<string>("");
  const [filterName, setFilterName] = useState<string>("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set("status", filterStatus);
      if (filterCategory) params.set("category", filterCategory);
      if (filterLanguage) params.set("language", filterLanguage);
      if (filterName) params.set("name", filterName);
      const r = await fetch(`/api/whatsapp/templates?${params}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (r.status === 401) {
        router.replace("/login");
        return;
      }
      const data = await r.json();
      if (!r.ok) {
        setError(data.error ?? "Error al cargar plantillas");
        setTemplates([]);
        return;
      }
      setTemplates(data.templates ?? []);
    } catch {
      setError("Error de conexión");
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, [router, filterStatus, filterCategory, filterLanguage, filterName]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const selected = templates.find((t) => t.id === selectedId);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-[#111B21]">Plantillas de mensajes</h1>
        <button
          onClick={loadTemplates}
          disabled={loading}
          className="rounded-lg bg-[#128C7E] px-4 py-2 text-sm font-medium text-white hover:bg-[#0a6e62] disabled:opacity-50"
        >
          {loading ? "Cargando…" : "Actualizar"}
        </button>
      </div>

      <p className="text-sm text-[#667781]">
        Gestiona las plantillas de mensajes de WhatsApp desde la API de Meta. Las plantillas se crean y editan en el{" "}
        <a
          href="https://business.facebook.com/wa/manage/message-templates/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-conversia-primary underline hover:no-underline"
        >
          Administrador de Meta Business
        </a>
        . Aquí puedes ver el estado, categoría y contenido de cada plantilla.
      </p>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-[#E9EDEF] bg-white p-4">
        <span className="text-sm font-medium text-[#667781]">Filtros:</span>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded border border-[#E9EDEF] bg-white px-3 py-2 text-sm text-[#111B21]"
        >
          <option value="">Todos los estados</option>
          <option value="APPROVED">Aprobada</option>
          <option value="PENDING">Pendiente</option>
          <option value="REJECTED">Rechazada</option>
          <option value="IN_APPEAL">En apelación</option>
          <option value="PAUSED">Pausada</option>
          <option value="disabled">Deshabilitada</option>
        </select>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="rounded border border-[#E9EDEF] bg-white px-3 py-2 text-sm text-[#111B21]"
        >
          <option value="">Todas las categorías</option>
          <option value="AUTHENTICATION">Autenticación</option>
          <option value="MARKETING">Marketing</option>
          <option value="UTILITY">Utilidad</option>
          <option value="SERVICE">Servicio</option>
        </select>
        <input
          type="text"
          placeholder="Buscar por nombre"
          value={filterName}
          onChange={(e) => setFilterName(e.target.value)}
          className="rounded border border-[#E9EDEF] bg-white px-3 py-2 text-sm text-[#111B21] placeholder:text-[#667781]"
        />
        <input
          type="text"
          placeholder="Idioma (ej: es)"
          value={filterLanguage}
          onChange={(e) => setFilterLanguage(e.target.value)}
          className="rounded border border-[#E9EDEF] bg-white px-3 py-2 text-sm text-[#111B21] placeholder:text-[#667781]"
        />
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-conversia-primary border-t-transparent" />
        </div>
      ) : templates.length === 0 ? (
        <div className="rounded-lg border border-[#E9EDEF] bg-[#F0F2F5] px-6 py-12 text-center text-[#667781]">
          No hay plantillas.{" "}
          {filterStatus || filterCategory || filterName || filterLanguage
            ? "Prueba con otros filtros."
            : "Crea plantillas en el Administrador de Meta Business."}
        </div>
      ) : (
        <div className="flex flex-col gap-4 lg:flex-row">
          {/* Lista de plantillas */}
          <div className="min-w-0 flex-1 space-y-2">
            {templates.map((t) => (
              <div
                key={t.id}
                onClick={() => setSelectedId(t.id)}
                className={`cursor-pointer rounded-lg border p-4 transition ${
                  selectedId === t.id ? "border-conversia-primary bg-[#F0FFF4]" : "border-[#E9EDEF] bg-white hover:border-conversia-primary/50"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-[#111B21]">{t.name}</p>
                    <p className="mt-1 truncate text-sm text-[#667781]">{getBodyPreview(t)}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                      STATUS_COLORS[t.status] ?? "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {STATUS_LABELS[t.status] ?? t.status}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-[#667781]">
                  <span>{CATEGORY_LABELS[t.category] ?? t.category}</span>
                  <span>•</span>
                  <span>{t.language}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Detalle de plantilla seleccionada */}
          {selected && (
            <div className="w-full rounded-lg border border-[#E9EDEF] bg-white p-6 lg:w-[400px] lg:shrink-0">
              <h3 className="text-lg font-semibold text-[#111B21]">{selected.name}</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    STATUS_COLORS[selected.status] ?? "bg-gray-100 text-gray-600"
                  }`}
                >
                  {STATUS_LABELS[selected.status] ?? selected.status}
                </span>
                <span className="rounded-full bg-[#E9EDEF] px-2 py-0.5 text-xs text-[#667781]">
                  {CATEGORY_LABELS[selected.category] ?? selected.category}
                </span>
                <span className="rounded-full bg-[#E9EDEF] px-2 py-0.5 text-xs text-[#667781]">
                  {selected.language}
                </span>
              </div>
              {selected.quality_score && (
                <p className="mt-2 text-sm text-[#667781]">
                  <span className="font-medium">Puntuación de calidad:</span> {selected.quality_score}
                </p>
              )}
              {selected.rejected_reason && (
                <p className="mt-2 text-sm text-red-600">
                  <span className="font-medium">Motivo rechazo:</span> {selected.rejected_reason}
                </p>
              )}
              <div className="mt-4 space-y-1 border-t border-[#E9EDEF] pt-4">
                <p className="text-xs font-medium uppercase text-[#667781]">Componentes</p>
                {selected.components?.map((c, i) => (
                  <div key={i} className="rounded bg-[#F0F2F5] p-3 text-sm text-[#111B21]">
                    <span className="font-medium text-[#667781]">{c.type}:</span>{" "}
                    {c.text ?? (c.buttons?.map((b) => b.text).join(", ") ?? "—")}
                  </div>
                ))}
              </div>
              <a
                href="https://business.facebook.com/wa/manage/message-templates/"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-block text-sm text-conversia-primary underline hover:no-underline"
              >
                Gestionar en Meta Business →
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
