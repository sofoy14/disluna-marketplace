import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidad | DISLUNA",
  description: "Política de privacidad y protección de datos de DISLUNA",
};

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-white pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">
          Política de Privacidad
        </h1>
        
        <div className="prose prose-lg max-w-none text-gray-600 space-y-6">
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Información que Recopilamos</h2>
            <p>
              En DISLUNA recopilamos la siguiente información cuando realiza un pedido:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Nombre completo</li>
              <li>Dirección de entrega</li>
              <li>Número de teléfono</li>
              <li>Correo electrónico</li>
              <li>Información del pedido</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Uso de la Información</h2>
            <p>
              Utilizamos su información personal únicamente para:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Procesar y entregar sus pedidos</li>
              <li>Comunicarnos sobre su pedido</li>
              <li>Mejorar nuestros servicios</li>
              <li>Cumplir con obligaciones legales</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Protección de Datos</h2>
            <p>
              Implementamos medidas de seguridad apropiadas para proteger su información 
              personal contra acceso no autorizado, alteración, divulgación o destrucción. 
              Sus datos se almacenan de forma segura y solo el personal autorizado tiene 
              acceso a ellos.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Cookies</h2>
            <p>
              Utilizamos cookies y tecnologías similares para mejorar su experiencia 
              en nuestro sitio web. Esto incluye recordar los productos en su carrito 
              y analizar el uso de nuestro sitio.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Contacto</h2>
            <p>
              Para ejercer sus derechos o hacer preguntas sobre esta política, contáctenos:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Teléfono: 321 638 9995</li>
              <li>WhatsApp: 314 339 5376</li>
              <li>Email: info@disluna.co</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
