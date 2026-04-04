"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, type RegisterInput } from "@/lib/validations/auth";

function BBQLogo({ className = "w-14 h-14" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" suppressHydrationWarning>
      <ellipse cx="32" cy="20" rx="18" ry="6" fill="currentColor" opacity="0.9" />
      <path d="M14 20v24c0 3.3 8 6 18 6s18-2.7 18-6V20" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
      <ellipse cx="32" cy="44" rx="18" ry="6" fill="currentColor" opacity="0.9" />
      <line x1="14" y1="28" x2="50" y2="28" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
      <line x1="14" y1="34" x2="50" y2="34" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
      <line x1="14" y1="40" x2="50" y2="40" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
      <path d="M14 24c0-2 2-4 4-4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M50 24c0-2-2-4-4-4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: "", password: "", name: "", organizationName: "" },
  });

  const onSubmit = async (data: RegisterInput) => {
    setError(null);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      credentials: "include",
    });

    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Error al procesar");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <div className="hidden md:flex md:w-1/2 lg:w-2/5 bg-conversia-dark items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-conversia-primary flex items-center justify-center shadow-lg text-white" suppressHydrationWarning>
            <BBQLogo className="w-14 h-14" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Conversia</h2>
          <p className="text-[#D9FDD3]/90">Crea tu organización en minutos</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-12 bg-[#ECE5DD] min-h-screen">
        <div className="w-full max-w-md">
          <div className="md:hidden text-center mb-8">
            <div className="inline-flex w-16 h-16 rounded-full bg-conversia-primary items-center justify-center mb-4 text-white" suppressHydrationWarning>
              <BBQLogo className="w-10 h-10" />
            </div>
            <h1 className="text-2xl font-bold text-[#111B21]">Conversia</h1>
            <p className="text-[#667781]">Nueva cuenta</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-[#111B21] mb-6 hidden md:block">
              Crear cuenta
            </h2>
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label htmlFor="organizationName" className="block text-sm font-medium text-[#111B21] mb-1">
                  Organización o negocio
                </label>
                <input
                  id="organizationName"
                  type="text"
                  autoComplete="organization"
                  {...register("organizationName")}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-conversia-primary focus:ring-2 focus:ring-conversia-primary/20 outline-none transition text-[#111B21]"
                  placeholder="Ej. Mi tienda"
                />
                {errors.organizationName && (
                  <p className="mt-1 text-sm text-red-600">{errors.organizationName.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-[#111B21] mb-1">
                  Tu nombre
                </label>
                <input
                  id="name"
                  type="text"
                  autoComplete="name"
                  {...register("name")}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-conversia-primary focus:ring-2 focus:ring-conversia-primary/20 outline-none transition text-[#111B21]"
                  placeholder="Nombre y apellido"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-[#111B21] mb-1">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  {...register("email")}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-conversia-primary focus:ring-2 focus:ring-conversia-primary/20 outline-none transition text-[#111B21]"
                  placeholder="tu@email.com"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-[#111B21] mb-1">
                  Contraseña
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  {...register("password")}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-conversia-primary focus:ring-2 focus:ring-conversia-primary/20 outline-none transition text-[#111B21]"
                  placeholder="Mínimo 6 caracteres"
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                )}
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 rounded-lg bg-conversia-primary hover:bg-conversia-primary-hover text-white font-medium transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Creando cuenta…" : "Crear cuenta"}
              </button>
            </form>
            <p className="mt-6 text-center text-sm text-[#667781]">
              ¿Ya tienes cuenta?{" "}
              <Link href="/login" className="text-conversia-dark font-medium hover:underline">
                Iniciar sesión
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
