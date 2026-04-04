import Link from "next/link";

function BBQLogo({ className = "w-16 h-16" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      suppressHydrationWarning
    >
      <ellipse cx="32" cy="20" rx="18" ry="6" fill="currentColor" opacity="0.9" />
      <path
        d="M14 20v24c0 3.3 8 6 18 6s18-2.7 18-6V20"
        stroke="currentColor"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      <ellipse cx="32" cy="44" rx="18" ry="6" fill="currentColor" opacity="0.9" />
      <line x1="14" y1="28" x2="50" y2="28" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
      <line x1="14" y1="34" x2="50" y2="34" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
      <line x1="14" y1="40" x2="50" y2="40" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
      <path d="M14 24c0-2 2-4 4-4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M50 24c0-2-2-4-4-4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col bg-gradient-to-b from-[#ECE5DD] to-white">
      <header className="w-full px-6 py-5 flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-3 text-conversia-dark">
          <BBQLogo className="w-10 h-10" />
          <span className="font-semibold text-lg tracking-tight text-[#111B21]">Conversia</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Link
            href="/login"
            className="px-4 py-2 rounded-lg text-[#111B21] hover:bg-black/5 transition"
          >
            Iniciar sesión
          </Link>
          <Link
            href="/register"
            className="px-4 py-2 rounded-lg bg-conversia-primary text-white font-medium hover:bg-conversia-primary-hover transition"
          >
            Crear cuenta
          </Link>
        </div>
      </header>

      <section className="flex-1 flex flex-col items-center justify-center px-6 pb-24 pt-8 text-center max-w-3xl mx-auto">
        <div className="inline-flex w-24 h-24 rounded-full bg-conversia-primary items-center justify-center shadow-lg text-white mb-8">
          <BBQLogo className="w-14 h-14" />
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-[#111B21] leading-tight">
          Tu bot comercial en WhatsApp
        </h1>
        <p className="mt-6 text-lg text-[#667781] max-w-xl">
          Centraliza conversaciones, automatiza respuestas con IA y acompaña a tu equipo desde un solo
          panel. Cada organización tiene su espacio aislado y configurable.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Link
            href="/register"
            className="inline-flex justify-center px-8 py-3.5 rounded-xl bg-conversia-primary text-white font-semibold hover:bg-conversia-primary-hover transition shadow-md"
          >
            Empezar gratis
          </Link>
          <Link
            href="/login"
            className="inline-flex justify-center px-8 py-3.5 rounded-xl border-2 border-conversia-dark/20 text-[#111B21] font-semibold hover:bg-white/80 transition"
          >
            Ya tengo cuenta
          </Link>
        </div>
      </section>

      <footer className="py-8 text-center text-sm text-[#667781] border-t border-black/5">
        Conversia · Bot comercial para equipos de ventas
      </footer>
    </main>
  );
}
