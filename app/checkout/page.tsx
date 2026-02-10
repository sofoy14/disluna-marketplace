"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useCustomers } from "@/context/CustomerContext";
import { useOrders } from "@/context/OrderContext";
import {
  ShoppingCart,
  MapPin,
  CreditCard,
  Truck,
  Store,
  ChevronLeft,
  Package,
  AlertCircle,
  Check,
  MessageCircle
} from "lucide-react";
import { createWhatsAppLink, WHATSAPP_DISPLAY } from "@/lib/whatsapp";

function formatPrice(price: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(price);
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, totalPrice, clearCart } = useCart();
  const { getOrCreateCustomerId } = useCustomers();
  const { addOrder } = useOrders();
  const [deliveryMethod, setDeliveryMethod] = useState<"pickup" | "delivery">("delivery");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "transfer" | "pse">("cash");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [sendToWhatsApp, setSendToWhatsApp] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form fields
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    neighborhood: "",
    city: "Ibagué",
    notes: "",
  });

  const deliveryCost = deliveryMethod === "delivery" ? 5000 : 0;
  const total = totalPrice + deliveryCost;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!termsAccepted) return;

    setIsSubmitting(true);

    // Simular procesamiento
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Generar número de pedido
    const orderNumber = `DIS-${Date.now().toString(36).toUpperCase()}`;

    // Generar/obtener ID de cliente basado en teléfono
    const customerId = getOrCreateCustomerId(
      formData.phone,
      formData.name,
      formData.email
    );

    // Guardar pedido en el sistema
    const order = addOrder({
      orderNumber,
      customerId,
      customerName: formData.name,
      customerPhone: formData.phone,
      customerEmail: formData.email,
      address: formData.address,
      neighborhood: formData.neighborhood,
      city: formData.city,
      notes: formData.notes,
      items: items.map(item => ({
        sku: item.sku,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        type: item.type,
        unitsPerBox: item.unitsPerBox,
        image: item.image,
      })),
      subtotal: totalPrice,
      deliveryCost,
      total,
      deliveryMethod,
      paymentMethod,
    });

    // Limpiar carrito
    clearCart();

    // Si el usuario quiere enviar por WhatsApp
    if (sendToWhatsApp) {
      // Generar mensaje de WhatsApp formateado
      let message = `🛒 *NUEVO PEDIDO ${orderNumber}*\n\n`;
      message += `👤 *Cliente:* ${formData.name}\n`;
      message += `📱 *Teléfono:* ${formData.phone}\n\n`;

      // Agregar dirección si es delivery
      if (deliveryMethod === "delivery") {
        message += `📍 *Dirección:* ${formData.address}, ${formData.neighborhood}\n`;
        message += `🏙️ *Ciudad:* ${formData.city}\n\n`;
      } else {
        message += `📦 *Recoger en bodega*\n\n`;
      }

      message += `📦 *Productos:*\n`;
      message += `─────────────────\n`;

      items.forEach((item, index) => {
        const units = item.type === "box" && item.unitsPerBox
          ? ` (${item.quantity * item.unitsPerBox} un.)`
          : "";
        message += `${index + 1}. ${item.name}${units}\n`;
        message += `   Cant: ${item.quantity} ${item.type === "box" ? "caja(s)" : "unidad(es)"}\n`;
        message += `   $${new Intl.NumberFormat("es-CO", {
          style: "currency",
          currency: "COP",
          minimumFractionDigits: 0,
        }).format(item.price * item.quantity)}\n\n`;
      });

      message += `─────────────────\n`;
      message += `💰 *Subtotal:* $${new Intl.NumberFormat("es-CO").format(totalPrice)}\n`;
      message += `🚚 *Envío:* ${deliveryCost === 0 ? "Gratis" : "$5,000"}\n`;
      message += `✨ *TOTAL:* $${new Intl.NumberFormat("es-CO").format(total)}\n\n`;

      message += `💳 *Método de pago:* ${
        paymentMethod === "cash" ? "Contraentrega" :
        paymentMethod === "transfer" ? "Transferencia" : "PSE"
      }\n\n`;

      if (formData.notes) {
        message += `📝 *Notas:* ${formData.notes}\n\n`;
      }

      message += `✅ Por favor confirmar mi pedido. Gracias.`;

      // Abrir WhatsApp con el mensaje
      const whatsappUrl = createWhatsAppLink(message);
      window.open(whatsappUrl, "_blank");
    }

    // Redirigir a página de confirmación con datos del cliente
    const params = new URLSearchParams({
      order: orderNumber,
      total: total.toString(),
      customerId: customerId,
      customerName: encodeURIComponent(formData.name),
      customerPhone: encodeURIComponent(formData.phone),
    });

    router.push(`/checkout/confirmacion?${params.toString()}`);
  };

  // Si el carrito está vacío, redirigir a productos
  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 pt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12">
            <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Tu carrito está vacío</h1>
            <p className="text-gray-600 mb-6">Agrega productos antes de continuar con el checkout</p>
            <Link
              href="/productos"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              Ver productos
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link 
            href="/carrito" 
            className="inline-flex items-center text-gray-600 hover:text-primary transition-colors"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Volver al carrito
          </Link>
        </div>

        <h1 className="text-3xl font-bold text-gray-800 mb-8">Finalizar Pedido</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Datos de Entrega */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-800">Datos de Entrega</h2>
                </div>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre completo <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
                      placeholder="Juan Pérez"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Teléfono <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
                      placeholder="312 345 6789"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Correo electrónico <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
                    placeholder="juan@ejemplo.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dirección completa <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
                    placeholder="Calle 10 #5-45, Apartamento 301"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Barrio <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.neighborhood}
                      onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
                      placeholder="Centro"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ciudad <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notas adicionales
                  </label>
                  <textarea
                    rows={3}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
                    placeholder="Instrucciones especiales de entrega, referencias de ubicación, etc."
                  />
                </div>
              </form>
            </div>

            {/* Método de Entrega */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <Truck className="w-5 h-5 text-primary" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-800">Método de Entrega</h2>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  deliveryMethod === "delivery" ? "border-secondary bg-secondary/5" : "border-gray-200"
                }`}>
                  <input
                    type="radio"
                    name="deliveryMethod"
                    value="delivery"
                    checked={deliveryMethod === "delivery"}
                    onChange={() => setDeliveryMethod("delivery")}
                    className="w-5 h-5 text-secondary focus:ring-secondary"
                  />
                  <div className="ml-4 flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Truck className="w-5 h-5 text-gray-500 mr-2" />
                        <span className="font-medium text-gray-800">Envío a domicilio</span>
                      </div>
                      <span className="text-gray-600">$5,000</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">Entrega en 1-2 días hábiles</p>
                  </div>
                </label>

                <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  deliveryMethod === "pickup" ? "border-secondary bg-secondary/5" : "border-gray-200"
                }`}>
                  <input
                    type="radio"
                    name="deliveryMethod"
                    value="pickup"
                    checked={deliveryMethod === "pickup"}
                    onChange={() => setDeliveryMethod("pickup")}
                    className="w-5 h-5 text-secondary focus:ring-secondary"
                  />
                  <div className="ml-4 flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Store className="w-5 h-5 text-gray-500 mr-2" />
                        <span className="font-medium text-gray-800">Recoger en bodega</span>
                      </div>
                      <span className="text-success font-medium">Gratis</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Calle 5b #13- Esquina, Ibagué
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Método de Pago */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-primary" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-800">Método de Pago</h2>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  paymentMethod === "cash" ? "border-secondary bg-secondary/5" : "border-gray-200"
                }`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cash"
                    checked={paymentMethod === "cash"}
                    onChange={() => setPaymentMethod("cash")}
                    className="w-5 h-5 text-secondary focus:ring-secondary"
                  />
                  <div className="ml-4">
                    <span className="font-medium text-gray-800">Contraentrega (Efectivo)</span>
                    <p className="text-sm text-gray-500 mt-1">Paga cuando recibas tu pedido</p>
                  </div>
                </label>

                <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  paymentMethod === "transfer" ? "border-secondary bg-secondary/5" : "border-gray-200"
                }`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="transfer"
                    checked={paymentMethod === "transfer"}
                    onChange={() => setPaymentMethod("transfer")}
                    className="w-5 h-5 text-secondary focus:ring-secondary"
                  />
                  <div className="ml-4">
                    <span className="font-medium text-gray-800">Transferencia bancaria</span>
                    <p className="text-sm text-gray-500 mt-1">Te enviaremos los datos para la transferencia</p>
                  </div>
                </label>

                <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  paymentMethod === "pse" ? "border-secondary bg-secondary/5" : "border-gray-200"
                }`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="pse"
                    checked={paymentMethod === "pse"}
                    onChange={() => setPaymentMethod("pse")}
                    className="w-5 h-5 text-secondary focus:ring-secondary"
                  />
                  <div className="ml-4">
                    <span className="font-medium text-gray-800">PSE (Próximamente)</span>
                    <p className="text-sm text-gray-500 mt-1">Pago en línea desde tu banco</p>
                  </div>
                </label>
              </div>
            </div>

            {/* WhatsApp Option */}
            <div className="bg-whatsapp/5 border border-whatsapp/20 rounded-xl p-6">
              <label className="flex items-start cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendToWhatsApp}
                  onChange={(e) => setSendToWhatsApp(e.target.checked)}
                  className="w-5 h-5 text-whatsapp rounded focus:ring-whatsapp mt-0.5"
                />
                <div className="ml-3">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-whatsapp" />
                    <span className="text-sm font-medium text-gray-800">
                      Enviar pedido por WhatsApp
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    Recibirás tu pedido formateado listo para enviar al número {WHATSAPP_DISPLAY}
                  </p>
                </div>
              </label>
            </div>

            {/* Términos */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <label className="flex items-start cursor-pointer">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="w-5 h-5 text-secondary rounded focus:ring-secondary mt-0.5"
                />
                <span className="ml-3 text-sm text-gray-600">
                  Acepto los{" "}
                  <Link href="/terminos" className="text-secondary hover:underline">
                    términos y condiciones
                  </Link>{" "}
                  y la{" "}
                  <Link href="/privacidad" className="text-secondary hover:underline">
                    política de privacidad
                  </Link>
                  . Confirmo que los datos proporcionados son correctos.
                </span>
              </label>
            </div>
          </div>

          {/* Resumen del Pedido */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 sticky top-24">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center space-x-3">
                  <ShoppingCart className="w-6 h-6 text-primary" />
                  <h2 className="text-xl font-semibold text-gray-800">Resumen del Pedido</h2>
                </div>
              </div>

              <div className="p-6">
                {/* Items */}
                <div className="space-y-4 mb-6 max-h-64 overflow-y-auto">
                  {items.map((item) => (
                    <div key={`${item.sku}-${item.type}`} className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {item.image ? (
                          <Image
                            src={item.image}
                            alt={item.name}
                            width={48}
                            height={48}
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <Package className="w-6 h-6 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                        <p className="text-xs text-gray-500">
                          x{item.quantity} {item.type === "box" && item.unitsPerBox && `(${item.quantity * item.unitsPerBox} un.)`}
                        </p>
                      </div>
                      <p className="text-sm font-medium text-gray-800">
                        {formatPrice(item.price * item.quantity)}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="border-t border-gray-100 pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="text-gray-800">{formatPrice(totalPrice)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Envío</span>
                    <span className={deliveryCost === 0 ? "text-success" : "text-gray-800"}>
                      {deliveryCost === 0 ? "Gratis" : formatPrice(deliveryCost)}
                    </span>
                  </div>
                  <div className="flex justify-between text-lg font-semibold pt-2 border-t border-gray-100">
                    <span className="text-gray-800">Total</span>
                    <span className="text-primary">{formatPrice(total)}</span>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  onClick={handleSubmit}
                  disabled={!termsAccepted || isSubmitting}
                  className={`w-full mt-6 py-4 rounded-lg font-semibold flex items-center justify-center space-x-2 transition-colors ${
                    termsAccepted && !isSubmitting
                      ? "bg-primary text-white hover:bg-primary/90"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Procesando...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      <span>Confirmar pedido</span>
                    </>
                  )}
                </button>

                {!termsAccepted && (
                  <div className="mt-3 flex items-center text-xs text-amber-600">
                    <AlertCircle className="w-4 h-4 mr-1 flex-shrink-0" />
                    <span>Debes aceptar los términos y condiciones</span>
                  </div>
                )}

                <p className="mt-4 text-xs text-gray-500 text-center">
                  Al confirmar, recibirás un correo con los detalles de tu pedido
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
