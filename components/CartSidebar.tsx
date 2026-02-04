"use client";

import React, { useEffect } from "react";
import { X, Plus, Minus, Trash2, ShoppingBag, ArrowRight } from "lucide-react";
import { useCart, CartItem } from "@/context/CartContext";
import Image from "next/image";
import Link from "next/link";

interface CartSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

function CartItemRow({ item }: { item: CartItem }) {
  const { updateQuantity, removeItem } = useCart();

  const itemPrice =
    item.type === "box" && item.unitsPerBox
      ? item.price * item.unitsPerBox
      : item.price;

  const subtotal = itemPrice * item.quantity;

  const typeLabel = item.type === "unit" ? "Unidad" : "Caja";
  const typeDetail =
    item.type === "box" && item.unitsPerBox
      ? ` (${item.unitsPerBox} un.)`
      : "";

  return (
    <div className="flex gap-3 p-3 bg-gray-50 rounded-lg">
      {/* Product Image */}
      <div className="relative w-20 h-20 flex-shrink-0 bg-white rounded-md overflow-hidden border border-gray-200">
        {item.image ? (
          <Image
            src={item.image}
            alt={item.name}
            fill
            className="object-cover"
            sizes="80px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <ShoppingBag className="w-8 h-8 text-gray-300" />
          </div>
        )}
      </div>

      {/* Product Details */}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-gray-900 truncate">
          {item.name}
        </h4>
        <p className="text-xs text-gray-500 mt-0.5">
          {typeLabel}
          {typeDetail}
        </p>
        <p className="text-sm font-medium text-[#0B3D91] mt-1">
          ${itemPrice.toFixed(2)}
        </p>

        {/* Quantity Controls */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-200">
            <button
              onClick={() =>
                updateQuantity(item.sku, item.type, item.quantity - 1)
              }
              className="p-1.5 hover:bg-gray-100 rounded-l-lg transition-colors"
              aria-label="Disminuir cantidad"
            >
              <Minus className="w-3.5 h-3.5 text-gray-600" />
            </button>
            <span className="w-8 text-center text-sm font-medium text-gray-900">
              {item.quantity}
            </span>
            <button
              onClick={() =>
                updateQuantity(item.sku, item.type, item.quantity + 1)
              }
              className="p-1.5 hover:bg-gray-100 rounded-r-lg transition-colors"
              aria-label="Aumentar cantidad"
            >
              <Plus className="w-3.5 h-3.5 text-gray-600" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-900">
              ${subtotal.toFixed(2)}
            </span>
            <button
              onClick={() => removeItem(item.sku, item.type)}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              aria-label="Eliminar item"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CartSidebar({ isOpen, onClose }: CartSidebarProps) {
  const { items, totalPrice, clearCart, isHydrated } = useCart();

  // Lock body scroll when sidebar is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  const itemCount = items.length;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-50 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-[420px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Carrito de compras"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-[#0B3D91] to-[#1E88E5]">
          <div className="flex items-center gap-3">
            <ShoppingBag className="w-6 h-6 text-white" />
            <div>
              <h2 className="text-lg font-bold text-white">Tu Carrito</h2>
              {isHydrated && itemCount > 0 && (
                <p className="text-xs text-white/80">
                  {itemCount} {itemCount === 1 ? "producto" : "productos"}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            aria-label="Cerrar carrito"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col h-[calc(100%-140px)]">
          {isHydrated && items.length === 0 ? (
            // Empty State
            <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-[#0B3D91]/10 to-[#1E88E5]/10 rounded-full flex items-center justify-center mb-4">
                <ShoppingBag className="w-12 h-12 text-[#0B3D91]" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Tu carrito está vacío
              </h3>
              <p className="text-sm text-gray-500 mb-6 max-w-[240px]">
                Explora nuestros productos y agrega lo que necesites para tu negocio
              </p>
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-[#0B3D91] text-white text-sm font-medium rounded-lg hover:bg-[#0B3D91]/90 transition-colors"
              >
                Continuar comprando
              </button>
            </div>
          ) : (
            // Items List
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {items.map((item) => (
                <CartItemRow key={`${item.sku}-${item.type}`} item={item} />
              ))}
            </div>
          )}
        </div>

        {/* Footer - Only show if has items */}
        {isHydrated && items.length > 0 && (
          <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-5">
            {/* Total */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-gray-600">Total</span>
              <span className="text-2xl font-bold text-[#0B3D91]">
                ${totalPrice.toFixed(2)}
              </span>
            </div>

            {/* Actions */}
            <div className="space-y-2.5">
              <Link
                href="/carrito"
                onClick={onClose}
                className="flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-[#0B3D91] to-[#1E88E5] text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-[#1E88E5]/25 transition-all duration-200"
              >
                Ir a pagar
                <ArrowRight className="w-4 h-4" />
              </Link>

              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Seguir comprando
                </button>
                <button
                  onClick={clearCart}
                  className="px-4 py-2.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                >
                  Vaciar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
