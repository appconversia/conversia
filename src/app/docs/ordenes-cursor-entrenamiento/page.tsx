"use client";

import { useCallback } from "react";

export default function OrdenesCursorEntrenamientoPage() {
  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="print:hidden fixed top-4 right-4 z-50">
        <button
          onClick={handlePrint}
          className="px-6 py-3 bg-[#25D366] hover:bg-[#20bd5a] text-white font-semibold rounded-lg shadow-lg transition"
        >
          Descargar PDF
        </button>
      </div>

      <article className="max-w-3xl mx-auto px-8 py-12 print:py-0 print:px-0">
        <header className="mb-12 print:mb-8">
          <h1 className="text-3xl font-bold text-[#075E54] mb-2">
            Órdenes para entrenar con Cursor
          </h1>
          <p className="text-lg text-gray-600">
            Instrucciones para entrenar el bot a nivel profundo (código, lógica, flujos)
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Para clientes que quieren personalizar más allá del prompt del sistema
          </p>
        </header>

        <section className="mb-10">
          <h2 className="text-xl font-bold text-[#075E54] mb-4 pb-2 border-b-2 border-[#25D366]">
            1. Qué es Cursor y cuándo usarlo
          </h2>
          <p className="text-gray-700 mb-3">
            Cursor es un editor de código con IA. Lo usas cuando quieres cambiar el comportamiento del bot a nivel de código: prompts por defecto, lógica de respuestas, mapeo de productos, mensajes del scope guard, etc. No es obligatorio: la mayoría de personalización se hace desde el panel (prompt, productos, flujos).
          </p>
          <p className="text-gray-700">
            Después de editar en Cursor debes desplegar con <code className="bg-gray-100 px-1 rounded">vercel --prod</code> para que los cambios estén en producción.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-bold text-[#075E54] mb-4 pb-2 border-b-2 border-[#25D366]">
            2. Archivos clave para entrenar
          </h2>
          <table className="w-full border border-gray-300 text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 p-2 text-left">Archivo</th>
                <th className="border border-gray-300 p-2 text-left">Qué hace</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 p-2 font-mono text-xs">src/lib/bot/default-system-prompt.ts</td>
                <td className="border border-gray-300 p-2">Prompt por defecto cuando no hay uno en la BD. Edita aquí si quieres que el prompt base sea otro para todos los clientes.</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-2 font-mono text-xs">src/lib/bot/sub-brains/sales-flow-brain.ts</td>
                <td className="border border-gray-300 p-2">Lógica principal: cómo procesa mensajes, mapea productos, decide handoff. Correcciones de nombres de productos (PRODUCT_NAME_CORRECTIONS).</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-2 font-mono text-xs">src/lib/bot/sub-brains/scope-guard-brain.ts</td>
                <td className="border border-gray-300 p-2">Mensaje cuando el usuario dice algo fuera de alcance o incomprensible. Lista de productos que se muestra. Edita SCOPE_MESSAGE.</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-2 font-mono text-xs">src/lib/bot/sub-brains/sin-asignar-response.ts</td>
                <td className="border border-gray-300 p-2">Respuesta cuando el cliente está en cola (handoff) pero no hay asesor asignado. Tono y mensaje.</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-2 font-mono text-xs">src/lib/bot/sub-brains/product-response-brain.ts</td>
                <td className="border border-gray-300 p-2">Cómo se construyen las descripciones de productos, límite de caracteres para WhatsApp (WHATSAPP_CAPTION_MAX).</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-2 font-mono text-xs">src/lib/bot/sub-brains/handoff-brain.ts</td>
                <td className="border border-gray-300 p-2">Qué mensaje se envía al cliente cuando se hace handoff. Lógica de "un asesor te contactará".</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-2 font-mono text-xs">src/lib/bot/greeting-classifier.ts</td>
                <td className="border border-gray-300 p-2">Detecta si el mensaje es un saludo (hola, buenos días). Puedes añadir más variantes.</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-bold text-[#075E54] mb-4 pb-2 border-b-2 border-[#25D366]">
            3. Órdenes para Cursor (copia y pega en el chat)
          </h2>
          <p className="text-gray-700 mb-4">
            Abre Cursor, abre el proyecto WhatsApiBot, y usa el chat (Cmd+L o Ctrl+L). Pega una de estas órdenes y adapta según tu necesidad.
          </p>

          <div className="space-y-6">
            <div className="border-l-4 border-[#25D366] pl-4">
              <h3 className="font-bold text-[#075E54]">Orden 1: Cambiar el mensaje cuando el usuario dice algo fuera de tema</h3>
              <pre className="mt-2 p-4 bg-gray-100 rounded text-sm overflow-x-auto whitespace-pre-wrap">
{`Modifica el mensaje que aparece cuando el usuario escribe algo fuera de alcance o incomprensible. 
Archivo: src/lib/bot/sub-brains/scope-guard-brain.ts
Quiero que el mensaje SCOPE_MESSAGE diga: "[TU MENSAJE PERSONALIZADO]" 
y que la lista de productos se muestre después. Mantén la estructura del código.`}
              </pre>
              <p className="mt-2 text-sm text-gray-600">Ejemplo: "Estamos aquí para ayudarte con [TU NEGOCIO]. ¿En qué podemos asistirte hoy?"</p>
            </div>

            <div className="border-l-4 border-[#25D366] pl-4">
              <h3 className="font-bold text-[#075E54]">Orden 2: Añadir correcciones de nombres de productos</h3>
              <pre className="mt-2 p-4 bg-gray-100 rounded text-sm overflow-x-auto whitespace-pre-wrap">
{`En src/lib/bot/sub-brains/sales-flow-brain.ts hay un array PRODUCT_NAME_CORRECTIONS que mapea nombres que la IA inventa a nombres exactos del catálogo.
Añade una corrección: cuando el usuario o la IA diga "[nombre incorrecto]" debe mapear a "[nombre exacto del producto en el catálogo]".
Sigue el formato existente: [regex o string, string de reemplazo]`}
              </pre>
              <p className="mt-2 text-sm text-gray-600">Ejemplo: si el cliente dice "la gorra" y tu producto se llama "Gorras Yeison Jimenez", añade ese mapeo.</p>
            </div>

            <div className="border-l-4 border-[#25D366] pl-4">
              <h3 className="font-bold text-[#075E54]">Orden 3: Cambiar el mensaje cuando no hay asesor asignado</h3>
              <pre className="mt-2 p-4 bg-gray-100 rounded text-sm overflow-x-auto whitespace-pre-wrap">
{`Modifica la respuesta que recibe el cliente cuando pidió hablar con un asesor pero aún no hay nadie asignado.
Archivo: src/lib/bot/sub-brains/sin-asignar-response.ts
Quiero que el mensaje sea más [amigable/formal/breve] y que diga algo como: "[TU MENSAJE]"
Mantén la lógica de que usa IA para generar la respuesta, solo cambia el prompt o las instrucciones que se le pasan.`}
              </pre>
            </div>

            <div className="border-l-4 border-[#25D366] pl-4">
              <h3 className="font-bold text-[#075E54]">Orden 4: Añadir palabras que el bot reconozca como saludo</h3>
              <pre className="mt-2 p-4 bg-gray-100 rounded text-sm overflow-x-auto whitespace-pre-wrap">
{`En src/lib/bot/greeting-classifier.ts la función classifyIsGreeting detecta saludos.
Añade estas palabras/variantes como saludos: [lista de palabras, ej: "hey", "qué tal", "buenas"]
Mantén la estructura existente.`}
              </pre>
            </div>

            <div className="border-l-4 border-[#25D366] pl-4">
              <h3 className="font-bold text-[#075E54]">Orden 5: Cambiar el límite de caracteres en descripciones de productos</h3>
              <pre className="mt-2 p-4 bg-gray-100 rounded text-sm overflow-x-auto whitespace-pre-wrap">
{`En src/lib/bot/sub-brains/product-response-brain.ts hay una constante WHATSAPP_CAPTION_MAX (1024 por defecto).
Cámbiala a [número] porque mis descripciones de productos son más largas/cortas.
WhatsApp tiene un límite de 1024 para captions. No pongas más de eso.`}
              </pre>
            </div>

            <div className="border-l-4 border-[#25D366] pl-4">
              <h3 className="font-bold text-[#075E54]">Orden 6: Personalizar el prompt por defecto para mi industria</h3>
              <pre className="mt-2 p-4 bg-gray-100 rounded text-sm overflow-x-auto whitespace-pre-wrap">
{`En src/lib/bot/default-system-prompt.ts está el prompt por defecto.
Quiero que incluya instrucciones específicas para [mi industria: ej. restaurante]:
- [regla 1, ej: cuando pregunten por el menú, listar por categorías]
- [regla 2, ej: para pedidos siempre HANDOFF_REQUIRED]
- [regla 3]
Mantén todas las secciones existentes (Tags, Handoff, CTA, Formato WhatsApp) y añade una sección "## Específico [industria]" con estas reglas.`}
              </pre>
            </div>

            <div className="border-l-4 border-[#25D366] pl-4">
              <h3 className="font-bold text-[#075E54]">Orden 7: Añadir mapeo "el X" a producto por tamaño/nombre</h3>
              <pre className="mt-2 p-4 bg-gray-100 rounded text-sm overflow-x-auto whitespace-pre-wrap">
{`En sales-flow-brain.ts hay lógica para mapear "el mediano", "el grande", "el primero" a productos.
Mis productos tienen tamaños/nombres: [lista]. 
Añade o modifica la lógica para que cuando el usuario diga "el [tamaño]" o "el [alias]" se mapee correctamente al producto "[nombre exacto]".
Revisa las funciones normalizeForMatch, findSingleProductMatch, resolveByNameReference.`}
              </pre>
            </div>

            <div className="border-l-4 border-[#25D366] pl-4">
              <h3 className="font-bold text-[#075E54]">Orden 8: Cambiar el mensaje de handoff</h3>
              <pre className="mt-2 p-4 bg-gray-100 rounded text-sm overflow-x-auto whitespace-pre-wrap">
{`Cuando el bot hace handoff (pasa al cliente a un asesor), se envía un mensaje.
Archivo: src/lib/bot/sub-brains/handoff-brain.ts
Quiero que el mensaje diga: "[TU MENSAJE, ej: Un asesor de [NOMBRE] te contactará en breve. Gracias por tu paciencia.]"
Mantén la lógica, solo cambia el texto.`}
              </pre>
            </div>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-bold text-[#075E54] mb-4 pb-2 border-b-2 border-[#25D366]">
            4. Ejemplos completos de órdenes
          </h2>

          <div className="space-y-6">
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h4 className="font-semibold text-gray-800 mb-2">Ejemplo A: Restaurante — mensaje fuera de tema</h4>
              <p className="text-sm text-gray-600 mb-2">Objetivo: Cuando el cliente escribe algo que no tiene que ver con el restaurante, mostrar un mensaje amable y el menú.</p>
              <pre className="p-3 bg-white rounded text-xs overflow-x-auto whitespace-pre-wrap border">
{`Modifica src/lib/bot/sub-brains/scope-guard-brain.ts.
El SCOPE_MESSAGE actual habla de barriles. Cámbialo para un restaurante:
"¡Hola! En [NOMBRE RESTAURANTE] estamos para ayudarte con nuestro menú, horarios y pedidos 🍽️
Pero no podemos ayudarte con eso que mencionaste. Aquí está nuestro menú:"
Reemplaza [NOMBRE RESTAURANTE] por "La Fogata" (o haz que sea configurable).
Ajusta también la lista de productos para que diga "platos" o "opciones" en vez de "barriles" si hace falta.`}
              </pre>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h4 className="font-semibold text-gray-800 mb-2">Ejemplo B: Tienda — corrección de nombres</h4>
              <p className="text-sm text-gray-600 mb-2">Objetivo: Cuando el cliente dice "la camiseta negra" y el producto se llama "Camiseta Básica Negra M", que el bot lo reconozca.</p>
              <pre className="p-3 bg-white rounded text-xs overflow-x-auto whitespace-pre-wrap border">
{`En src/lib/bot/sub-brains/sales-flow-brain.ts, en PRODUCT_NAME_CORRECTIONS, añade:
[/camiseta\s+negra|la\s+negra/gi, "Camiseta Básica Negra M"]
Así cuando el usuario o la IA diga "camiseta negra" o "la negra" se mapeará al producto correcto.
Verifica que "Camiseta Básica Negra M" exista exactamente así en el catálogo.`}
              </pre>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h4 className="font-semibold text-gray-800 mb-2">Ejemplo C: Inmobiliaria — mensaje sin asesor</h4>
              <p className="text-sm text-gray-600 mb-2">Objetivo: Cuando el cliente pide visita pero no hay asesor, que el mensaje sea más profesional.</p>
              <pre className="p-3 bg-white rounded text-xs overflow-x-auto whitespace-pre-wrap border">
{`En src/lib/bot/sub-brains/sin-asignar-response.ts, el sistema usa IA para generar la respuesta.
Busca el prompt o las instrucciones que se pasan a la IA cuando no hay asesor asignado.
Modifícalas para que el tono sea más formal y que incluya algo como:
"Un asesor de [Inmobiliaria] se comunicará contigo pronto para agendar tu visita. Gracias por tu interés."
Asegúrate de que la IA siga usando el contexto de la conversación pero con ese estilo.`}
              </pre>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h4 className="font-semibold text-gray-800 mb-2">Ejemplo D: Añadir "qué onda" como saludo</h4>
              <p className="text-sm text-gray-600 mb-2">Objetivo: Que "qué onda", "q tal", "holis" se reconozcan como saludos.</p>
              <pre className="p-3 bg-white rounded text-xs overflow-x-auto whitespace-pre-wrap border">
{`En src/lib/bot/greeting-classifier.ts, la función classifyIsGreeting usa una lista o regex para detectar saludos.
Añade estas variantes: "qué onda", "q tal", "holis", "buenas", "saludos"
Revisa cómo está implementado y extiende la lógica para incluir estas formas coloquiales.`}
              </pre>
            </div>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-bold text-[#075E54] mb-4 pb-2 border-b-2 border-[#25D366]">
            5. Después de editar: desplegar
          </h2>
          <p className="text-gray-700 mb-3">
            Los cambios en el código solo se aplican cuando despliegas a Vercel. Desde la carpeta del proyecto:
          </p>
          <pre className="p-4 bg-gray-100 rounded text-sm">
{`vercel --prod`}
          </pre>
          <p className="mt-3 text-gray-700">
            Si cambiaste algo en la base de datos (Prisma schema), ejecuta antes: <code className="bg-gray-100 px-1 rounded">npm run db:generate && npm run db:push</code>
          </p>
        </section>

        <footer className="mt-12 pt-6 border-t border-gray-200 text-sm text-gray-500">
          <p>WhatsApiBot — Órdenes para Cursor v1.0 — Entregar junto al manual del cliente</p>
        </footer>
      </article>
    </div>
  );
}
