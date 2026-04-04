import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession, isPlatformSuperAdmin } from "@/lib/auth";
import { PlatformHeader } from "./platform-header";

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  if (!isPlatformSuperAdmin(session)) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-[#ECE5DD] flex flex-col">
      <PlatformHeader email={session.email} name={session.name} />
      <div className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8">{children}</div>
      <footer className="py-6 text-center text-sm text-[#667781] border-t border-black/5">
        <Link href="/" className="text-conversia-dark hover:underline">
          Volver al inicio
        </Link>
      </footer>
    </div>
  );
}
