import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export type DashboardHeroProps = {
  /** Etiqueta superior en mayúsculas (ej. «Tu comercio», «Administración SaaS») */
  overline?: string;
  title: string;
  description?: string;
  /** Botones o enlaces; usar `DashboardHeroPrimaryLink` / `DashboardHeroGhostLink` para el mismo estilo que el tablero plataforma */
  actions?: ReactNode;
  className?: string;
};

/**
 * Contenedor hero con gradiente verde oscuro (misma estética que el tablero super admin plataforma).
 */
export function DashboardHero({ overline, title, description, actions, className = "" }: DashboardHeroProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-[#0d3d36]/20 bg-gradient-to-br from-[#075E54] via-[#064a42] to-[#022c28] p-6 text-white shadow-lg sm:p-8 ${className}`}
    >
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-conversia-primary/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 left-10 h-48 w-48 rounded-full bg-teal-400/10 blur-2xl" />
      <div className="relative">
        {overline ? (
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#D9FDD3]/90">{overline}</p>
        ) : null}
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-sm text-[#E9EDEF]/90">{description}</p> : null}
        {actions ? <div className="mt-6 flex flex-wrap gap-3">{actions}</div> : null}
      </div>
    </div>
  );
}

const primaryBtn =
  "inline-flex items-center justify-center rounded-xl bg-conversia-primary px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-conversia-primary-hover";
const ghostBtn =
  "inline-flex items-center justify-center rounded-xl border border-white/35 bg-white/15 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/25";
const ghostMutedBtn =
  "inline-flex items-center justify-center rounded-xl border border-white/25 bg-white/10 px-5 py-2.5 text-sm font-medium text-white backdrop-blur transition hover:bg-white/15";

export function DashboardHeroPrimaryLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className={primaryBtn}>
      {children}
    </Link>
  );
}

export function DashboardHeroGhostLink({ href, children, muted }: { href: string; children: ReactNode; muted?: boolean }) {
  return (
    <Link href={href} className={muted ? ghostMutedBtn : ghostBtn}>
      {children}
    </Link>
  );
}

/** Botón primario dentro del hero (p. ej. abrir modal) — mismo aspecto que el enlace primario */
export function DashboardHeroPrimaryButton({
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button type="button" className={primaryBtn} {...props}>
      {children}
    </button>
  );
}

export function DashboardHeroGhostButton({
  children,
  muted,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode; muted?: boolean }) {
  return (
    <button type="button" className={muted ? ghostMutedBtn : ghostBtn} {...props}>
      {children}
    </button>
  );
}
