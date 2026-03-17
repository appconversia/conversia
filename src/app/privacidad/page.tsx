import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidad | WhatsApiBot",
  description: "Política de privacidad de la aplicación WhatsApiBot para WhatsApp Business.",
};

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-[#ECE5DD] text-[#111B21]">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="mb-8 text-3xl font-bold text-[#111B21]">
          Política de Privacidad
        </h1>
        <p className="mb-6 text-sm text-[#667781]">
          Última actualización: {new Date().toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" })}
        </p>

        <div className="space-y-8 text-[#111B21]">
          <section>
            <h2 className="mb-3 text-xl font-semibold">1. Responsable del tratamiento</h2>
            <p className="leading-relaxed">
              El responsable (&quot;nosotros&quot;, &quot;nuestra&quot; o &quot;el negocio&quot;) opera la aplicación WhatsApiBot,
              que utiliza la API de WhatsApp Business de Meta para proporcionar atención al cliente y
              comunicación comercial. Esta política describe cómo tratamos la información personal
              en el contexto de nuestra integración con WhatsApp Business.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">2. Información que recopilamos</h2>
            <p className="mb-4 leading-relaxed">
              Cuando interactúas con nosotros a través de WhatsApp utilizando nuestro bot o servicio
              de atención al cliente, podemos recopilar:
            </p>
            <ul className="ml-6 list-disc space-y-2">
              <li>
                <strong>Número de teléfono:</strong> Identificador de WhatsApp proporcionado por Meta.
              </li>
              <li>
                <strong>Nombre de perfil:</strong> Nombre que aparece en tu perfil de WhatsApp.
              </li>
              <li>
                <strong>Mensajes:</strong> Contenido de los mensajes que envías (texto, imágenes,
                audio, video, documentos) para atender tus consultas.
              </li>
              <li>
                <strong>Metadatos de conversación:</strong> Historial de conversaciones, asignaciones
                a agentes y estado de las mismas.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">3. Finalidad del tratamiento</h2>
            <p className="leading-relaxed">
              Utilizamos la información recopilada para: (a) prestar atención al cliente y responder
              consultas comerciales; (b) gestionar el flujo de ventas y seguimiento de clientes;
              (c) mejorar la calidad de nuestro servicio; (d) cumplir con obligaciones legales y
              resolver disputas.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">4. Base legal</h2>
            <p className="leading-relaxed">
              El tratamiento se basa en: (a) tu consentimiento al iniciar una conversación por
              WhatsApp; (b) la ejecución del contrato o medidas precontractuales; (c) el interés
              legítimo en mejorar nuestros servicios comerciales.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">5. Conservación de datos</h2>
            <p className="leading-relaxed">
              Conservamos los datos mientras sea necesario para las finalidades indicadas y según
              las obligaciones legales aplicables. Puedes solicitar la eliminación de tus datos en
              cualquier momento siguiendo las instrucciones en nuestra página de{" "}
              <a href="/eliminacion-datos" className="text-[#25D366] underline hover:text-[#20bd5a]">
                Eliminación de datos
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">6. Derechos del interesado</h2>
            <p className="mb-4 leading-relaxed">
              De acuerdo con el RGPD y normativas aplicables, tienes derecho a:
            </p>
            <ul className="ml-6 list-disc space-y-2">
              <li>Acceso a tus datos personales</li>
              <li>Rectificación de datos inexactos o incompletos</li>
              <li>Supresión (&quot;derecho al olvido&quot;)</li>
              <li>Limitación del tratamiento</li>
              <li>Portabilidad de datos</li>
              <li>Oposición al tratamiento</li>
              <li>Retirar el consentimiento en cualquier momento</li>
            </ul>
            <p className="mt-4 leading-relaxed">
              Para ejercer estos derechos, contacta a{" "}
              <a href="mailto:contacto@tudominio.com" className="text-[#25D366] underline hover:text-[#20bd5a]">
                contacto@tudominio.com
              </a>
              . También puedes presentar una reclamación ante la autoridad de protección de datos
              competente.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">7. Compartir datos</h2>
            <p className="leading-relaxed">
              Los datos se procesan a través de la infraestructura de Meta (WhatsApp Business API)
              conforme a sus términos y políticas. No vendemos ni cedemos tus datos a terceros
              con fines comerciales no relacionados con la prestación del servicio.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">8. Seguridad</h2>
            <p className="leading-relaxed">
              Aplicamos medidas técnicas y organizativas para proteger tus datos contra el acceso
              no autorizado, la pérdida o la alteración, en línea con las buenas prácticas de la
              industria.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">9. Contacto</h2>
            <p className="leading-relaxed">
              Para cualquier consulta sobre esta política:{" "}
              <a href="mailto:contacto@tudominio.com" className="text-[#25D366] underline hover:text-[#20bd5a]">
                contacto@tudominio.com
              </a>
            </p>
          </section>
        </div>

        <p className="mt-12 text-sm text-[#667781]">
          Esta política cumple con los requisitos de la política de privacidad de WhatsApp Business
          y las políticas de Meta para aplicaciones desarrolladoras.
        </p>
      </div>
    </div>
  );
}
