import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Términos del Servicio | WhatsApiBot",
  description: "Términos y condiciones del servicio WhatsApiBot para WhatsApp Business.",
};

export default function TerminosPage() {
  return (
    <div className="min-h-screen bg-[#ECE5DD] text-[#111B21]">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="mb-8 text-3xl font-bold text-[#111B21]">
          Términos del Servicio
        </h1>
        <p className="mb-6 text-sm text-[#667781]">
          Última actualización: {new Date().toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" })}
        </p>

        <div className="space-y-8 text-[#111B21]">
          <section>
            <h2 className="mb-3 text-xl font-semibold">1. Aceptación de los términos</h2>
            <p className="leading-relaxed">
              Al utilizar el servicio de atención al cliente y mensajería a través
              de WhatsApp (&quot;el Servicio&quot;), aceptas estos Términos del Servicio. Si no estás de
              acuerdo, no debes utilizar el Servicio.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">2. Descripción del servicio</h2>
            <p className="leading-relaxed">
              Este servicio ofrece un canal de comunicación comercial por WhatsApp que incluye:
              atención al cliente automatizada (bot) y asistencia de asesores, consultas sobre productos,
              pedidos y soporte postventa. El Servicio utiliza la API de WhatsApp Business de Meta
              y cumple con las políticas de WhatsApp Business Messaging.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">3. Uso aceptable</h2>
            <p className="mb-4 leading-relaxed">
              Te comprometes a:
            </p>
            <ul className="ml-6 list-disc space-y-2">
              <li>Utilizar el Servicio de forma lícita y respetuosa</li>
              <li>No enviar contenido ilegal, ofensivo, spam o malicioso</li>
              <li>No intentar acceder a sistemas o datos de forma no autorizada</li>
              <li>Respetar los Términos de Servicio de WhatsApp y las políticas de Meta</li>
            </ul>
            <p className="mt-4 leading-relaxed">
              Nos reservamos el derecho de suspender o terminar el acceso a usuarios que incumplan
              estos términos.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">4. Privacidad y datos</h2>
            <p className="leading-relaxed">
              El tratamiento de tus datos personales se rige por nuestra{" "}
              <a href="/privacidad" className="text-[#25D366] underline hover:text-[#20bd5a]">
                Política de Privacidad
              </a>
              . Al usar el Servicio, también aceptas dicha política.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">5. Disponibilidad</h2>
            <p className="leading-relaxed">
              Nos esforzamos por mantener el Servicio disponible, pero no garantizamos su
              disponibilidad ininterrumpida. Puede verse afectado por mantenimiento, fallos
              técnicos o causas fuera de nuestro control.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">6. Limitación de responsabilidad</h2>
            <p className="leading-relaxed">
              El Servicio se presta &quot;tal cual&quot;. En la medida permitida por la ley, el responsable
              no será responsable de daños indirectos, incidentales o consecuentes derivados del
              uso o la imposibilidad de uso del Servicio.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">7. Modificaciones</h2>
            <p className="leading-relaxed">
              Podemos modificar estos términos en cualquier momento. La versión actualizada se
              publicará en esta página con la fecha de última actualización. El uso continuado
              del Servicio tras los cambios constituye la aceptación de los nuevos términos.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">8. Ley aplicable</h2>
            <p className="leading-relaxed">
              Estos términos se rigen por la legislación aplicable en el lugar de operación del
              negocio. Para cualquier disputa, los tribunales competentes serán los del domicilio
              del responsable.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">9. Contacto</h2>
            <p className="leading-relaxed">
              Para consultas sobre estos términos:{" "}
              <a href="mailto:contacto@tudominio.com" className="text-[#25D366] underline hover:text-[#20bd5a]">
                contacto@tudominio.com
              </a>
            </p>
          </section>
        </div>

        <p className="mt-12 text-sm text-[#667781]">
          Estos términos cumplen con los requisitos de Meta para aplicaciones que integran WhatsApp
          Business API y están alineados con las políticas de la plataforma.
        </p>
      </div>
    </div>
  );
}
