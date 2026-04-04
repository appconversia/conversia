export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold text-gray-900">Conversia</h1>
      <p className="mt-4 text-gray-600">
        Stack: Next.js 15 + TypeScript + Tailwind + Prisma + PostgreSQL
      </p>
      <p className="mt-2 text-sm text-gray-500">
        Puerto dev: 3000 | PostgreSQL: 5432
      </p>
    </main>
  );
}
