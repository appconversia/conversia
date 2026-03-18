"use client";

import { useCallback } from "react";

export default function ProcedimientoEntregaOscarPage() {
  const handleDownloadPDF = useCallback(() => {
    window.print();
  }, []);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Botón flotante: abre diálogo de impresión → elegir "Guardar como PDF" */}
      <div className="print:hidden fixed top-4 right-4 z-50">
        <button
          onClick={handleDownloadPDF}
          className="px-6 py-3 bg-[#25D366] hover:bg-[#20bd5a] text-white font-semibold rounded-lg shadow-lg transition"
        >
          Descargar PDF
        </button>
      </div>

      <article className="max-w-3xl mx-auto px-8 py-12 print:py-0 print:px-0" id="pdf-content">
        {/* Encabezado */}
        <header className="mb-12 print:mb-8">
          <h1 className="text-3xl font-bold text-[#075E54] mb-2">
            Procedimiento de entrega WhatsApiBot
          </h1>
          <p className="text-lg text-gray-600">
            Responsable: <strong>Oscar Cabrera</strong>
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Documento interno — Ejecutar cada vez que se cierre un cliente
          </p>
        </header>

        {/* Alcance */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-[#075E54] mb-4 pb-2 border-b-2 border-[#25D366]">
            1. Alcance exacto de Oscar
          </h2>
          <div className="space-y-3 text-gray-700">
            <p>
              <strong>Incluido en tu entrega:</strong>
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Desplegar WhatsApiBot en Vercel (hosting)</li>
              <li>Crear y configurar base de datos en Neon</li>
              <li>Ejecutar migraciones y seed inicial</li>
              <li>Configurar variables de entorno en producción</li>
              <li>Verificar que la app funcione (login, dashboard accesible)</li>
              <li>Entregar al cliente: URL de la app, credenciales de acceso, manual de entrenamiento</li>
            </ul>
            <p className="mt-4">
              <strong>NO incluido (lo hace el cliente):</strong>
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Crear la app en Meta for Developers</li>
              <li>Conectar la API de WhatsApp (Access Token, Phone Number ID, etc.)</li>
              <li>Configurar el webhook en Meta</li>
              <li>Entrenar el bot con sus productos, flujos y prompts</li>
              <li>Mantenimiento o soporte posterior a la entrega</li>
            </ul>
          </div>
        </section>

        {/* Paso a paso */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-[#075E54] mb-4 pb-2 border-b-2 border-[#25D366]">
            2. Procedimiento paso a paso
          </h2>

          <div className="space-y-8">
            {/* Paso 1 */}
            <div className="border-l-4 border-[#25D366] pl-6">
              <h3 className="font-bold text-lg text-[#075E54]">Paso 1: Cuentas del cliente</h3>
              <p className="mt-2 text-gray-700">
                Antes de empezar, el cliente debe tener (o crear durante la sesión):
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1 text-gray-700">
                <li>Cuenta en <strong>Vercel</strong> (vercel.com) — gratis</li>
                <li>Cuenta en <strong>Neon</strong> (neon.tech) — gratis</li>
                <li>Cuenta en <strong>GitHub</strong> (opcional, si prefieres clonar desde ahí)</li>
              </ul>
              <p className="mt-2 text-sm text-gray-600">
                Si el cliente no tiene cuentas, guíalo a crearlas. Puedes usar tu cuenta de Vercel/Neon para el despliegue y luego transferir el proyecto, o que el cliente cree las cuentas en vivo.
              </p>
            </div>

            {/* Paso 2 */}
            <div className="border-l-4 border-[#25D366] pl-6">
              <h3 className="font-bold text-lg text-[#075E54]">Paso 2: Crear base de datos en Neon</h3>
              <ol className="list-decimal pl-6 mt-2 space-y-2 text-gray-700">
                <li>Entra a <a href="https://console.neon.tech" className="text-[#25D366] underline" target="_blank" rel="noopener noreferrer">console.neon.tech</a></li>
                <li>Crea un nuevo proyecto (o usa uno existente del cliente)</li>
                <li>Nombre sugerido: <code className="bg-gray-100 px-1 rounded">whatsapibot-cliente</code></li>
                <li>Copia la <strong>connection string</strong> (formato: <code className="bg-gray-100 px-1 rounded text-sm">postgresql://user:pass@host/db?sslmode=require</code>)</li>
                <li>Guárdala para el Paso 5</li>
              </ol>
            </div>

            {/* Paso 3 */}
            <div className="border-l-4 border-[#25D366] pl-6">
              <h3 className="font-bold text-lg text-[#075E54]">Paso 3: Clonar el repositorio</h3>
              <p className="mt-2 text-gray-700">
                En tu máquina local (o la del cliente si conectas por AnyDesk):
              </p>
              <pre className="mt-2 p-4 bg-gray-100 rounded-lg text-sm overflow-x-auto">
{`git clone https://github.com/whatsapibot/whatsapibot.git
cd whatsapibot`}
              </pre>
            </div>

            {/* Paso 4 */}
            <div className="border-l-4 border-[#25D366] pl-6">
              <h3 className="font-bold text-lg text-[#075E54]">Paso 4: Instalar dependencias</h3>
              <pre className="mt-2 p-4 bg-gray-100 rounded-lg text-sm overflow-x-auto">
{`npm install`}
              </pre>
            </div>

            {/* Paso 5 */}
            <div className="border-l-4 border-[#25D366] pl-6">
              <h3 className="font-bold text-lg text-[#075E54]">Paso 5: Variables de entorno para producción</h3>
              <p className="mt-2 text-gray-700">
                Crea un archivo <code className="bg-gray-100 px-1 rounded">.env</code> local para probar, o configura directo en Vercel. Variables mínimas:
              </p>
              <pre className="mt-2 p-4 bg-gray-100 rounded-lg text-sm overflow-x-auto">
{`DATABASE_URL="postgresql://...?sslmode=require"
NEXT_PUBLIC_APP_URL="https://tu-app.vercel.app"`}
              </pre>
              <p className="mt-2 text-sm text-gray-600">
                <strong>DATABASE_URL:</strong> La connection string de Neon (Paso 2).<br />
                <strong>NEXT_PUBLIC_APP_URL:</strong> La URL que tendrá la app en Vercel (ej. https://whatsapibot-xyz.vercel.app). Puedes actualizarla después del primer deploy.
              </p>
            </div>

            {/* Paso 6 */}
            <div className="border-l-4 border-[#25D366] pl-6">
              <h3 className="font-bold text-lg text-[#075E54]">Paso 6: Migraciones y seed</h3>
              <pre className="mt-2 p-4 bg-gray-100 rounded-lg text-sm overflow-x-auto">
{`npm run db:generate
npm run db:push
npm run db:seed`}
              </pre>
              <p className="mt-2 text-sm text-gray-600">
                Esto crea las tablas y los usuarios de ejemplo. Contraseña por defecto: <strong>Inicio-00</strong>
              </p>
            </div>

            {/* Paso 7 */}
            <div className="border-l-4 border-[#25D366] pl-6">
              <h3 className="font-bold text-lg text-[#075E54]">Paso 7: Desplegar en Vercel</h3>
              <ol className="list-decimal pl-6 mt-2 space-y-2 text-gray-700">
                <li>Instala Vercel CLI si no la tienes: <code className="bg-gray-100 px-1 rounded">npm i -g vercel</code></li>
                <li>Desde la carpeta del proyecto: <code className="bg-gray-100 px-1 rounded">vercel</code></li>
                <li>Inicia sesión si te lo pide</li>
                <li>Vincula al proyecto del cliente (o crea uno nuevo)</li>
                <li>Configura las variables de entorno en Vercel:
                  <ul className="list-disc pl-6 mt-2">
                    <li>Dashboard Vercel → Proyecto → Settings → Environment Variables</li>
                    <li>Añade <code className="bg-gray-100 px-1 rounded">DATABASE_URL</code> y <code className="bg-gray-100 px-1 rounded">NEXT_PUBLIC_APP_URL</code></li>
                  </ul>
                </li>
                <li>Para producción: <code className="bg-gray-100 px-1 rounded">vercel --prod</code></li>
              </ol>
              <p className="mt-2 text-sm text-gray-600">
                Si el build falla por Prisma, el script <code className="bg-gray-100 px-1 rounded">build</code> ya incluye <code className="bg-gray-100 px-1 rounded">prisma generate</code> y <code className="bg-gray-100 px-1 rounded">prisma db push</code>. Asegúrate de que DATABASE_URL esté bien configurada.
              </p>
            </div>

            {/* Paso 8 */}
            <div className="border-l-4 border-[#25D366] pl-6">
              <h3 className="font-bold text-lg text-[#075E54]">Paso 8: Verificar que todo funcione</h3>
              <ul className="list-disc pl-6 mt-2 space-y-1 text-gray-700">
                <li>Abre la URL de la app (ej. https://whatsapibot-xyz.vercel.app)</li>
                <li>Debe redirigir al login</li>
                <li>Inicia sesión con: <strong>admin@whatsapibot.local</strong> / <strong>Inicio-00</strong></li>
                <li>Verifica que el dashboard cargue (Conversaciones, Productos, Configuración, etc.)</li>
              </ul>
            </div>

            {/* Paso 9 */}
            <div className="border-l-4 border-[#25D366] pl-6">
              <h3 className="font-bold text-lg text-[#075E54]">Paso 9: Entregar al cliente</h3>
              <p className="mt-2 text-gray-700">
                Entrega al cliente:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1 text-gray-700">
                <li><strong>URL de la app</strong> (ej. https://whatsapibot-cliente.vercel.app)</li>
                <li><strong>Credenciales de acceso:</strong>
                  <ul className="list-circle pl-6 mt-1 text-sm">
                    <li>Super Admin: superadmin@whatsapibot.local / Inicio-00</li>
                    <li>Admin: admin@whatsapibot.local / Inicio-00</li>
                    <li>Colaborador: ventas@whatsapibot.local / Inicio-00</li>
                  </ul>
                </li>
                <li><strong>Manual del cliente</strong> — PDF de /docs/manual-cliente (conexión WhatsApp, entrenamiento, despliegue)</li>
                <li><strong>Prompts por industria</strong> — PDF de /docs/prompts-industrias (formato completo para la app)</li>
                <li><strong>Órdenes para Cursor</strong> — PDF de /docs/ordenes-cursor-entrenamiento (entrenamiento profundo con ejemplos)</li>
                <li><strong>Recomendación:</strong> Que el cliente cambie las contraseñas desde Configuración → Usuarios</li>
              </ul>
            </div>

            {/* Paso 10 */}
            <div className="border-l-4 border-[#25D366] pl-6">
              <h3 className="font-bold text-lg text-[#075E54]">Paso 10: Recordatorio para el cliente</h3>
              <p className="mt-2 text-gray-700">
                Comunicar al cliente que él debe:
              </p>
              <ol className="list-decimal pl-6 mt-2 space-y-1 text-gray-700">
                <li>Crear su app en <a href="https://developers.facebook.com" className="text-[#25D366] underline" target="_blank" rel="noopener noreferrer">Meta for Developers</a></li>
                <li>Añadir el producto WhatsApp y obtener Access Token, Phone Number ID, Business Account ID</li>
                <li>Configurar el webhook en Meta: URL = <code className="bg-gray-100 px-1 rounded">https://SU-URL/api/webhook/whatsapp</code></li>
                <li>En WhatsApiBot → Configuración → WhatsApp: pegar las credenciales y activar</li>
                <li>Entrenar el bot según el manual (prompts, productos, flujos)</li>
              </ol>
            </div>
          </div>
        </section>

        {/* Checklist */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-[#075E54] mb-4 pb-2 border-b-2 border-[#25D366]">
            3. Checklist de entrega
          </h2>
          <ul className="space-y-2 text-gray-700">
            {[
              "Base de datos Neon creada y migrada",
              "App desplegada en Vercel y accesible",
              "Login funcionando con credenciales por defecto",
              "Dashboard carga correctamente",
              "Cliente tiene URL, credenciales y manual",
              "Cliente sabe que debe conectar WhatsApp y entrenar el bot",
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-[#25D366] font-bold">☐</span>
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* Contacto / soporte */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-[#075E54] mb-4 pb-2 border-b-2 border-[#25D366]">
            4. Notas adicionales
          </h2>
          <ul className="list-disc pl-6 space-y-2 text-gray-700">
            <li>Si el cliente quiere dominio propio (ej. chat.suempresa.com), configúralo en Vercel → Settings → Domains y actualiza NEXT_PUBLIC_APP_URL.</li>
            <li>Pusher, Vercel Blob y META_APP_ID son opcionales. La app funciona sin ellos para uso básico.</li>
            <li>El manual del cliente debe incluir: entrenar con Cursor, desplegar cambios con <code className="bg-gray-100 px-1 rounded">vercel --prod</code>, y pasos para conectar WhatsApp.</li>
          </ul>
        </section>

        <footer className="mt-12 pt-6 border-t border-gray-200 text-sm text-gray-500">
          <p>WhatsApiBot — Procedimiento de entrega v1.0 — Oscar Cabrera</p>
        </footer>
      </article>
    </div>
  );
}
