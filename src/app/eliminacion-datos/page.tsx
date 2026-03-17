import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Eliminación de Datos de Usuario | WhatsApiBot",
  description: "Instrucciones para solicitar la eliminación de tus datos personales en WhatsApiBot.",
};

export default function EliminacionDatosPage() {
  return (
    <div className="min-h-screen bg-[#ECE5DD] text-[#111B21]">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="mb-8 text-3xl font-bold text-[#111B21]">
          Instrucciones para la Eliminación de Datos de Usuario
        </h1>
        <p className="mb-6 text-sm text-[#667781]">
          Última actualización: {new Date().toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" })}
        </p>

        <div className="space-y-8 text-[#111B21]">
          <section>
            <h2 className="mb-3 text-xl font-semibold">1. Derecho a la eliminación</h2>
            <p className="leading-relaxed">
              De acuerdo con el RGPD, CCPA y otras normativas de protección de datos, tienes
              derecho a solicitar la eliminación de tus datos personales recopilados
              a través del servicio de WhatsApp Business (WhatsApiBot).
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">2. Datos que podemos eliminar</h2>
            <p className="mb-4 leading-relaxed">
              A solicitud tuya, podemos eliminar:
            </p>
            <ul className="ml-6 list-disc space-y-2">
              <li>Tu número de teléfono (identificador de WhatsApp)</li>
              <li>Tu nombre de perfil asociado</li>
              <li>El historial de mensajes de las conversaciones mantenidas</li>
              <li>Cualquier otro dato personal que hayamos almacenado derivado de la interacción</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">3. Cómo solicitar la eliminación</h2>
            <p className="mb-4 leading-relaxed">
              Para solicitar la eliminación de tus datos:
            </p>
            <ol className="ml-6 list-decimal space-y-3">
              <li>
                Envía un correo electrónico a{" "}
                <a href="mailto:contacto@tudominio.com" className="text-[#25D366] underline hover:text-[#20bd5a]">
                  contacto@tudominio.com
                </a>
                {" "}con el asunto: &quot;Solicitud de eliminación de datos - WhatsApiBot&quot;.
              </li>
              <li>
                Indica en el mensaje el número de teléfono de WhatsApp con el que te comunicaste
                con nosotros (incluyendo código de país).
              </li>
              <li>
                Opcionalmente, adjunta una captura o descripción que acredite que eres el titular
                de ese número, para evitar eliminaciones no autorizadas.
              </li>
            </ol>
            <p className="mt-4 leading-relaxed">
              Responderemos en un plazo máximo de 30 días hábiles. Si la solicitud es procedente,
              procederemos a eliminar tus datos de nuestros sistemas en ese plazo.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">4. Lo que ocurre tras la eliminación</h2>
            <p className="leading-relaxed">
              Una vez eliminados, tus datos no podrán ser recuperados. Las conversaciones futuras
              que inicies por WhatsApp generarán nuevos registros. Si deseas mantener el anonimato
              tras la eliminación, considera no volver a contactarnos desde el mismo número.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">5. Excepciones</h2>
            <p className="leading-relaxed">
              Podemos conservar ciertos datos cuando sea necesario para: (a) cumplir obligaciones
              legales; (b) ejercer o defender reclamaciones; (c) fines de facturación o contables
              exigidos por la ley. En ese caso, te informaremos de las razones y del plazo de
              conservación.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">6. Datos en sistemas de Meta</h2>
            <p className="leading-relaxed">
              Los mensajes y metadatos que pasan por la API de WhatsApp permanecen sometidos a las
              políticas de Meta/WhatsApp. Para solicitar la eliminación de datos en los sistemas
              de Meta, debes seguir los procedimientos indicados en las políticas de privacidad
              de WhatsApp y en el Centro de privacidad de Meta.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">7. Más información</h2>
            <p className="leading-relaxed">
              Consulta nuestra{" "}
              <a href="/privacidad" className="text-[#25D366] underline hover:text-[#20bd5a]">
                Política de Privacidad
              </a>
              {" "}para conocer todos tus derechos y cómo tratamos tus datos.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">8. Contacto</h2>
            <p className="leading-relaxed">
              Correo electrónico:{" "}
              <a href="mailto:contacto@tudominio.com" className="text-[#25D366] underline hover:text-[#20bd5a]">
                contacto@tudominio.com
              </a>
            </p>
          </section>
        </div>

        <p className="mt-12 text-sm text-[#667781]">
          Estas instrucciones cumplen con los requisitos de Meta para aplicaciones que utilizan
          WhatsApp Business API, incluyendo la obligación de proporcionar un enlace claro para
          la eliminación de datos de usuario en el proceso de revisión y publicación de la app.
        </p>
      </div>
    </div>
  );
}
