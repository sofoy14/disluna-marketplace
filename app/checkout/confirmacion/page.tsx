"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { 
  CheckCircle, 
  Package, 
  Phone, 
  ArrowLeft, 
  Clock,
  MapPin,
  CreditCard,
  Truck,
  MessageCircle
} from "lucide-react";

const WHATSAPP_NUMBER = "573174018932"; // Tu número

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("order") || "DIS-XXXXXX";
  const total = searchParams.get("total") || "150,000";
  const customerId = searchParams.get("customerId") || "--";
  const customerName = decodeURIComponent(searchParams.get("customerName") || "");
  const customerPhone = decodeURIComponent(searchParams.get("customerPhone") || "");


  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Success Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="bg-success/10 p-8 text-center">
            <div className="w-20 h-20 mx-auto bg-success rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">¡Pedido recibido!</h1>
            <p className="text-gray-600">
              Gracias por tu compra. Hemos recibido tu pedido correctamente.
            </p>
          </div>

          {/* Order Details */}
          <div className="p-8">
            {/* Order & Customer Info */}
            <div className="bg-gray-50 rounded-xl p-6 text-center mb-8">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Número de pedido</p>
                  <p className="text-xl font-bold text-primary">{orderNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">ID Cliente</p>
                  <p className="text-xl font-bold text-secondary">#{customerId}</p>
                </div>
              </div>
              {customerName && (
                <p className="text-sm text-gray-600 mt-3">
                  {customerName} • {customerPhone}
                </p>
              )}
            </div>

            {/* Timeline */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Estado del pedido</h3>
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-success/30" />
                <div className="space-y-6">
                  <div className="relative flex items-start">
                    <div className="w-8 h-8 bg-success rounded-full flex items-center justify-center z-10">
                      <CheckCircle className="w-5 h-5 text-white" />
                    </div>
                    <div className="ml-4">
                      <p className="font-medium text-gray-800">Pedido recibido</p>
                      <p className="text-sm text-gray-500">Hemos recibido tu pedido correctamente</p>
                    </div>
                  </div>
                  <div className="relative flex items-start">
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center z-10">
                      <Clock className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="ml-4">
                      <p className="font-medium text-gray-600">En proceso</p>
                      <p className="text-sm text-gray-400">Preparando tu pedido</p>
                    </div>
                  </div>
                  <div className="relative flex items-start">
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center z-10">
                      <Truck className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="ml-4">
                      <p className="font-medium text-gray-600">En camino</p>
                      <p className="text-sm text-gray-400">Tu pedido está en ruta</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="border-t border-gray-100 pt-6 mb-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Resumen del pedido</h3>
              <div className="bg-blue-50 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800">
                  📧 Te enviaremos los detalles completos de tu pedido al correo proporcionado.
                </p>
              </div>
              <div className="border-t border-gray-100 pt-3 flex justify-between">
                <span className="font-semibold text-gray-800">Total</span>
                <span className="font-bold text-primary text-lg">
                  ${Number(total).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Delivery Info */}
            <div className="bg-gray-50 rounded-xl p-6 mb-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-start space-x-3">
                  <MapPin className="w-5 h-5 text-secondary mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-800">Dirección de entrega</p>
                    <p className="text-sm text-gray-600">
                      Calle 10 #5-45, Apartamento 301<br />
                      Centro, Ibagué
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CreditCard className="w-5 h-5 text-secondary mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-800">Método de pago</p>
                    <p className="text-sm text-gray-600">Contraentrega (Efectivo)</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Message */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center space-x-2 bg-blue-50 text-blue-800 px-4 py-2 rounded-lg">
                <MessageCircle className="w-5 h-5" />
                <span className="text-sm font-medium">
                  Nos pondremos en contacto contigo pronto para confirmar tu pedido
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}?text=Hola,%20acabo%20de%20realizar%20un%20pedido%20(${encodeURIComponent(orderNumber)})%20y%20tengo%20una%20consulta`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center space-x-2 bg-whatsapp text-white py-4 rounded-xl font-semibold hover:opacity-90 transition-opacity"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                <span>Consultar por WhatsApp</span>
              </a>

              <Link
                href="/"
                className="w-full flex items-center justify-center space-x-2 bg-primary text-white py-4 rounded-xl font-semibold hover:bg-primary/90 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Volver a la tienda</span>
              </Link>
            </div>

            {/* Additional Info */}
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-500">
                ¿Tienes preguntas? Escríbenos a{" "}
                <a href="mailto:info@disluna.com" className="text-secondary hover:underline">
                  info@disluna.com
                </a>
                {" "}o llámanos al{" "}
                <a href={`tel:+${WHATSAPP_NUMBER}`} className="text-secondary hover:underline">
                  +57 317 401 8932
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="mt-8 grid grid-cols-3 gap-4 text-center">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <Truck className="w-8 h-8 text-secondary mx-auto mb-2" />
            <p className="text-xs text-gray-600">Entrega rápida</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <Package className="w-8 h-8 text-secondary mx-auto mb-2" />
            <p className="text-xs text-gray-600">Productos de calidad</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <Phone className="w-8 h-8 text-secondary mx-auto mb-2" />
            <p className="text-xs text-gray-600">Soporte 24/7</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Cargando confirmación...</p>
        </div>
      </div>
    }>
      <ConfirmationContent />
    </Suspense>
  );
}
