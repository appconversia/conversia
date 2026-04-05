import Link from "next/link";

const docLinks = [
  {
    href: "/docs/procedimiento-entrega-oscar",
    title: "Procedimiento de entrega",
    description: "Para el responsable de entrega — cada vez que se cierra un cliente",
  },
  {
    href: "/docs/manual-cliente",
    title: "Manual del cliente",
    description: "Para el cliente — conectar WhatsApp, entrenar, desplegar",
  },
  {
    href: "/docs/guia-meta-whatsapp",
    title: "Guía Meta / WhatsApp",
    description: "Qué copiar en Meta y qué pegar en Integración (tabla y orden de pasos)",
  },
  {
    href: "/docs/prompts-industrias",
    title: "Prompts por industria",
    description: "Plantillas en formato completo para la app (retail, restaurantes, salud, etc.)",
  },
  {
    href: "/docs/ordenes-cursor-entrenamiento",
    title: "Órdenes para Cursor",
    description: "Instrucciones para entrenar el bot a nivel de código, con ejemplos",
  },
];

export default function DocumentacionPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-conversia-dark mb-2">Documentación</h1>
      <p className="text-gray-600 mb-6">Manuales, procedimientos y guías de Conversia</p>
      <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
        {docLinks.map((doc) => (
          <Link
            key={doc.href}
            href={doc.href}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-5 border border-gray-200 rounded-xl hover:border-conversia-primary hover:bg-conversia-primary/5 transition-colors"
          >
            <span className="font-semibold text-conversia-dark">{doc.title}</span>
            <span className="block text-sm text-gray-600 mt-1">{doc.description}</span>
            <span className="inline-flex items-center gap-1 text-sm text-conversia-primary mt-2 font-medium">
              Abrir documento
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
