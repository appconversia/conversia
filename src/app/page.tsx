import Link from "next/link";
import { DM_Sans, Fraunces } from "next/font/google";

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

const features = [
  {
    title: "Multi-organización",
    body: "Cada cliente tiene su espacio aislado: usuarios, conversaciones y catálogo sin mezclar datos.",
  },
  {
    title: "IA + reglas",
    body: "Flujos visuales, respuestas con modelo y handoff limpio a tu equipo cuando haga falta.",
  },
  {
    title: "WhatsApp nativo",
    body: "Diseñado para Cloud API: plantillas, medios y seguimiento en un solo panel.",
  },
  {
    title: "Listo para escalar",
    body: "Arquitectura preparada para Vercel y PostgreSQL (Neon) con despliegues sin fricción.",
  },
];

const steps = [
  { n: "01", t: "Crea tu cuenta", d: "Registra tu organización en minutos." },
  { n: "02", t: "Conecta WhatsApp", d: "Configura credenciales y verificación del webhook." },
  { n: "03", t: "Entrena y publica", d: "Catálogo, bot y plantillas alineados a tu marca." },
];

export default function Home() {
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
              SaaS
            </span>
          </div>
        </Link>
        <nav className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/login"
            className="rounded-full px-4 py-2 text-sm font-medium text-[#c5d4cc] transition hover:text-white"
          >
            Entrar
          </Link>
          <Link
            href="/register"
            className="rounded-full bg-gradient-to-r from-[#25D366] to-[#1ebe5d] px-5 py-2.5 text-sm font-semibold text-[#04140c] shadow-lg shadow-emerald-500/25 transition hover:brightness-105"
          >
            Crear cuenta
          </Link>
        </nav>
      </header>

      <main className="relative z-10">
        <section className="mx-auto max-w-6xl px-5 pb-20 pt-6 sm:px-8 sm:pb-28 sm:pt-10">
          <div className="max-w-3xl">
            <p className={`${fraunces.className} text-sm font-medium italic text-emerald-300/90 sm:text-base`}>
              Bot comercial para equipos que venden por WhatsApp
            </p>
            <h1
              className={`${fraunces.className} mt-4 text-4xl font-semibold leading-[1.1] tracking-tight sm:text-6xl sm:leading-[1.05]`}
            >
              Conversaciones centralizadas.
              <span className="block bg-gradient-to-r from-[#7ef0a8] via-[#25D366] to-[#12b8a8] bg-clip-text text-transparent">
                Respuestas más rápidas.
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-[#9fb5a8]">
              Un panel único para tu organización: etiquetas, catálogo, IA y handoff humano — con la misma
              experiencia visual que tu equipo ya conoce.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded-2xl bg-white px-8 py-4 text-base font-semibold text-[#06251a] shadow-xl shadow-black/30 transition hover:bg-[#f0fff6]"
              >
                Empezar gratis
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-8 py-4 text-base font-medium text-[#e8f0ec] backdrop-blur transition hover:bg-white/10"
              >
                Acceder al panel
              </Link>
            </div>
            <dl className="mt-14 grid grid-cols-2 gap-6 border-t border-white/10 pt-10 sm:grid-cols-4">
              {[
                { k: "Multi-tenant", v: "aislado" },
                { k: "IA + flujos", v: "configurable" },
                { k: "Deploy", v: "Vercel + Neon" },
                { k: "Marca", v: "Conversia" },
              ].map((row) => (
                <div key={row.k}>
                  <dt className="text-xs font-medium uppercase tracking-widest text-[#5c7368]">{row.k}</dt>
                  <dd className={`${fraunces.className} mt-1 text-lg font-semibold text-white`}>{row.v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="border-y border-white/5 bg-[#070d0a]/80 py-20 backdrop-blur-sm">
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <h2 className={`${fraunces.className} text-3xl font-semibold text-white sm:text-4xl`}>
              Todo lo que necesitas para operar
            </h2>
            <p className="mt-3 max-w-2xl text-[#8fa99c]">
              Herramientas pensadas para ventas B2C y soporte: sin pantallas sueltas ni mini aplicaciones
              incoherentes.
            </p>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((f) => (
                <article
                  key={f.title}
                  className="group rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-transparent p-6 transition hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/5"
                >
                  <div className="mb-4 h-1 w-10 rounded-full bg-gradient-to-r from-[#25D366] to-[#128C7E]" />
                  <h3 className={`${fraunces.className} text-lg font-semibold text-white`}>{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#9fb5a8]">{f.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
          <h2 className={`${fraunces.className} text-3xl font-semibold text-white sm:text-4xl`}>Cómo funciona</h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {steps.map((s) => (
              <div key={s.n} className="relative rounded-2xl border border-white/10 bg-[#0a1210] p-8">
                <span className={`${fraunces.className} text-4xl font-semibold text-emerald-500/40`}>{s.n}</span>
                <h3 className={`${fraunces.className} mt-4 text-xl font-semibold text-white`}>{s.t}</h3>
                <p className="mt-2 text-[#9fb5a8]">{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-24 sm:px-8">
          <div className="overflow-hidden rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-[#0f2e24] via-[#0a1814] to-[#050807] p-10 sm:p-14">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className={`${fraunces.className} text-3xl font-semibold text-white sm:text-4xl`}>
                  ¿Listo para probar Conversia?
                </h2>
                <p className="mt-3 max-w-xl text-[#b8cfc2]">
                  Crea tu organización, invita a tu equipo y conecta WhatsApp cuando quieras.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/register"
                  className="inline-flex justify-center rounded-2xl bg-[#25D366] px-8 py-4 font-semibold text-[#04140c] shadow-lg shadow-emerald-500/30 hover:brightness-105"
                >
                  Registrarme
                </Link>
                <Link
                  href="/privacidad"
                  className="text-center text-sm text-[#8fa99c] underline-offset-4 hover:text-white hover:underline"
                >
                  Privacidad
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/10 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-5 sm:flex-row sm:px-8">
          <div className={`${fraunces.className} flex items-center gap-2 text-lg font-semibold text-[#c5d4cc]`}>
            <LogoMark className="h-8 w-8 text-emerald-400" />
            Conversia
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-[#7a9184]">
            <Link href="/terminos" className="hover:text-white">
              Términos
            </Link>
            <Link href="/privacidad" className="hover:text-white">
              Privacidad
            </Link>
            <Link href="/login" className="hover:text-white">
              Acceso clientes
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
