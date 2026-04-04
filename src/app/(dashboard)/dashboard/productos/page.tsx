"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import { MEDIA_LIMITS, isImageFile, isVideoFile, validateImageSize, validateVideoSize } from "@/lib/media-upload";

type Category = { id: string; name: string };

type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  available: boolean;
  category: string;
  categoryId: string;
  characteristics: string | Record<string, string> | null;
  photos: string[];
  videos: string[];
  order: number;
};

export default function ProductosPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [selected, setSelected] = useState<Product | null>(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    stock: "0",
    available: true,
    categoryId: "",
    characteristics: "",
    photos: [] as string[],
    videos: [] as string[],
  });

  const loadProducts = useCallback(async () => {
    try {
      const r = await fetch("/api/products");
      if (r.status === 401) { router.replace("/login"); return; }
      if (r.status === 403) { router.replace("/dashboard"); return; }
      const data = await r.json();
      if (Array.isArray(data)) setProducts(data);
    } catch {
      setToast({ message: "Error al cargar productos", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [router]);

  const loadCategories = useCallback(async () => {
    try {
      const r = await fetch("/api/categories");
      if (r.ok) {
        const data = await r.json();
        if (Array.isArray(data)) setCategories(data);
      }
    } catch {
      // Ignorar
    }
  }, []);

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, [loadProducts, loadCategories]);

  const resetForm = () => {
    setForm({
      name: "",
      description: "",
      price: "",
      stock: "0",
      available: true,
      categoryId: categories[0]?.id ?? "",
      characteristics: "",
      photos: [],
      videos: [],
    });
    setSelected(null);
  };

  const openCreate = () => {
    resetForm();
    setModal("create");
  };

  const openEdit = (p: Product) => {
    setSelected(p);
    setForm({
      name: p.name,
      description: p.description,
      price: String(p.price),
      stock: String(p.stock),
      available: p.available,
      categoryId: p.categoryId ?? categories[0]?.id ?? "",
      characteristics: typeof p.characteristics === "string" ? (p.characteristics ?? "") : JSON.stringify(p.characteristics ?? {}, null, 2),
      photos: p.photos ?? [],
      videos: p.videos ?? [],
    });
    setModal("edit");
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImg = isImageFile({ name: file.name, type: file.type });
    const isVid = isVideoFile({ name: file.name, type: file.type });

    if (isImg) {
      const sizeCheck = validateImageSize(file.size);
      if (!sizeCheck.ok) {
        setToast({ message: sizeCheck.error!, type: "error" });
        e.target.value = "";
        return;
      }
    } else if (isVid) {
      const sizeCheck = validateVideoSize(file.size);
      if (!sizeCheck.ok) {
        setToast({ message: sizeCheck.error!, type: "error" });
        e.target.value = "";
        return;
      }
    } else {
      setToast({
        message: `Formato no admitido. Imágenes: ${MEDIA_LIMITS.image.formats.join(", ")} (máx. ${MEDIA_LIMITS.image.maxMB} MB). Videos: ${MEDIA_LIMITS.video.formats.join(", ")} (máx. ${MEDIA_LIMITS.video.maxMB} MB).`,
        type: "error",
      });
      e.target.value = "";
      return;
    }

    setUploadLoading(true);
    setToast(null);
    try {
      if (isVid) {
        const blob = await upload(file.name, file, {
          access: "public",
          handleUploadUrl: "/api/products/blob-upload",
          multipart: file.size > 4 * 1024 * 1024,
        });
        setForm((f) => ({ ...f, videos: [...f.videos, blob.url] }));
        setToast({ message: "Video subido correctamente", type: "success" });
      } else {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("type", "image");
        const r = await fetch("/api/products/upload", { method: "POST", body: fd });
        const text = await r.text();
        let data: { url?: string; error?: string };
        try {
          data = JSON.parse(text);
        } catch {
          if (r.status === 413) {
            throw new Error("La imagen es demasiado grande. Máx. 5 MB.");
          }
          throw new Error(text || "Error al subir");
        }
        if (r.ok && data.url) {
          setForm((f) => ({ ...f, photos: [...f.photos, data.url!] }));
          setToast({ message: "Imagen subida correctamente", type: "success" });
        } else {
          throw new Error(data.error || "Error al subir");
        }
      }
    } catch (e) {
      setToast({
        message: e instanceof Error ? e.message : "Error al subir archivo",
        type: "error",
      });
    } finally {
      setUploadLoading(false);
      e.target.value = "";
    }
  };

  const removePhoto = (url: string) => {
    setForm((f) => ({ ...f, photos: f.photos.filter((u) => u !== url) }));
  };

  const removeVideo = (url: string) => {
    setForm((f) => ({ ...f, videos: f.videos.filter((u) => u !== url) }));
  };

  const saveProduct = async () => {
    if (!form.name.trim()) {
      setToast({ message: "Nombre requerido", type: "error" });
      return;
    }
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        price: parseFloat(form.price) || 0,
        stock: parseInt(form.stock, 10) || 0,
        available: form.available,
        categoryId: form.categoryId || categories[0]?.id,
        characteristics: form.characteristics.trim() || undefined,
        photos: form.photos,
        videos: form.videos,
      };
      if (modal === "create") {
        const r = await fetch("/api/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error);
        setProducts((prev) => [...prev, { ...data }]);
        setToast({ message: "Producto creado", type: "success" });
      } else if (selected) {
        const r = await fetch(`/api/products/${selected.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error);
        setProducts((prev) => prev.map((p) => (p.id === selected.id ? data : p)));
        setToast({ message: "Producto actualizado", type: "success" });
      }
      setModal(null);
      loadProducts();
    } catch (e) {
      setToast({ message: e instanceof Error ? e.message : "Error al guardar", type: "error" });
    }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm("¿Eliminar este producto?")) return;
    try {
      const r = await fetch(`/api/products/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error();
      setProducts((prev) => prev.filter((p) => p.id !== id));
      setToast({ message: "Producto eliminado", type: "success" });
    } catch {
      setToast({ message: "Error al eliminar", type: "error" });
    }
  };

  const syncWithBot = async () => {
    setSyncLoading(true);
    setToast(null);
    try {
      const r = await fetch("/api/products/sync-bot", { method: "POST" });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setToast({ message: data.message ?? "Sincronizado con el bot", type: "success" });
    } catch (e) {
      setToast({ message: e instanceof Error ? e.message : "Error al sincronizar", type: "error" });
    } finally {
      setSyncLoading(false);
    }
  };

  const acceptMedia = `${MEDIA_LIMITS.image.accept},${MEDIA_LIMITS.video.accept}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-[#111B21]">Productos</h1>
        <div className="flex gap-2">
          <button
            onClick={syncWithBot}
            disabled={syncLoading || products.length === 0}
            className="rounded-lg bg-[#128C7E] px-4 py-2 text-sm font-medium text-white hover:bg-[#0a6e62] disabled:opacity-50"
          >
            {syncLoading ? "Sincronizando…" : "Sincronizar con bot"}
          </button>
          <button onClick={openCreate} className="rounded-lg bg-conversia-primary px-4 py-2 text-sm font-medium text-white hover:bg-[#20BD5C]">
            Agregar producto
          </button>
        </div>
      </div>

      <p className="text-sm text-[#667781]">
        Gestiona los productos que vendes. Puedes agregar imágenes (JPEG, PNG, WebP, GIF, HEIC — máx. {MEDIA_LIMITS.image.maxMB} MB) y videos (MP4, MOV, WebM, 3GP, M4V — máx. {MEDIA_LIMITS.video.maxMB} MB). Las imágenes se comprimen. Por producto: imagen (con descripción) y video (sin descripción); si no hay video, solo se envía la imagen.
      </p>

      {toast && (
        <div className={`rounded-lg px-4 py-2 text-sm ${toast.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
          {toast.message}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-[#667781]">Cargando...</div>
      ) : products.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#E9EDEF] bg-[#F0F2F5]/50 py-12 text-center text-[#667781]">
          No hay productos. Haz clic en &quot;Agregar producto&quot; para comenzar.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#E9EDEF] bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E9EDEF] bg-[#F0F2F5]/50">
                <th className="px-4 py-3 text-left font-medium text-[#111B21]">Nombre</th>
                <th className="px-4 py-3 text-left font-medium text-[#111B21]">Categoría</th>
                <th className="px-4 py-3 text-left font-medium text-[#111B21]">Precio</th>
                <th className="px-4 py-3 text-left font-medium text-[#111B21]">Stock</th>
                <th className="px-4 py-3 text-left font-medium text-[#111B21]">Disponible</th>
                <th className="px-4 py-3 text-left font-medium text-[#111B21]">Medios</th>
                <th className="px-4 py-3 text-right font-medium text-[#111B21]">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b border-[#E9EDEF] hover:bg-[#F0F2F5]/30">
                  <td className="px-4 py-3 font-medium text-[#111B21]">{p.name}</td>
                  <td className="px-4 py-3">{p.category ?? "-"}</td>
                  <td className="px-4 py-3">${Number(p.price).toLocaleString()}</td>
                  <td className="px-4 py-3">{p.stock}</td>
                  <td className="px-4 py-3">{p.available ? "Sí" : "No"}</td>
                  <td className="px-4 py-3">
                    {(p.photos?.length ?? 0) + (p.videos?.length ?? 0)} ({(p.photos?.length ?? 0)} imgs, {(p.videos?.length ?? 0)} videos)
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(p)} className="mr-2 text-conversia-primary hover:underline">Editar</button>
                    <button onClick={() => deleteProduct(p.id)} className="text-red-600 hover:underline">Borrar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold">{modal === "create" ? "Nuevo producto" : "Editar producto"}</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Nombre *</label>
                <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="w-full rounded-lg border px-3 py-2" placeholder="Ej. Barril 50L" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Categoría</label>
                <select value={form.categoryId} onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))} className="w-full rounded-lg border px-3 py-2">
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Descripción</label>
                <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} className="w-full rounded-lg border px-3 py-2" placeholder="Descripción del producto" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">Precio</label>
                  <input type="number" step="0.01" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} className="w-full rounded-lg border px-3 py-2" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Stock</label>
                  <input type="number" value={form.stock} onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))} className="w-full rounded-lg border px-3 py-2" />
                </div>
              </div>
              <div>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={form.available} onChange={(e) => setForm((f) => ({ ...f, available: e.target.checked }))} />
                  <span className="text-sm">Disponible</span>
                </label>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Características (JSON o texto)</label>
                <textarea value={form.characteristics} onChange={(e) => setForm((f) => ({ ...f, characteristics: e.target.value }))} rows={3} className="w-full rounded-lg border px-3 py-2 font-mono text-xs" placeholder='{"capacidad":"50L","material":"acero"}' />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Fotos y videos (imágenes máx. {MEDIA_LIMITS.image.maxMB} MB, videos máx. {MEDIA_LIMITS.video.maxMB} MB)
                </label>
                <input
                  type="file"
                  accept={acceptMedia}
                  onChange={handleUpload}
                  disabled={uploadLoading}
                  className="mb-2 block w-full text-sm"
                />
                {uploadLoading && <p className="mb-2 text-xs text-[#667781]">Subiendo y comprimiendo…</p>}
                <div className="flex flex-wrap gap-2">
                  {form.photos.map((url) => (
                    <div key={url} className="relative">
                      <img src={url} alt="" className="h-16 w-16 rounded object-cover" />
                      <button type="button" onClick={() => removePhoto(url)} className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1.5 py-0.5 text-xs text-white">×</button>
                    </div>
                  ))}
                  {form.videos.map((url) => (
                    <div key={url} className="relative">
                      <video src={url} className="h-16 w-16 rounded object-cover" muted playsInline />
                      <span className="absolute bottom-0 left-0 rounded bg-black/60 px-1 text-[10px] text-white">Video</span>
                      <button type="button" onClick={() => removeVideo(url)} className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1.5 py-0.5 text-xs text-white">×</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => { setModal(null); resetForm(); }} className="rounded-lg border px-4 py-2 text-sm">Cancelar</button>
              <button onClick={saveProduct} className="rounded-lg bg-conversia-primary px-4 py-2 text-sm font-medium text-white">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
