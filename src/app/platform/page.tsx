import { prisma } from "@/lib/db";

export default async function PlatformHomePage() {
  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      plan: true,
      _count: { select: { users: true } },
    },
  });

  return (
    <div>
      <p className="text-[#667781] mb-6">
        Organizaciones registradas en la plataforma (últimas 100).
      </p>

      <div className="rounded-xl bg-white shadow-sm overflow-hidden border border-black/5">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#f0f2f5] text-[#667781]">
              <tr>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Slug</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Usuarios</th>
                <th className="px-4 py-3 font-medium">Activo</th>
                <th className="px-4 py-3 font-medium">Alta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tenants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[#667781]">
                    No hay organizaciones todavía.
                  </td>
                </tr>
              ) : (
                tenants.map((t) => (
                  <tr key={t.id} className="hover:bg-[#f9f9f9]">
                    <td className="px-4 py-3 text-[#111B21] font-medium">{t.name}</td>
                    <td className="px-4 py-3 text-[#667781] font-mono text-xs">{t.slug}</td>
                    <td className="px-4 py-3 text-[#111B21]">{t.plan?.name ?? "—"}</td>
                    <td className="px-4 py-3">{t._count.users}</td>
                    <td className="px-4 py-3">{t.active ? "Sí" : "No"}</td>
                    <td className="px-4 py-3 text-[#667781] whitespace-nowrap">
                      {t.createdAt.toLocaleDateString("es", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
