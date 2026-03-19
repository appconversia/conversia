import Link from "next/link";

export default function DocsIndexPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 p-8">
      <h1 className="text-2xl font-bold text-[#075E54] mb-6">Documentación WhatsApiBot</h1>
      <div className="space-y-4">
        <Link
          href="/docs/procedimiento-entrega-oscar"
          className="block p-4 border border-gray-200 rounded-lg hover:border-[#25D366] hover:bg-[#25D366]/5 transition"
        >
          <span className="font-semibold text-[#075E54]">Procedimiento de entrega</span>
          <span className="block text-sm text-gray-600 mt-1">Para el responsable de entrega — cada vez que se cierra un cliente</span>
        </Link>
        <Link
          href="/docs/manual-cliente"
          className="block p-4 border border-gray-200 rounded-lg hover:border-[#25D366] hover:bg-[#25D366]/5 transition"
        >
          <span className="font-semibold text-[#075E54]">Manual del cliente</span>
          <span className="block text-sm text-gray-600 mt-1">Para el cliente — conectar WhatsApp, entrenar, desplegar</span>
        </Link>
        <Link
          href="/docs/prompts-industrias"
          className="block p-4 border border-gray-200 rounded-lg hover:border-[#25D366] hover:bg-[#25D366]/5 transition"
        >
          <span className="font-semibold text-[#075E54]">Prompts por industria</span>
          <span className="block text-sm text-gray-600 mt-1">Plantillas en formato completo para la app (retail, restaurantes, salud, etc.)</span>
        </Link>
        <Link
          href="/docs/ordenes-cursor-entrenamiento"
          className="block p-4 border border-gray-200 rounded-lg hover:border-[#25D366] hover:bg-[#25D366]/5 transition"
        >
          <span className="font-semibold text-[#075E54]">Órdenes para Cursor</span>
          <span className="block text-sm text-gray-600 mt-1">Instrucciones para entrenar el bot a nivel de código, con ejemplos</span>
        </Link>
      </div>
    </div>
  );
}
