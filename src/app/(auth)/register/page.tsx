"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DM_Sans, Fraunces } from "next/font/google";
import { registerSchema, type RegisterInput } from "@/lib/validations/auth";

const dmSans = DM_Sans({
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
});

function LogoMark({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <ellipse cx="32" cy="20" rx="18" ry="6" fill="currentColor" opacity="0.95" />
      <path
        d="M14 20v24c0 3.3 8 6 18 6s18-2.7 18-6V20"
        stroke="currentColor"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      <ellipse cx="32" cy="44" rx="18" ry="6" fill="currentColor" opacity="0.95" />
      <line x1="14" y1="28" x2="50" y2="28" stroke="currentColor" strokeWidth="1.5" opacity="0.45" />
      <line x1="14" y1="34" x2="50" y2="34" stroke="currentColor" strokeWidth="1.5" opacity="0.45" />
      <line x1="14" y1="40" x2="50" y2="40" stroke="currentColor" strokeWidth="1.5" opacity="0.45" />
    </svg>
  );
}

const inputClass =
  "mt-2 w-full rounded-xl border border-white/10 bg-[#050807]/80 px-4 py-3 text-[#e8f0ec] outline-none transition placeholder:text-[#5c7368] focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20";

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
    <div className={`${dmSans.className} min-h-screen bg-[#050807] text-[#e8f0ec]`}>
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.35]"
        style={{
          backgroundImage: `radial-gradient(ellipse 80% 60% at 50% -30%, rgba(37,211,102,0.35), transparent), radial-gradient(ellipse 60% 50% at 100% 0%, rgba(18,140,126,0.25), transparent)`,
        }}
      />
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.08] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-5 py-6 sm:px-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#25D366] to-[#128C7E] text-white shadow-lg shadow-emerald-500/20">
            <LogoMark className="h-7 w-7" />
          </div>
          <div className="leading-tight">
            <span className={`${fraunces.className} text-xl font-semibold tracking-tight`}>Conversia</span>
            <span className="ml-2 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-emerald-300/90">
              Registro
            </span>
          </div>
        </Link>
        <Link
          href="/"
          className="rounded-full px-4 py-2 text-sm font-medium text-[#c5d4cc] transition hover:text-white"
        >
          ← Volver al inicio
        </Link>
      </header>

      <main className="relative z-10 mx-auto flex max-w-6xl flex-col items-center justify-center px-5 pb-20 pt-4 sm:px-8 lg:flex-row lg:items-stretch lg:gap-12 lg:pb-28">
        <div className="mb-10 max-w-md lg:mb-0 lg:flex-1 lg:pt-8">
          <p className={`${fraunces.className} text-sm font-medium italic text-emerald-300/90 sm:text-base`}>
            Nuevo comercio
          </p>
          <h1
            className={`${fraunces.className} mt-4 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl`}
          >
            Crea tu cuenta
            <span className="mt-1 block bg-gradient-to-r from-[#7ef0a8] via-[#25D366] to-[#12b8a8] bg-clip-text text-transparent">
              en minutos.
            </span>
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-[#9fb5a8]">
            Misma estética que el inicio de sesión: un solo espacio para tu equipo, tu catálogo y WhatsApp.
          </p>
        </div>

        <div className="w-full max-w-md">
          <div className="rounded-3xl border border-white/10 bg-[#0a1210]/90 p-6 shadow-2xl shadow-black/40 backdrop-blur-sm sm:p-8">
            <h2 className={`${fraunces.className} text-xl font-semibold text-white`}>Crear cuenta</h2>
            {error && (
              <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
              <div>
                <label htmlFor="organizationName" className="block text-sm font-medium text-[#c5d4cc]">
                  Comercio o negocio
                </label>
                <input
                  id="organizationName"
                  type="text"
                  autoComplete="organization"
                  {...register("organizationName")}
                  className={inputClass}
                  placeholder="Ej. Mi tienda"
                />
                {errors.organizationName && (
                  <p className="mt-1 text-sm text-red-300">{errors.organizationName.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-[#c5d4cc]">
                  Tu nombre
                </label>
                <input
                  id="name"
                  type="text"
                  autoComplete="name"
                  {...register("name")}
                  className={inputClass}
                  placeholder="Nombre y apellido"
                />
                {errors.name && <p className="mt-1 text-sm text-red-300">{errors.name.message}</p>}
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-[#c5d4cc]">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  {...register("email")}
                  className={inputClass}
                  placeholder="tu@email.com"
                />
                {errors.email && <p className="mt-1 text-sm text-red-300">{errors.email.message}</p>}
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-[#c5d4cc]">
                  Contraseña
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  {...register("password")}
                  className={inputClass}
                  placeholder="Mínimo 6 caracteres"
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-red-300">{errors.password.message}</p>
                )}
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-2xl bg-gradient-to-r from-[#25D366] to-[#1ebe5d] py-3.5 text-base font-semibold text-[#04140c] shadow-lg shadow-emerald-500/25 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Creando cuenta…" : "Crear cuenta y entrar"}
              </button>
            </form>
            <p className="mt-8 text-center text-sm text-[#7a9184]">
              ¿Ya tienes cuenta?{" "}
              <Link href="/login" className="font-medium text-emerald-300 hover:text-white hover:underline">
                Iniciar sesión
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
