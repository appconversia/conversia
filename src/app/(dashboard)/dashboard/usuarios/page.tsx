"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createUserSchema,
  updateUserSchema,
  type CreateUserInput,
  type UpdateUserInput,
} from "@/lib/validations/user";
import { Toast } from "@/components/dashboard/toast";

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: string;
  active: boolean;
  createdAt: string;
};

type ModalType = "create" | "view" | "edit" | "confirm" | null;
type ConfirmAction = "activate" | "inactivate" | "delete" | null;

export default function UsuariosPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [protectedUserIds, setProtectedUserIds] = useState<string[]>([]);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [confirmUser, setConfirmUser] = useState<UserRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const createForm = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      role: "colaborador" as const,
      password: "",
      passwordConfirm: "",
    },
  });

  const editForm = useForm<UpdateUserInput>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      role: "colaborador" as const,
      password: "",
      passwordConfirm: "",
    },
  });

  const loadUsers = useCallback(async () => {
    setLoadError(null);
    try {
      const r = await fetch("/api/users");
      const data = await r.json();

      if (r.status === 401) {
        router.replace("/login");
        return;
      }
      if (r.status === 403) {
        router.replace("/dashboard");
        return;
      }
      if (!r.ok) {
        setLoadError(data?.error ?? "Error al cargar usuarios");
        return;
      }
      if (data?.users) setUsers(data.users);
      if (data?.protectedUserIds) setProtectedUserIds(data.protectedUserIds);
    } catch {
      setLoadError("Error de conexión. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
  };

  const onSubmitCreate = async (data: CreateUserInput) => {
    setError(null);
    setCreating(true);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Error al crear usuario");
      setCreating(false);
      return;
    }
    setUsers((prev) => [
      {
        id: json.user.id,
        email: json.user.email,
        name: json.user.name,
        phone: json.user.phone,
        role: json.user.role,
        active: json.user.active ?? true,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
    createForm.reset();
    setModalType(null);
    setCreating(false);
    showToast("Usuario creado correctamente", "success");
  };

  const onSubmitEdit = async (data: UpdateUserInput) => {
    if (!selectedUser) return;
    setError(null);
    setSaving(true);
    const body: Record<string, unknown> = {
      name: data.name,
      email: data.email,
      phone: data.phone,
      role: data.role,
    };
    if (data.password && data.password.length >= 6) {
      body.password = data.password;
      body.passwordConfirm = data.passwordConfirm;
    }
    const res = await fetch(`/api/users/${selectedUser.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Error al guardar");
      setSaving(false);
      return;
    }
    setUsers((prev) =>
      prev.map((u) => (u.id === selectedUser.id ? { ...u, ...json.user } : u))
    );
    setModalType(null);
    setSelectedUser(null);
    setSaving(false);
    showToast("Usuario actualizado correctamente", "success");
  };

  const openView = (u: UserRow) => {
    setSelectedUser(u);
    setModalType("view");
  };

  const openEdit = (u: UserRow) => {
    setSelectedUser(u);
    editForm.reset({
      name: u.name ?? "",
      email: u.email,
      phone: u.phone ?? "",
      role: (u.role === "admin" || u.role === "super_admin" ? "admin" : "colaborador") as "admin" | "colaborador",
      password: "",
      passwordConfirm: "",
    });
    setError(null);
    setModalType("edit");
  };

  const openConfirm = (u: UserRow, action: ConfirmAction) => {
    setConfirmUser(u);
    setConfirmAction(action);
    setModalType("confirm");
  };

  const executeConfirm = async () => {
    if (!confirmUser || !confirmAction) return;

    if (confirmAction === "delete") {
      const res = await fetch(`/api/users/${confirmUser.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) {
        showToast(json.error ?? "Error al eliminar", "error");
        setModalType(null);
        setConfirmUser(null);
        setConfirmAction(null);
        return;
      }
      setUsers((prev) => prev.filter((u) => u.id !== confirmUser.id));
      showToast("Usuario eliminado correctamente", "success");
    } else if (confirmAction === "activate" || confirmAction === "inactivate") {
      const res = await fetch(`/api/users/${confirmUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: confirmAction === "activate" }),
      });
      const json = await res.json();
      if (!res.ok) {
        showToast(json.error ?? "Error al cambiar estado", "error");
        setModalType(null);
        setConfirmUser(null);
        setConfirmAction(null);
        return;
      }
      setUsers((prev) =>
        prev.map((u) => (u.id === confirmUser.id ? { ...u, active: json.user.active } : u))
      );
      showToast(
        confirmAction === "activate"
          ? "Usuario activado correctamente"
          : "Usuario desactivado correctamente",
        "success"
      );
    }

    setModalType(null);
    setConfirmUser(null);
    setConfirmAction(null);
  };

  const canEditUser = (u: UserRow) => !protectedUserIds.includes(u.id);
  const canToggleUser = (u: UserRow) => !protectedUserIds.includes(u.id);
  const canDeleteUser = (u: UserRow) => !protectedUserIds.includes(u.id);

  const ModalBackdrop = ({ onClose, children }: { onClose: () => void; children: React.ReactNode }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10">{children}</div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-conversia-primary border-t-transparent" />
          <p className="text-sm text-[#667781]">Cargando usuarios…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-gray-100 bg-[#F0F2F5] px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-medium text-[#111B21]">Lista de usuarios</h2>
            <p className="text-sm text-[#667781]">
              {users.length} usuario{users.length !== 1 ? "s" : ""} en el sistema
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setError(null); createForm.reset(); setModalType("create"); }}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-conversia-primary px-4 py-2.5 font-medium text-white hover:bg-conversia-primary-hover transition"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Agregar usuario
          </button>
        </div>

        {loadError && (
          <div className="mx-6 mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-600">
            {loadError}
            <button type="button" onClick={() => { setLoading(true); loadUsers(); }} className="ml-2 font-medium underline">
              Reintentar
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-[#667781]">Nombre</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-[#667781]">Email</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-[#667781]">Teléfono</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-[#667781]">Rol</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-[#667781]">Estado</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-[#667781]">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-[#667781]">
                    No hay usuarios registrados. Haz clic en &quot;Agregar usuario&quot; para crear el primero.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className={`border-b border-gray-100 hover:bg-gray-50/50 transition ${!u.active ? "opacity-60" : ""}`}>
                    <td className="px-6 py-4 text-sm font-medium text-[#111B21]">{u.name ?? "—"}</td>
                    <td className="px-6 py-4 text-sm text-[#111B21]">{u.email}</td>
                    <td className="px-6 py-4 text-sm text-[#667781]">{u.phone ?? "—"}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                          u.role === "super_admin" || u.role === "admin"
                            ? "bg-conversia-primary/20 text-conversia-dark"
                            : "bg-gray-100 text-[#667781]"
                        }`}
                      >
                        {u.role === "super_admin" ? "Super Admin" : u.role === "admin" ? "Admin" : "Colaborador"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${u.active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {u.active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openView(u)}
                          className="rounded p-1.5 text-[#667781] hover:bg-gray-100 hover:text-[#111B21]"
                          title="Ver"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        {canEditUser(u) && (
                          <button
                            type="button"
                            onClick={() => openEdit(u)}
                            className="rounded p-1.5 text-[#667781] hover:bg-gray-100 hover:text-conversia-primary"
                            title="Editar"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        )}
                        {canToggleUser(u) && (
                          <button
                            type="button"
                            onClick={() => openConfirm(u, u.active ? "inactivate" : "activate")}
                            className={`rounded p-1.5 ${u.active ? "text-amber-600 hover:bg-amber-50" : "text-green-600 hover:bg-green-50"}`}
                            title={u.active ? "Inactivar" : "Activar"}
                          >
                            {u.active ? (
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                              </svg>
                            ) : (
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            )}
                          </button>
                        )}
                        {canDeleteUser(u) && (
                          <button
                            type="button"
                            onClick={() => openConfirm(u, "delete")}
                            className="rounded p-1.5 text-red-600 hover:bg-red-50"
                            title="Eliminar"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal crear */}
      {modalType === "create" && (
        <ModalBackdrop onClose={() => setModalType(null)}>
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-[#111B21]">Nuevo usuario</h3>
              <button type="button" onClick={() => setModalType(null)} className="rounded-lg p-1 text-[#667781] hover:bg-gray-100" aria-label="Cerrar">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={createForm.handleSubmit(onSubmitCreate)} className="p-6">
              {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
              <div className="space-y-4">
                <div>
                  <label htmlFor="create-name" className="mb-1.5 block text-sm font-medium text-[#111B21]">Nombre completo</label>
                  <input id="create-name" {...createForm.register("name")} className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-[#111B21] focus:border-conversia-primary focus:ring-2 focus:ring-conversia-primary/20 outline-none" placeholder="Juan Pérez" />
                  {createForm.formState.errors.name && <p className="mt-1 text-sm text-red-600">{createForm.formState.errors.name.message}</p>}
                </div>
                <div>
                  <label htmlFor="create-email" className="mb-1.5 block text-sm font-medium text-[#111B21]">Email</label>
                  <input id="create-email" type="email" {...createForm.register("email")} className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-[#111B21] focus:border-conversia-primary focus:ring-2 focus:ring-conversia-primary/20 outline-none" placeholder="juan@ejemplo.com" />
                  {createForm.formState.errors.email && <p className="mt-1 text-sm text-red-600">{createForm.formState.errors.email.message}</p>}
                </div>
                <div>
                  <label htmlFor="create-phone" className="mb-1.5 block text-sm font-medium text-[#111B21]">Teléfono</label>
                  <input id="create-phone" type="tel" {...createForm.register("phone")} className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-[#111B21] focus:border-conversia-primary focus:ring-2 focus:ring-conversia-primary/20 outline-none" placeholder="+57 300 123 4567" />
                </div>
                <div>
                  <label htmlFor="create-role" className="mb-1.5 block text-sm font-medium text-[#111B21]">Rol</label>
                  <select id="create-role" {...createForm.register("role")} className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-[#111B21] focus:border-conversia-primary focus:ring-2 focus:ring-conversia-primary/20 outline-none">
                    <option value="colaborador">Colaborador</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="create-password" className="mb-1.5 block text-sm font-medium text-[#111B21]">Contraseña</label>
                  <input id="create-password" type="password" {...createForm.register("password")} className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-[#111B21] focus:border-conversia-primary focus:ring-2 focus:ring-conversia-primary/20 outline-none" placeholder="Mínimo 6 caracteres" />
                  {createForm.formState.errors.password && <p className="mt-1 text-sm text-red-600">{createForm.formState.errors.password.message}</p>}
                </div>
                <div>
                  <label htmlFor="create-passwordConfirm" className="mb-1.5 block text-sm font-medium text-[#111B21]">Confirmar contraseña</label>
                  <input id="create-passwordConfirm" type="password" {...createForm.register("passwordConfirm")} className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-[#111B21] focus:border-conversia-primary focus:ring-2 focus:ring-conversia-primary/20 outline-none" placeholder="Repite la contraseña" />
                  {createForm.formState.errors.passwordConfirm && <p className="mt-1 text-sm text-red-600">{createForm.formState.errors.passwordConfirm.message}</p>}
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button type="button" onClick={() => setModalType(null)} className="rounded-lg px-4 py-2.5 text-sm font-medium text-[#667781] hover:bg-gray-100">Cancelar</button>
                <button type="submit" disabled={creating} className="rounded-lg bg-conversia-primary px-6 py-2.5 font-medium text-white hover:bg-conversia-primary-hover disabled:opacity-60">{creating ? "Creando…" : "Crear usuario"}</button>
              </div>
            </form>
          </div>
        </ModalBackdrop>
      )}

      {/* Modal ver */}
      {modalType === "view" && selectedUser && (
        <ModalBackdrop onClose={() => { setModalType(null); setSelectedUser(null); }}>
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-[#111B21]">Detalle de usuario</h3>
              <button type="button" onClick={() => { setModalType(null); setSelectedUser(null); }} className="rounded-lg p-1 text-[#667781] hover:bg-gray-100" aria-label="Cerrar">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4 p-6">
              <div>
                <p className="text-xs font-medium uppercase text-[#667781]">Nombre</p>
                <p className="mt-0.5 text-[#111B21]">{selectedUser.name ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-[#667781]">Email</p>
                <p className="mt-0.5 text-[#111B21]">{selectedUser.email}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-[#667781]">Teléfono</p>
                <p className="mt-0.5 text-[#111B21]">{selectedUser.phone ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-[#667781]">Rol</p>
                <p className="mt-0.5 text-[#111B21]">
                  {selectedUser.role === "super_admin" ? "Super Admin" : selectedUser.role === "admin" ? "Admin" : "Colaborador"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-[#667781]">Estado</p>
                <p className="mt-0.5 text-[#111B21]">{selectedUser.active ? "Activo" : "Inactivo"}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-[#667781]">Fecha de registro</p>
                <p className="mt-0.5 text-[#111B21]">{new Date(selectedUser.createdAt).toLocaleDateString("es")}</p>
              </div>
            </div>
          </div>
        </ModalBackdrop>
      )}

      {/* Modal editar */}
      {modalType === "edit" && selectedUser && (
        <ModalBackdrop onClose={() => { setModalType(null); setSelectedUser(null); setError(null); }}>
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-[#111B21]">Editar usuario</h3>
              <button type="button" onClick={() => { setModalType(null); setSelectedUser(null); setError(null); }} className="rounded-lg p-1 text-[#667781] hover:bg-gray-100" aria-label="Cerrar">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={editForm.handleSubmit(onSubmitEdit)} className="p-6">
              {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
              <div className="space-y-4">
                <div>
                  <label htmlFor="edit-name" className="mb-1.5 block text-sm font-medium text-[#111B21]">Nombre completo</label>
                  <input id="edit-name" {...editForm.register("name")} className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-[#111B21] focus:border-conversia-primary focus:ring-2 focus:ring-conversia-primary/20 outline-none" />
                  {editForm.formState.errors.name && <p className="mt-1 text-sm text-red-600">{editForm.formState.errors.name.message}</p>}
                </div>
                <div>
                  <label htmlFor="edit-email" className="mb-1.5 block text-sm font-medium text-[#111B21]">Email</label>
                  <input id="edit-email" type="email" {...editForm.register("email")} className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-[#111B21] focus:border-conversia-primary focus:ring-2 focus:ring-conversia-primary/20 outline-none" />
                  {editForm.formState.errors.email && <p className="mt-1 text-sm text-red-600">{editForm.formState.errors.email.message}</p>}
                </div>
                <div>
                  <label htmlFor="edit-phone" className="mb-1.5 block text-sm font-medium text-[#111B21]">Teléfono</label>
                  <input id="edit-phone" type="tel" {...editForm.register("phone")} className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-[#111B21] focus:border-conversia-primary focus:ring-2 focus:ring-conversia-primary/20 outline-none" />
                </div>
                <div>
                  <label htmlFor="edit-role" className="mb-1.5 block text-sm font-medium text-[#111B21]">Rol</label>
                  <select id="edit-role" {...editForm.register("role")} className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-[#111B21] focus:border-conversia-primary focus:ring-2 focus:ring-conversia-primary/20 outline-none">
                    <option value="colaborador">Colaborador</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="edit-password" className="mb-1.5 block text-sm font-medium text-[#111B21]">Nueva contraseña (opcional)</label>
                  <input id="edit-password" type="password" {...editForm.register("password")} className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-[#111B21] focus:border-conversia-primary focus:ring-2 focus:ring-conversia-primary/20 outline-none" placeholder="Dejar en blanco para mantener" />
                  {editForm.formState.errors.password && <p className="mt-1 text-sm text-red-600">{editForm.formState.errors.password.message}</p>}
                </div>
                <div>
                  <label htmlFor="edit-passwordConfirm" className="mb-1.5 block text-sm font-medium text-[#111B21]">Confirmar contraseña</label>
                  <input id="edit-passwordConfirm" type="password" {...editForm.register("passwordConfirm")} className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-[#111B21] focus:border-conversia-primary focus:ring-2 focus:ring-conversia-primary/20 outline-none" />
                  {editForm.formState.errors.passwordConfirm && <p className="mt-1 text-sm text-red-600">{editForm.formState.errors.passwordConfirm.message}</p>}
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button type="button" onClick={() => { setModalType(null); setSelectedUser(null); setError(null); }} className="rounded-lg px-4 py-2.5 text-sm font-medium text-[#667781] hover:bg-gray-100">Cancelar</button>
                <button type="submit" disabled={saving} className="rounded-lg bg-conversia-primary px-6 py-2.5 font-medium text-white hover:bg-conversia-primary-hover disabled:opacity-60">{saving ? "Guardando…" : "Guardar"}</button>
              </div>
            </form>
          </div>
        </ModalBackdrop>
      )}

      {/* Modal confirmar */}
      {modalType === "confirm" && confirmUser && confirmAction && (
        <ModalBackdrop onClose={() => { setModalType(null); setConfirmUser(null); setConfirmAction(null); }}>
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-[#111B21]">
              {confirmAction === "delete" && "¿Eliminar usuario?"}
              {confirmAction === "activate" && "¿Activar usuario?"}
              {confirmAction === "inactivate" && "¿Inactivar usuario?"}
            </h3>
            <p className="mt-2 text-sm text-[#667781]">
              {confirmAction === "delete" &&
                `Se eliminará "${confirmUser.name ?? confirmUser.email}" y todas sus sesiones. Esta acción no se puede deshacer.`}
              {confirmAction === "activate" &&
                `El usuario "${confirmUser.name ?? confirmUser.email}" podrá acceder nuevamente al sistema.`}
              {confirmAction === "inactivate" &&
                `El usuario "${confirmUser.name ?? confirmUser.email}" no podrá iniciar sesión hasta que sea reactivado.`}
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setModalType(null); setConfirmUser(null); setConfirmAction(null); }}
                className="rounded-lg px-4 py-2.5 text-sm font-medium text-[#667781] hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={executeConfirm}
                className={`rounded-lg px-6 py-2.5 font-medium text-white ${
                  confirmAction === "delete" ? "bg-red-600 hover:bg-red-700" : "bg-conversia-primary hover:bg-conversia-primary-hover"
                }`}
              >
                {confirmAction === "delete" && "Eliminar"}
                {confirmAction === "activate" && "Activar"}
                {confirmAction === "inactivate" && "Inactivar"}
              </button>
            </div>
          </div>
        </ModalBackdrop>
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
