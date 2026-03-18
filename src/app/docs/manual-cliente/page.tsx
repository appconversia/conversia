"use client";

import { useCallback } from "react";

export default function ManualClientePage() {
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
            Manual del cliente — WhatsApiBot
          </h1>
          <p className="text-lg text-gray-600">
            Guía completa para conectar WhatsApp, entrenar el bot y desplegar cambios
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Todo lo que debes hacer tú después de recibir la app desplegada
          </p>
          <div className="mt-4 p-4 bg-[#25D366]/10 border border-[#25D366]/30 rounded-lg">
            <p className="text-gray-700">
              <strong>¿Es difícil?</strong> Tiene una curva de aprendizaje: los primeros pasos (conectar WhatsApp, configurar la IA) requieren seguir instrucciones con cuidado. No necesitas ser programador para la mayoría de tareas. Si ya usas Meta, Vercel o herramientas similares, te resultará más rápido. Si no, tómate tu tiempo, lee cada paso y verás que es totalmente alcanzable. Para cambios avanzados (editar código con Cursor) sí ayuda tener algo de experiencia técnica.
            </p>
          </div>
        </header>

        {/* LO QUE NO ESTÁ INCLUIDO */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-red-700 mb-4 pb-2 border-b-2 border-red-400 bg-red-50 -mx-2 px-2 py-1 rounded">
            1. LO QUE NO ESTÁ INCLUIDO (debes hacerlo tú)
          </h2>
          <div className="space-y-3 text-gray-700">
            <p className="font-semibold text-gray-900">Nada de lo siguiente está incluido en la entrega. Es tu responsabilidad:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Crear la app en Meta for Developers</strong> — La cuenta y la app son tuyas</li>
              <li><strong>Obtener y conectar las credenciales de WhatsApp</strong> — Access Token, Phone Number ID, Business Account ID</li>
              <li><strong>Configurar el webhook en Meta</strong> — URL y token de verificación</li>
              <li><strong>Pegar las credenciales en WhatsApiBot</strong> — En Configuración → WhatsApp</li>
              <li><strong>Activar la API de WhatsApp</strong> — Sin esto el bot no recibe ni envía mensajes</li>
              <li><strong>Obtener y configurar una API key de IA</strong> — OpenAI, Anthropic o Google (para que el bot responda con inteligencia artificial)</li>
              <li><strong>Añadir tus productos al catálogo</strong> — Nombre, descripción, fotos, videos, precios</li>
              <li><strong>Entrenar el bot</strong> — Prompt del sistema, tono, instrucciones para tu negocio</li>
              <li><strong>Personalizar los flujos del bot</strong> — Saludos, condiciones, handoff</li>
              <li><strong>Desplegar cambios cuando edites el código</strong> — Si usas Cursor para entrenar, debes desplegar a Vercel</li>
              <li><strong>Mantenimiento, soporte técnico o actualizaciones</strong> — No hay soporte posterior a la entrega</li>
            </ul>
          </div>
        </section>

        {/* LO QUE SÍ RECIBES */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-[#075E54] mb-4 pb-2 border-b-2 border-[#25D366]">
            2. Lo que sí recibes
          </h2>
          <ul className="list-disc pl-6 space-y-2 text-gray-700">
            <li><strong>URL de tu app</strong> — Es la dirección web donde está tu panel (ej. https://tu-app.vercel.app). La usarás para entrar y para configurar el webhook de Meta.</li>
            <li><strong>Credenciales de acceso</strong> — Usuario y contraseña para entrar al panel. Hay tres roles: Super Admin (acceso total), Admin (gestión) y Colaborador (solo conversaciones).</li>
            <li><strong>App desplegada</strong> — Tu WhatsApiBot ya está en internet, funcionando. Solo falta que tú conectes WhatsApp y configures el bot.</li>
            <li><strong>Base de datos</strong> — Donde se guardan conversaciones, productos, usuarios. Ya está creada y configurada en Neon (servicio en la nube).</li>
            <li><strong>Este manual</strong> y el documento de <strong>Prompts por industria</strong> — Para que copies prompts listos según tu negocio.</li>
          </ul>
        </section>

        {/* GLOSARIO */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-[#075E54] mb-4 pb-2 border-b-2 border-[#25D366]">
            Glosario (términos que verás)
          </h2>
          <dl className="space-y-3 text-gray-700">
            <dt className="font-semibold">Access Token</dt>
            <dd className="pl-4 text-sm">Clave que Meta te da para que tu app pueda enviar y recibir mensajes de WhatsApp. Es como una contraseña de acceso a la API.</dd>
            <dt className="font-semibold">Webhook</dt>
            <dd className="pl-4 text-sm">Es la URL a la que Meta envía los mensajes que recibe tu número de WhatsApp. Sin configurarla, tu app no recibe nada.</dd>
            <dt className="font-semibold">Token de verificación</dt>
            <dd className="pl-4 text-sm">Una cadena de texto que tú inventas. Meta la usa para comprobar que eres tú quien controla la URL del webhook. Debe ser la misma en Meta y en WhatsApiBot.</dd>
            <dt className="font-semibold">Phone Number ID</dt>
            <dd className="pl-4 text-sm">Identificador único que Meta asigna a tu número de WhatsApp Business. Lo encuentras en el panel de Meta.</dd>
            <dt className="font-semibold">API key</dt>
            <dd className="pl-4 text-sm">Clave para usar un servicio (OpenAI, Anthropic, Google). Sin ella, el bot no puede generar respuestas con IA.</dd>
            <dt className="font-semibold">Prompt del sistema</dt>
            <dd className="pl-4 text-sm">Las instrucciones que le das al bot: cómo debe hablar, qué debe hacer, qué productos tiene. Es el "entrenamiento" del bot.</dd>
          </dl>
        </section>

        {/* PRIMEROS PASOS */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-[#075E54] mb-4 pb-2 border-b-2 border-[#25D366]">
            3. Primeros pasos (inmediatamente)
          </h2>
          <ol className="list-decimal pl-6 space-y-3 text-gray-700">
            <li>Entra a tu app con las credenciales que te dieron (URL + usuario + contraseña). La URL es algo como https://tu-proyecto.vercel.app</li>
            <li>Ve a <strong>Configuración</strong> (menú lateral) → <strong>Usuarios</strong>. Ahí puedes cambiar la contraseña por defecto. Recomendado por seguridad.</li>
            <li>Guarda la URL de tu app en un lugar accesible. La necesitarás para el webhook de Meta (Paso 6). Ejemplo: si tu URL es https://mi-bot.vercel.app, la URL del webhook será https://mi-bot.vercel.app/api/webhook/whatsapp</li>
          </ol>
        </section>

        {/* CREAR APP EN META */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-[#075E54] mb-4 pb-2 border-b-2 border-[#25D366]">
            4. Crear tu app en Meta for Developers
          </h2>
          <p className="mb-3 text-gray-600 text-sm">
            Meta for Developers es la plataforma donde Facebook/Meta gestiona las apps que usan WhatsApp Business API. Necesitas crear una app para obtener las credenciales.
          </p>
          <ol className="list-decimal pl-6 space-y-3 text-gray-700">
            <li>Entra a <a href="https://developers.facebook.com" className="text-[#25D366] underline" target="_blank" rel="noopener noreferrer">developers.facebook.com</a></li>
            <li>Inicia sesión con tu cuenta de Facebook (o crea una si no tienes)</li>
            <li>En el menú superior, haz clic en <strong>Mis apps</strong> → <strong>Crear app</strong></li>
            <li>Te preguntará el tipo: elige <strong>Empresa</strong> (no "Consumidor"). Empresa es para negocios que usan WhatsApp Business.</li>
            <li>Nombre de la app: pon el nombre de tu negocio (ej. "Mi Negocio WhatsApp"). Es solo para identificarla en tu panel.</li>
            <li>Correo de contacto: tu email. Meta puede usarlo para avisos.</li>
            <li>Haz clic en <strong>Crea la app</strong></li>
            <li>En el panel de la app recién creada, busca el botón <strong>Agregar productos</strong> (o "Add products")</li>
            <li>En la lista de productos, busca <strong>WhatsApp</strong> y haz clic en <strong>Configurar</strong> (o "Set up")</li>
          </ol>
          <p className="mt-3 text-sm text-gray-600">Después de esto verás la sección de WhatsApp con opciones para números, mensajes y configuración.</p>
        </section>

        {/* OBTENER CREDENCIALES */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-[#075E54] mb-4 pb-2 border-b-2 border-[#25D366]">
            5. Obtener credenciales de WhatsApp
          </h2>
          <p className="mb-3 text-gray-700">En la sección WhatsApp de tu app de Meta necesitas tres datos. Búscalos en el menú lateral o en "API Setup":</p>
          <ol className="list-decimal pl-6 space-y-4 text-gray-700">
            <li>
              <strong>Access Token</strong> — Es la clave que autoriza a tu app a usar la API de WhatsApp.
              <p className="mt-1 text-sm">Al principio verás un token temporal (válido 24h). Para uso real, genera uno permanente: ve a "Configuración del sistema" o "System User" y crea un token con permisos de WhatsApp. Copia el token completo (es largo, empieza con "EAA...").</p>
            </li>
            <li>
              <strong>Phone Number ID</strong> — Identificador de tu número de WhatsApp Business.
              <p className="mt-1 text-sm">En "Números de teléfono" verás tu número (o debes añadir uno). Haz clic en él y busca "ID del número de teléfono" o "Phone number ID". Es un número largo. Cópialo.</p>
            </li>
            <li>
              <strong>Business Account ID (WABA ID)</strong> — ID de tu cuenta empresarial de WhatsApp.
              <p className="mt-1 text-sm">En "Configuración de la cuenta" o "WhatsApp Business Account" verás el ID. También es un número largo. Cópialo.</p>
            </li>
          </ol>
          <p className="mt-4 text-sm text-amber-700 bg-amber-50 p-3 rounded">
            <strong>Importante sobre el número:</strong> El número que uses NO puede estar en WhatsApp personal ni en la app gratuita WhatsApp Business. Debe ser un número nuevo o migrado. Meta puede pedir verificación del negocio (documentos, sitio web). Si ya tienes WhatsApp Business API con otro proveedor, el proceso puede variar.
          </p>
        </section>

        {/* CONFIGURAR WEBHOOK */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-[#075E54] mb-4 pb-2 border-b-2 border-[#25D366]">
            6. Configurar el webhook en Meta (crítico)
          </h2>
          <p className="mb-3 text-gray-700">
            El webhook es la "dirección" a la que Meta envía los mensajes que reciben en tu número de WhatsApp. Sin configurarlo, tu app no recibe nada aunque todo lo demás esté bien.
          </p>
          <p className="mb-3 text-gray-700">En tu app de Meta → WhatsApp → Configuración → Webhook (o "Configuración" en el menú lateral):</p>
          <table className="w-full border border-gray-300 text-sm mb-4">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 p-2 text-left">Campo</th>
                <th className="border border-gray-300 p-2 text-left">Valor</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 p-2 font-medium">URL de devolución de llamada</td>
                <td className="border border-gray-300 p-2"><code className="bg-gray-100 px-1 rounded">https://TU-URL/api/webhook/whatsapp</code><br />Reemplaza TU-URL por la URL de tu app (ej. https://mi-bot.vercel.app)</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-2 font-medium">Identificador de verificación</td>
                <td className="border border-gray-300 p-2">Una cadena secreta que TÚ defines (ej. <code className="bg-gray-100 px-1 rounded">MiTokenSecreto2026</code>). <strong>NO es una URL.</strong> Debe coincidir exactamente con lo que pongas en WhatsApiBot.</td>
              </tr>
            </tbody>
          </table>
          <p className="text-sm text-amber-700 bg-amber-50 p-3 rounded">
            <strong>Error común:</strong> Si Meta dice "No se ha podido validar la URL de devolución de llamada", casi siempre es porque el Identificador de verificación no coincide. Debe ser exactamente la misma cadena (mismo texto, mismo mayúsculas/minúsculas) en Meta y en WhatsApiBot (Configuración → Token de verificación de webhook). No copies la URL en ese campo: el identificador es un texto que tú inventas, como una contraseña.
          </p>
          <p className="mt-2 text-gray-700">Después de rellenar ambos campos, haz clic en <strong>Verificar y guardar</strong>. Si todo está bien, Meta mostrará que la verificación fue exitosa.</p>
        </section>

        {/* CONFIGURAR EN WHATSAPIBOT */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-[#075E54] mb-4 pb-2 border-b-2 border-[#25D366]">
            7. Configurar WhatsApp en WhatsApiBot
          </h2>
          <p className="mb-3 text-gray-700">
            Ahora debes pegar en tu panel de WhatsApiBot las credenciales que copiaste de Meta. Así tu app "conecta" con tu número de WhatsApp.
          </p>
          <ol className="list-decimal pl-6 space-y-3 text-gray-700">
            <li>Entra a tu app (la URL que te dieron) e inicia sesión</li>
            <li>En el menú lateral, haz clic en <strong>Configuración</strong></li>
            <li>Verás varias secciones. Busca la de <strong>WhatsApp</strong> (suele estar arriba)</li>
            <li>En los campos, pega: Access Token, Phone Number ID, Business Account ID (los que copiaste en el Paso 5)</li>
            <li>En "Token de verificación de webhook": escribe exactamente la misma cadena que pusiste en Meta en el Paso 6. Si en Meta pusiste "MiTokenSecreto2026", aquí también "MiTokenSecreto2026"</li>
            <li>Activa el interruptor <strong>WhatsApp habilitado</strong> (debe quedar en verde/azul)</li>
            <li>Haz clic en <strong>Guardar</strong></li>
          </ol>
          <p className="mt-3 text-gray-600">Si todo está bien, el webhook de Meta quedará verificado y empezarás a recibir mensajes cuando alguien te escriba a tu número de WhatsApp.</p>
        </section>

        {/* API DE IA */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-[#075E54] mb-4 pb-2 border-b-2 border-[#25D366]">
            8. Configurar la IA del bot (obligatorio para respuestas automáticas)
          </h2>
          <p className="mb-3 text-gray-700">
            El bot usa inteligencia artificial para entender mensajes y responder. Necesita una "API key" (clave de acceso) de un proveedor. Todos tienen planes de pago por uso; algunos ofrecen créditos gratis al registrarte.
          </p>
          <p className="mb-3 text-gray-700">Opciones (elige una):</p>
          <ul className="list-disc pl-6 mb-4 text-gray-700">
            <li><strong>OpenAI</strong> (GPT) — platform.openai.com → Inicia sesión → API keys → Create new secret key. Copia la clave (solo se muestra una vez).</li>
            <li><strong>Anthropic</strong> (Claude) — console.anthropic.com → API keys → Create key. Copia la clave.</li>
            <li><strong>Google</strong> (Gemini) — aistudio.google.com → Get API key. Sigue los pasos y copia la clave.</li>
          </ul>
          <p className="mb-3 text-gray-700">En WhatsApiBot → Configuración → sección Bot:</p>
          <ol className="list-decimal pl-6 space-y-2 text-gray-700">
            <li>Elige el proveedor (OpenAI, Anthropic o Google) en el desplegable</li>
            <li>Pega la API key en el campo correspondiente. No la compartas con nadie.</li>
            <li>Modelo sugerido (para equilibrar costo y calidad): gpt-4o-mini (OpenAI), claude-3-haiku (Anthropic), gemini-1.5-flash (Google)</li>
            <li>Activa el interruptor <strong>Bot habilitado</strong></li>
            <li>Haz clic en <strong>Guardar</strong></li>
          </ol>
          <p className="mt-3 text-sm text-gray-600">Sin la API key y sin activar el bot, el sistema no podrá generar respuestas automáticas. Los mensajes llegarán pero no habrá respuesta del bot.</p>
        </section>

        {/* PROMPT DEL SISTEMA */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-[#075E54] mb-4 pb-2 border-b-2 border-[#25D366]">
            9. Entrenar el bot: prompt del sistema
          </h2>
          <p className="mb-3 text-gray-700">
            El "prompt del sistema" son las instrucciones que le das al bot: cómo debe hablar, qué productos tiene, cuándo pasar a un asesor. Es como el "manual" que el bot lee antes de cada conversación.
          </p>
          <p className="mb-3 text-gray-700">
            <strong>Te entregamos un documento aparte con prompts listos por industria</strong> (retail, restaurantes, inmobiliaria, salud, automotriz, educación, viajes, etc.). Está en la misma carpeta que este manual: <strong>Prompts por industria</strong>. Abre ese PDF o la página en tu app (menú Documentación → Prompts por industria), elige el de tu sector, cópialo y pégalo en Configuración → Bot → Prompt del sistema. Reemplaza [NOMBRE TIENDA] por el nombre de tu negocio.
          </p>
          <p className="mb-3 text-gray-700">Ejemplo base si prefieres escribir el tuyo:</p>
          <pre className="p-4 bg-gray-100 rounded-lg text-sm overflow-x-auto whitespace-pre-wrap">
{`Eres el asesor virtual de [TU NEGOCIO]. Hablas cercano y natural.

- Responde SIEMPRE en español.
- Si piden productos: lista opciones y pregunta cuál les interesa.
- Cuando elijan uno: incluye PRODUCT_INTEREST: [nombre exacto del producto].
- Si quieren comprar o hablar con asesor: incluye HANDOFF_REQUIRED.
- Usa negrita con *texto* (un asterisco). No uses ** ni #.
- No digas que eres bot.`}
          </pre>
          <p className="mt-3 text-gray-700">Personaliza con el nombre de tu negocio, tus productos, tono y reglas. Los nombres de productos deben coincidir exactamente con los que añadiste en Productos.</p>
          <p className="mt-3 text-sm text-gray-600"><strong>Tags que el sistema reconoce (inclúyelos en el prompt donde corresponda):</strong> PRODUCT_INTEREST (para enviar fotos/videos), HANDOFF_REQUIRED (pasar a asesor humano), SEND_FULL_DESCRIPTION (ficha completa), INTEREST_LEVEL (alto/medio/bajo).</p>
        </section>

        {/* PRODUCTOS */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-[#075E54] mb-4 pb-2 border-b-2 border-[#25D366]">
            10. Añadir productos al catálogo
          </h2>
          <p className="mb-3 text-gray-700">
            El catálogo es la lista de productos o servicios que el bot puede mostrar. Cuando un cliente pide "el producto X", el bot busca ese nombre exacto en el catálogo y envía la foto y descripción.
          </p>
          <ol className="list-decimal pl-6 space-y-3 text-gray-700">
            <li>En el menú lateral, haz clic en <strong>Productos</strong></li>
            <li>Clic en el botón <strong>Nuevo producto</strong></li>
            <li>Completa los campos: nombre (importante: será el que el bot reconozca), descripción, precio, categoría (barriles u otros según tu negocio)</li>
            <li>Sube fotos y videos. El bot los enviará cuando el cliente pida ver ese producto.</li>
            <li>Haz clic en <strong>Guardar</strong></li>
          </ol>
          <p className="mt-3 text-gray-700">El bot usa los nombres exactos. Si tu producto se llama "Barril Aventurero 50L", el cliente debe decir algo que el bot relacione con ese nombre (o "el aventurero", "el primero", etc. si lo indicas en el prompt). Ajusta el prompt si quieres que reconozca alias o formas coloquiales.</p>
        </section>

        {/* ENTRENAR CON CURSOR */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-[#075E54] mb-4 pb-2 border-b-2 border-[#25D366]">
            11. Entrenar el bot con Cursor (avanzado)
          </h2>
          <p className="mb-3 text-gray-700">Si quieres modificar el código (prompts por defecto, flujos, lógica):</p>
          <ol className="list-decimal pl-6 space-y-3 text-gray-700">
            <li>Instala <strong>Cursor</strong> (cursor.com) si no lo tienes</li>
            <li>Clona el repositorio: <code className="bg-gray-100 px-1 rounded">git clone https://github.com/whatsapibot/whatsapibot.git</code></li>
            <li>Abre la carpeta en Cursor</li>
            <li>Archivos clave para entrenar:
              <ul className="list-disc pl-6 mt-2">
                <li><code className="bg-gray-100 px-1 rounded">src/lib/bot/default-system-prompt.ts</code> — Prompt por defecto</li>
                <li><code className="bg-gray-100 px-1 rounded">src/lib/bot/sub-brains/</code> — Lógica de respuestas, productos, handoff</li>
                <li>Configuración del bot también se guarda en la BD (Configuración en la app)</li>
              </ul>
            </li>
            <li>Después de editar, debes desplegar (Paso 12)</li>
          </ol>
        </section>

        {/* DESPLEGAR CAMBIOS */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-[#075E54] mb-4 pb-2 border-b-2 border-[#25D366]">
            12. Desplegar cambios a Vercel y Neon (solo si editaste código)
          </h2>
          <p className="mb-3 text-gray-700">
            Si solo cambias el prompt, los productos o la configuración desde el panel de WhatsApiBot, no necesitas desplegar nada: los cambios se guardan en la base de datos y ya están activos.
          </p>
          <p className="mb-3 text-gray-700">
            Solo necesitas desplegar si modificaste el código del proyecto (por ejemplo con Cursor). "Desplegar" significa subir la nueva versión a Vercel para que esté disponible en internet.
          </p>
          <ol className="list-decimal pl-6 space-y-3 text-gray-700">
            <li>Abre la terminal (o CMD en Windows) en la carpeta del proyecto</li>
            <li>Si no tienes Vercel CLI: <code className="bg-gray-100 px-1 rounded">npm i -g vercel</code> (instala Node.js antes si no lo tienes)</li>
            <li>Ejecuta: <code className="bg-gray-100 px-1 rounded">vercel --prod</code></li>
            <li>Si es la primera vez, te pedirá iniciar sesión en Vercel y vincular el proyecto</li>
            <li>Las variables de entorno (DATABASE_URL, etc.) ya deben estar en Vercel. Si añades nuevas, configúralas en el dashboard de Vercel → tu proyecto → Settings → Environment Variables</li>
          </ol>
          <p className="mt-3 text-gray-700">Si cambiaste el esquema de la base de datos (nuevas tablas o campos en Prisma):</p>
          <pre className="mt-2 p-4 bg-gray-100 rounded-lg text-sm overflow-x-auto">
{`npm run db:generate
npm run db:push
vercel --prod`}
          </pre>
          <p className="mt-3 text-sm text-gray-600">La base de datos está en Neon. La "connection string" (URL de conexión) está guardada en Vercel como DATABASE_URL. Para ejecutar migraciones desde tu computadora, crea un archivo .env en la carpeta del proyecto con esa misma URL.</p>
        </section>

        {/* FLUJOS */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-[#075E54] mb-4 pb-2 border-b-2 border-[#25D366]">
            13. Flujos del bot
          </h2>
          <p className="mb-3 text-gray-700">En <strong>Bot → Flujos</strong> puedes ver y editar los flujos (saludo inicial, condiciones, handoff). El flujo principal ya viene configurado. Puedes activar/desactivar flujos o crear nuevos desde la interfaz.</p>
        </section>

        {/* RESUMEN CHECKLIST */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-[#075E54] mb-4 pb-2 border-b-2 border-[#25D366]">
            14. Checklist: ¿Qué he hecho?
          </h2>
          <ul className="space-y-2 text-gray-700">
            {[
              "Cambié las contraseñas por defecto",
              "Creé mi app en Meta for Developers",
              "Añadí el producto WhatsApp",
              "Obtuve Access Token, Phone Number ID y Business Account ID",
              "Configuré el webhook en Meta (URL + token de verificación)",
              "Pegué las credenciales en WhatsApiBot → Configuración → WhatsApp",
              "Activé WhatsApp en WhatsApiBot",
              "Configuré una API key de IA (OpenAI/Anthropic/Google)",
              "Activé el bot en WhatsApiBot",
              "Añadí mis productos al catálogo",
              "Personalicé el prompt del sistema",
              "Probé enviando un mensaje a mi número de WhatsApp",
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-[#25D366] font-bold">☐</span>
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* PROBLEMAS COMUNES */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-[#075E54] mb-4 pb-2 border-b-2 border-[#25D366]">
            15. Problemas comunes
          </h2>
          <ul className="space-y-3 text-gray-700">
            <li><strong>Meta: "No se ha podido validar"</strong> — El token de verificación no coincide. Debe ser idéntico en Meta y en WhatsApiBot (Configuración → Token de verificación). No uses la URL en ese campo.</li>
            <li><strong>No llegan mensajes al bot</strong> — Revisa: webhook configurado, WhatsApp activado en Configuración, credenciales correctas (Phone Number ID, Access Token).</li>
            <li><strong>El bot no responde</strong> — Revisa: Bot habilitado en Configuración, API key de IA configurada y con créditos.</li>
            <li><strong>No envía fotos de productos</strong> — El prompt debe incluir PRODUCT_INTEREST: [nombre exacto]. El nombre debe coincidir con el catálogo.</li>
          </ul>
        </section>

        {/* SOPORTE */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-[#075E54] mb-4 pb-2 border-b-2 border-[#25D366]">
            16. Soporte y límites
          </h2>
          <p className="text-gray-700">
            La entrega incluye la app desplegada y este manual. No hay soporte técnico, mantenimiento ni actualizaciones posteriores. Los costos de Meta (conversaciones de WhatsApp), APIs de IA (OpenAI, etc.), Vercel y Neon son responsabilidad del cliente.
          </p>
        </section>

        <footer className="mt-12 pt-6 border-t border-gray-200 text-sm text-gray-500">
          <p>WhatsApiBot — Manual del cliente v1.0</p>
        </footer>
      </article>
    </div>
  );
}
