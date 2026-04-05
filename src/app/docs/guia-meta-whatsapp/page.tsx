import Link from "next/link";

export default function GuiaMetaWhatsAppPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <article className="max-w-3xl mx-auto px-8 py-12">
        <header className="mb-10">
          <p className="text-sm text-gray-500 mb-2">
            <Link href="/docs" className="text-conversia-primary hover:underline">
              ← Documentación
            </Link>
          </p>
          <h1 className="text-3xl font-bold text-conversia-dark mb-2">Guía Meta / WhatsApp → Conversia</h1>
          <p className="text-gray-600">
            Qué obtener en Meta for Developers y qué pegar en <strong>Configuración → Integración</strong>. Sin variables globales de
            WhatsApp en el servidor: cada comercio guarda sus credenciales.
          </p>
        </header>

        <section className="mb-10">
          <h2 className="text-xl font-bold text-conversia-dark mb-4 border-b border-gray-200 pb-2">1. Dónde va cada cosa</h2>
          <ul className="list-disc pl-6 space-y-2 text-gray-700">
            <li>
              <strong>Vercel (u otro hosting):</strong> base de datos, URL pública de la app, Blob, Pusher opcional. Ver{" "}
              <code className="bg-gray-100 px-1 rounded">VARIABLES_DESPLIEGUE.md</code> en el repositorio.
            </li>
            <li>
              <strong>Panel Conversia → Integración:</strong> Access Token, Phone Number ID, WhatsApp Business Account ID, token de
              verificación del webhook, App ID y App Secret de Meta, activación de la integración.
            </li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-bold text-conversia-dark mb-4 border-b border-gray-200 pb-2">2. Mapa Meta → campo en Integración</h2>
          <div className="overflow-x-auto border border-gray-200 rounded-lg text-sm">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border-b border-gray-200 p-3 text-left font-semibold">En Conversia</th>
                  <th className="border-b border-gray-200 p-3 text-left font-semibold">Dónde en Meta</th>
                </tr>
              </thead>
              <tbody className="text-gray-700">
                <tr>
                  <td className="border-b border-gray-100 p-3">Access Token</td>
                  <td className="border-b border-gray-100 p-3">WhatsApp → API Setup / Getting started (token temporal o permanente)</td>
                </tr>
                <tr>
                  <td className="border-b border-gray-100 p-3">Phone Number ID</td>
                  <td className="border-b border-gray-100 p-3">WhatsApp → API Setup o Números de teléfono</td>
                </tr>
                <tr>
                  <td className="border-b border-gray-100 p-3">WhatsApp Business Account ID</td>
                  <td className="border-b border-gray-100 p-3">Cabecera / configuración de la cuenta WhatsApp (WABA ID)</td>
                </tr>
                <tr>
                  <td className="border-b border-gray-100 p-3">Webhook Verify Token</td>
                  <td className="border-b border-gray-100 p-3">
                    Lo inventas tú; el mismo texto en Meta (Verify token) y aquí. <strong>No es una URL.</strong>
                  </td>
                </tr>
                <tr>
                  <td className="border-b border-gray-100 p-3">App ID (Meta)</td>
                  <td className="border-b border-gray-100 p-3">App → Configuración → Básico → Identificador de la aplicación</td>
                </tr>
                <tr>
                  <td className="border-b border-gray-100 p-3">App Secret (Meta)</td>
                  <td className="border-b border-gray-100 p-3">App → Configuración → Básico → Clave secreta (Secreto de la app)</td>
                </tr>
                <tr>
                  <td className="p-3">URL del webhook</td>
                  <td className="p-3">
                    La muestra Integración: <code className="bg-gray-100 px-1 rounded">https://TU-DOMINIO/api/webhook/whatsapp</code> →
                    Callback URL en Meta
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-bold text-conversia-dark mb-4 border-b border-gray-200 pb-2">3. Orden recomendado</h2>
          <ol className="list-decimal pl-6 space-y-3 text-gray-700">
            <li>Crea la app (tipo Empresa) y añade el producto WhatsApp en developers.facebook.com.</li>
            <li>Copia App ID y App Secret desde Configuración → Básico.</li>
            <li>Copia token, Phone Number ID y WABA ID desde la sección WhatsApp.</li>
            <li>
              En Integración, rellena los campos y define el Verify Token; guárdalo también en Meta al configurar el webhook (misma
              cadena).
            </li>
            <li>Pega en Meta la Callback URL exacta que muestra el panel y pulsa Verificar y guardar.</li>
            <li>
              Completa App Secret en Integración: Meta firma los webhooks con <code className="bg-gray-100 px-1">X-Hub-Signature-256</code>;
              sin el secreto correcto pueden rechazarse las notificaciones.
            </li>
            <li>Activa la integración, guarda y usa &quot;Suscribir webhook&quot; / diagnóstico si hace falta.</li>
          </ol>
        </section>

        <section className="mb-10 rounded-lg bg-amber-50 border border-amber-200 p-4 text-amber-900 text-sm">
          <p className="font-semibold mb-1">Políticas y producción</p>
          <p>
            Para pasar revisión de Meta necesitas URLs de privacidad, términos y eliminación de datos. En Integración verás referencias a
            las rutas de esta app (<code className="bg-amber-100 px-1 rounded">/privacidad</code>,{" "}
            <code className="bg-amber-100 px-1 rounded">/eliminacion-datos</code>, etc.) para copiarlas en la app de Meta.
          </p>
        </section>

        <footer className="pt-6 border-t border-gray-200 text-sm text-gray-600">
          <p className="mb-2">
            Manual paso a paso ampliado:{" "}
            <Link href="/docs/manual-cliente" className="text-conversia-primary font-medium hover:underline">
              Manual del cliente
            </Link>
            . En el repositorio: <code className="bg-gray-100 px-1 rounded">docs/GUIA_META_WHATSAPP.md</code> y{" "}
            <code className="bg-gray-100 px-1 rounded">docs/WEBHOOK_META_CONFIG.md</code>.
          </p>
        </footer>
      </article>
    </div>
  );
}
