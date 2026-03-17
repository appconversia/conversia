"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

type BotLog = {
  id: string;
  level: string;
  stage: string;
  message: string;
  conversationId: string | null;
  contactId: string | null;
  phone: string | null;
  metadata: string | null;
  error: string | null;
  createdAt: string;
};

const STAGES = [
  "webhook", "router", "batch", "main_brain", "sales_flow",
  "product_response", "product_detail", "product_selection", "whatsapp_send", "send_image", "upload", "other",
];
const LEVELS = ["error", "warn", "info", "debug"];

function LevelBadge({ level }: { level: string }) {
  const classes: Record<string, string> = {
    error: "bg-red-100 text-red-800 border-red-200",
    warn: "bg-amber-100 text-amber-800 border-amber-200",
    info: "bg-blue-100 text-blue-800 border-blue-200",
    debug: "bg-gray-100 text-gray-600 border-gray-200",
  };
  const c = classes[level] ?? "bg-gray-100";
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium border ${c}`}>
      {level}
    </span>
  );
}

export default function LogsPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<BotLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [realtime, setRealtime] = useState(true);
  const [filterLevel, setFilterLevel] = useState("");
  const [filterStage, setFilterStage] = useState("");
  const [filterSince, setFilterSince] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    const params = new URLSearchParams();
    if (filterLevel) params.set("level", filterLevel);
    if (filterStage) params.set("stage", filterStage);
    if (filterSince) params.set("since", filterSince);
    params.set("limit", "200");
    const res = await fetch(`/api/admin/logs?${params.toString()}`);
    if (res.status === 401) {
      router.replace("/login");
      return;
    }
    if (res.status === 403) {
      setError("Solo super_admin puede ver logs");
      setLogs([]);
      return;
    }
    if (!res.ok) {
      setError("Error al cargar logs");
      return;
    }
    const data = await res.json();
    setLogs(data.logs ?? []);
    setError(null);
  }, [filterLevel, filterStage, filterSince, router]);

  useEffect(() => {
    setLoading(true);
    fetchLogs().finally(() => setLoading(false));
  }, [fetchLogs]);

  useEffect(() => {
    if (!realtime) return;
    const id = setInterval(fetchLogs, 3000);
    return () => clearInterval(id);
  }, [realtime, fetchLogs]);

  if (error && !loading) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-gray-900">Logs del Bot</h1>
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={realtime}
              onChange={(e) => setRealtime(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">Tiempo real (3s)</span>
          </label>
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          >
            <option value="">Todos los niveles</option>
            {LEVELS.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
          <select
            value={filterStage}
            onChange={(e) => setFilterStage(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          >
            <option value="">Todos los stages</option>
            {STAGES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <input
            type="datetime-local"
            value={filterSince}
            onChange={(e) => setFilterSince(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          />
          <button
            type="button"
            onClick={() => {
              setFilterLevel("");
              setFilterStage("");
              setFilterSince("");
            }}
            className="rounded-md bg-gray-100 px-3 py-1.5 text-sm hover:bg-gray-200"
          >
            Limpiar
          </button>
        </div>
      </div>

      {loading && logs.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center text-gray-600">
          Cargando logs…
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center text-gray-600">
          No hay logs con los filtros seleccionados
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <div className="max-h-[calc(100vh-280px)] overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nivel</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Stage</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Mensaje</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Contexto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {logs.map((log) => (
                  <React.Fragment key={log.id}>
                    <tr
                      className={`hover:bg-gray-50 ${log.level === "error" ? "bg-red-50/50" : log.level === "warn" ? "bg-amber-50/50" : ""}`}
                      onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                    >
                      <td className="whitespace-nowrap px-4 py-2 text-xs text-gray-500">
                        {new Date(log.createdAt).toLocaleString("es-CO")}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2">
                        <LevelBadge level={log.level} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-sm font-mono text-gray-600">{log.stage}</td>
                      <td className="max-w-md px-4 py-2 text-sm text-gray-900">{log.message}</td>
                      <td className="px-4 py-2 text-xs text-gray-500">
                        {log.phone ? (
                          <span title={log.phone}>{log.phone.replace(/\d(?=\d{4})/g, "*")}</span>
                        ) : log.conversationId ? (
                          <span className="font-mono">{log.conversationId.slice(0, 8)}…</span>
                        ) : "-"}
                      </td>
                    </tr>
                    {expandedId === log.id ? (
                      <tr className="bg-gray-50">
                        <td colSpan={5} className="px-4 py-2 text-xs">
                          <div className="space-y-1 font-mono">
                            {log.metadata && (
                              <div>
                                <span className="text-gray-500">metadata:</span>
                                <pre className="mt-1 overflow-x-auto whitespace-pre-wrap rounded bg-white p-2 text-gray-700">{log.metadata}</pre>
                              </div>
                            )}
                            {log.error && (
                              <div>
                                <span className="text-red-600">error:</span> <span className="text-red-700">{log.error}</span>
                              </div>
                            )}
                            {log.phone && <div><span className="text-gray-500">phone:</span> {log.phone}</div>}
                            {log.conversationId && <div><span className="text-gray-500">conversationId:</span> {log.conversationId}</div>}
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
