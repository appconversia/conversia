"use client";

import { useRouter } from "next/navigation";

export function PlatformHeader({
  email,
  name,
}: {
  email: string;
  name: string | null;
}) {
  const router = useRouter();

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  };

  return (
    <header className="w-full border-b border-black/5 bg-white/90 backdrop-blur-sm">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-[#667781]">Conversia</p>
          <h1 className="text-lg font-semibold text-[#111B21]">Administración de plataforma</h1>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden sm:inline text-[#667781] truncate max-w-[200px]" title={email}>
            {name ?? email}
          </span>
          <button
            type="button"
            onClick={() => void logout()}
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-[#111B21] hover:bg-gray-50 transition"
          >
            Salir
          </button>
        </div>
      </div>
    </header>
  );
}
