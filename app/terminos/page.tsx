import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Términos y Condiciones | DISLUNA",
  description: "Términos y condiciones de uso del marketplace DISLUNA",
};

export default function TerminosPage() {
  return (
    <div className="min-h-screen bg-white pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">
          Términos y Condiciones
        </h1>
        
        <div className="prose prose-lg max-w-none text-gray-600 space-y-6">
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Generalidades</h2>
            <p>
              Bienvenido a DISLUNA. Al acceder y utilizar nuestro sitio web y servicios, 
              usted acepta cumplir con estos términos y condiciones. Si no está de acuerdo 
              con alguna parte de estos términos, le recomendamos no utilizar nuestros servicios.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Productos y Precios</h2>
            <p>
              Los precios mostrados en nuestro catálogo pueden variar sin previo aviso. 
              Nos reservamos el derecho de modificar los precios en cualquier momento. 
              Los precios aplicables serán los vigentes al momento de confirmar su pedido.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Pedidos y Entregas</h2>
            <p>
              Los pedidos están sujetos a disponibilidad de stock. Realizamos entregas 
              en Ibagué y zonas aledañas. Los tiempos de entrega pueden variar según 
              la disponibilidad y la ubicación.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Pagos</h2>
            <p>
              Aceptamos pagos contra entrega en efectivo, transferencia bancaria y PSE. 
              Todos los pagos deben realizarse en pesos colombianos (COP).
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Devoluciones</h2>
            <p>
              Aceptamos devoluciones de productos defectuosos o dañados durante el transporte 
              dentro de las 24 horas posteriores a la entrega. Los productos deben estar 
              en su empaque original.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Contacto</h2>
            <p>
              Para cualquier duda o reclamación, puede contactarnos a través de:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Teléfono: 321 638 9995</li>
              <li>WhatsApp: 314 339 5376</li>
              <li>Email: info@disluna.co</li>
              <li>Dirección: Calle 5b #13 - Esquina, Ibagué</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
