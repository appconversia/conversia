"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

type Category = {
  id: string;
  name: string;
  order: number;
  _count?: { products: number };
};

export default function CategoriasPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [selected, setSelected] = useState<Category | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [form, setForm] = useState({ name: "" });

  const loadCategories = useCallback(async () => {
    try {
      const r = await fetch("/api/categories");
      if (r.status === 401) {
        router.replace("/login");
        return;
      }
      if (r.status === 403) {
        router.replace("/dashboard");
        return;
      }
      const data = await r.json();
      if (Array.isArray(data)) setCategories(data);
    } catch {
      setToast({ message: "Error al cargar categorías", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const resetForm = () => {
    setForm({ name: "" });
    setSelected(null);
  };

  const openCreate = () => {
    resetForm();
    setModal("create");
  };

  const openEdit = (c: Category) => {
    setSelected(c);
    setForm({ name: c.name });
    setModal("edit");
  };

  const saveCategory = async () => {
    const name = form.name.trim();
    if (!name) {
      setToast({ message: "El nombre es requerido", type: "error" });
      return;
    }
    setToast(null);
    try {
      if (modal === "create") {
        const r = await fetch("/api/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Error al crear");
        setToast({ message: "Categoría creada correctamente", type: "success" });
      } else if (selected) {
        const r = await fetch(`/api/categories/${selected.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Error al actualizar");
        setToast({ message: "Categoría actualizada correctamente", type: "success" });
      }
      setModal(null);
      resetForm();
      loadCategories();
    } catch (e) {
      setToast({ message: e instanceof Error ? e.message : "Error al guardar", type: "error" });
    }
  };

  const deleteCategory = async (c: Category) => {
    if (!confirm(`¿Eliminar la categoría "${c.name}"? No se puede si tiene productos asignados.`)) return;
    setToast(null);
    try {
      const r = await fetch(`/api/categories/${c.id}`, { method: "DELETE" });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Error al eliminar");
      setToast({ message: "Categoría eliminada", type: "success" });
      loadCategories();
    } catch (e) {
      setToast({ message: e instanceof Error ? e.message : "Error al eliminar", type: "error" });
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#111B21]">Categorías</h1>
          <p className="text-sm text-[#667781]">Gestiona las categorías de productos</p>
        </div>
        <button
          onClick={openCreate}
          className="rounded-lg bg-conversia-primary px-4 py-2 text-sm font-medium text-white hover:bg-conversia-primary-hover"
        >
          Agregar categoría
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
      ) : categories.length === 0 ? (
        <div className="rounded-xl border border-[#E9EDEF] bg-white p-12 text-center text-[#667781]">
          No hay categorías. Haz clic en &quot;Agregar categoría&quot; para comenzar.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#E9EDEF] bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E9EDEF] bg-[#F0F2F5]/50">
                <th className="px-4 py-3 text-left font-medium text-[#111B21]">Nombre</th>
                <th className="px-4 py-3 text-left font-medium text-[#111B21]">Productos</th>
                <th className="px-4 py-3 text-right font-medium text-[#111B21]">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id} className="border-b border-[#E9EDEF] hover:bg-[#F0F2F5]/30">
                  <td className="px-4 py-3 font-medium text-[#111B21]">{c.name}</td>
                  <td className="px-4 py-3 text-[#667781]">{c._count?.products ?? 0}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openEdit(c)}
                      className="mr-2 text-conversia-primary hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => deleteCategory(c)}
                      className="text-red-600 hover:underline"
                    >
                      Eliminar
                    </button>
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
              {modal === "create" ? "Nueva categoría" : "Editar categoría"}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Nombre *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-lg border px-3 py-2"
                  placeholder="Ej. Barriles, Accesorios..."
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
                onClick={saveCategory}
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
