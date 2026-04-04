"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

type ConversationTag = {
  id: string;
  name: string;
  slug: string;
  isSystem: boolean;
  order: number;
  _count?: { conversations: number };
};

export default function EtiquetasPage() {
  const router = useRouter();
  const [tags, setTags] = useState<ConversationTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [selected, setSelected] = useState<ConversationTag | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [form, setForm] = useState({ name: "" });

  const loadTags = useCallback(async () => {
    try {
      const r = await fetch("/api/conversation-tags");
      if (r.status === 401) {
        router.replace("/login");
        return;
      }
      const data = await r.json();
      if (Array.isArray(data)) setTags(data);
    } catch {
      setToast({ message: "Error al cargar etiquetas", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadTags();
  }, [loadTags]);

  const resetForm = () => {
    setForm({ name: "" });
    setSelected(null);
  };

  const openCreate = () => {
    resetForm();
    setModal("create");
  };

  const openEdit = (t: ConversationTag) => {
    if (t.slug === "bot") return;
    setSelected(t);
    setForm({ name: t.name });
    setModal("edit");
  };

  const saveTag = async () => {
    const name = form.name.trim();
    if (!name) {
      setToast({ message: "El nombre es requerido", type: "error" });
      return;
    }
    setToast(null);
    try {
      if (modal === "create") {
        const r = await fetch("/api/conversation-tags", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Error al crear");
        setToast({ message: "Etiqueta creada correctamente", type: "success" });
      } else if (selected && selected.slug !== "bot") {
        const r = await fetch(`/api/conversation-tags/${selected.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Error al actualizar");
        setToast({ message: "Etiqueta actualizada correctamente", type: "success" });
      }
      setModal(null);
      resetForm();
      loadTags();
    } catch (e) {
      setToast({ message: e instanceof Error ? e.message : "Error al guardar", type: "error" });
    }
  };

  const deleteTag = async (t: ConversationTag) => {
    if (t.slug === "bot" || t.isSystem) return; // Sistema: bot, sin_asignar, asistidas no se eliminan
    if (!confirm(`¿Eliminar la etiqueta "${t.name}"? Las conversaciones quedarán sin etiqueta personalizada.`)) return;
    setToast(null);
    try {
      const r = await fetch(`/api/conversation-tags/${t.id}`, { method: "DELETE" });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Error al eliminar");
      setToast({ message: "Etiqueta eliminada", type: "success" });
      loadTags();
    } catch (e) {
      setToast({ message: e instanceof Error ? e.message : "Error al eliminar", type: "error" });
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#111B21]">Etiquetas de conversaciones</h1>
          <p className="text-sm text-[#667781]">
            Gestiona las etiquetas para organizar conversaciones. Bot, Sin Asignar y Asistidas son del sistema (no se pueden eliminar). La etiqueta Bot no se puede modificar.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="rounded-lg bg-conversia-primary px-4 py-2 text-sm font-medium text-white hover:bg-conversia-primary-hover"
        >
          Agregar etiqueta
        </button>
      </div>

      {toast && (
        <div
          className={`mb-4 rounded-lg px-4 py-3 ${
            toast.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
          }`}
        >
          {toast.message}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-conversia-primary border-t-transparent" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#E9EDEF] bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E9EDEF] bg-[#F0F2F5]/50">
                <th className="px-4 py-3 text-left font-medium text-[#111B21]">Nombre</th>
                <th className="px-4 py-3 text-left font-medium text-[#111B21]">Tipo</th>
                <th className="px-4 py-3 text-left font-medium text-[#111B21]">Conversaciones</th>
                <th className="px-4 py-3 text-right font-medium text-[#111B21]">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {tags.map((t) => (
                <tr key={t.id} className="border-b border-[#E9EDEF] hover:bg-[#F0F2F5]/30">
                  <td className="px-4 py-3 font-medium text-[#111B21]">{t.name}</td>
                  <td className="px-4 py-3 text-[#667781]">
                    {t.slug === "bot" ? "Sistema (protegida)" : t.isSystem ? "Sistema" : "Personalizada"}
                  </td>
                  <td className="px-4 py-3 text-[#667781]">{t._count?.conversations ?? 0}</td>
                  <td className="px-4 py-3 text-right">
                    {t.slug !== "bot" && !t.isSystem && (
                      <>
                        <button
                          onClick={() => openEdit(t)}
                          className="mr-2 text-conversia-primary hover:underline"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => deleteTag(t)}
                          className="text-red-600 hover:underline"
                        >
                          Eliminar
                        </button>
                      </>
                    )}
                    {t.slug === "bot" && (
                      <span className="text-xs text-[#667781]">No modificable</span>
                    )}
                    {t.isSystem && t.slug !== "bot" && (
                      <button onClick={() => openEdit(t)} className="text-conversia-primary hover:underline">Editar</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold">
              {modal === "create" ? "Nueva etiqueta" : "Editar etiqueta"}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Nombre *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-lg border px-3 py-2"
                  placeholder="Ej. Urgentes, VIP, Seguimiento..."
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => {
                  setModal(null);
                  resetForm();
                }}
                className="rounded-lg border px-4 py-2 text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={saveTag}
                className="rounded-lg bg-conversia-primary px-4 py-2 text-sm font-medium text-white"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
