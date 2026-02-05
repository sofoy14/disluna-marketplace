"use client";

import Link from "next/link";
import Image from "next/image";
import { 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  Package,
  ArrowRight,
  ArrowLeft,
  AlertCircle
} from "lucide-react";
import { useCart } from "@/context/CartContext";

function formatPrice(price: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(price);
}

export default function CarritoPage() {
  const { items, updateQuantity, removeItem, clearCart, totalPrice, totalItems } = useCart();

  return (
    <div className="min-h-screen bg-gray-50 py-8 pt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link 
            href="/productos" 
            className="inline-flex items-center text-gray-600 hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Seguir comprando
          </Link>
        </div>

        <h1 className="text-3xl font-bold text-gray-800 mb-8 flex items-center">
          <ShoppingCart className="w-8 h-8 mr-3" />
          Carrito de Compras
        </h1>

        {items.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShoppingCart className="w-10 h-10 text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Tu carrito está vacío</h2>
            <p className="text-gray-600 mb-6">Explora nuestros productos y agrega lo que necesites</p>
            <Link
              href="/productos"
              className="inline-flex items-center space-x-2 bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
            >
              <span>Ver productos</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-800">
                      Productos ({totalItems} items)
                    </h2>
                    <button 
                      onClick={clearCart}
                      className="text-red-500 text-sm hover:text-red-600 flex items-center"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Vaciar carrito
                    </button>
                  </div>
                </div>

                <div className="divide-y divide-gray-100">
                  {items.map((item) => (
                    <div key={`${item.sku}-${item.type}`} className="p-6 flex items-center space-x-4">
                      {/* Product Image */}
                      <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {item.image ? (
                          <Image
                            src={item.image}
                            alt={item.name}
                            width={80}
                            height={80}
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <Package className="w-10 h-10 text-gray-400" />
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-800 truncate">{item.name}</h3>
                        <p className="text-gray-500 text-sm">
                          {item.type === "unit" ? "Por unidad" : `Por caja (${item.unitsPerBox} un.)`}
                        </p>
                        <p className="text-sm text-primary font-medium">
                          {formatPrice(item.price)} / {item.type === "unit" ? "unidad" : "caja"}
                        </p>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => updateQuantity(item.sku, item.type, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          className="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-12 text-center font-medium">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.sku, item.type, item.quantity + 1)}
                          className="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Total */}
                      <div className="text-right min-w-[120px]">
                        <p className="font-semibold text-gray-800">
                          {formatPrice(item.price * item.quantity)}
                        </p>
                        <button
                          onClick={() => removeItem(item.sku, item.type)}
                          className="text-red-500 text-sm hover:text-red-600 mt-1 flex items-center justify-end"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Additional Info */}
              <div className="mt-6 bg-blue-50 rounded-xl p-4 flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-blue-800 font-medium">Información importante</p>
                  <p className="text-sm text-blue-600">
                    Los precios pueden variar según disponibilidad. Te contactaremos para confirmar tu pedido.
                  </p>
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 sticky top-24">
                <div className="p-6 border-b border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-800">Resumen del pedido</h2>
                </div>

                <div className="p-6 space-y-4">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal ({totalItems} items)</span>
                    <span>{formatPrice(totalPrice)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Envío</span>
                    <span className="text-gray-400">Se calcula en checkout</span>
                  </div>
                  
                  <div className="border-t border-gray-100 pt-4">
                    <div className="flex justify-between text-lg font-semibold text-gray-800">
                      <span>Total estimado</span>
                      <span>{formatPrice(totalPrice)}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      IVA incluido en todos los productos
                    </p>
                  </div>

                  <Link
                    href="/checkout"
                    className="w-full bg-primary text-white py-4 rounded-lg font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center space-x-2"
                  >
                    <span>Proceder al pago</span>
                    <ArrowRight className="w-5 h-5" />
                  </Link>

                  <Link
                    href="/productos"
                    className="w-full border border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center"
                  >
                    Seguir comprando
                  </Link>
                </div>

                {/* Payment Methods */}
                <div className="px-6 pb-6">
                  <p className="text-xs text-gray-500 text-center mb-3">
                    Métodos de pago aceptados
                  </p>
                  <div className="flex items-center justify-center space-x-4">
                    <div className="px-3 py-1 bg-gray-100 rounded text-xs text-gray-600">Efectivo</div>
                    <div className="px-3 py-1 bg-gray-100 rounded text-xs text-gray-600">Transferencia</div>
                    <div className="px-3 py-1 bg-gray-100 rounded text-xs text-gray-600">PSE</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
