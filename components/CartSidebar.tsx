"use client";

import React, { useEffect } from "react";
import { X, Plus, Minus, Trash2, ShoppingBag, ArrowRight, Package } from "lucide-react";
import { useCart, CartItem } from "@/context/CartContext";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface CartSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

function CartItemRow({ item }: { item: CartItem }) {
  const { updateQuantity, removeItem } = useCart();

  const itemPrice = item.price;
  const subtotal = itemPrice * item.quantity;

  const typeLabel = item.type === "unit" ? "Unidad" : "Caja";
  const typeDetail = item.type === "box" && item.unitsPerBox ? ` (${item.unitsPerBox} un.)` : "";

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="flex gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 transition-all duration-300 hover:bg-white/10 hover:border-white/20 group">
      {/* Product Image */}
      <div className="relative w-20 h-20 flex-shrink-0 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-xl flex items-center justify-center">
        <Package className="w-8 h-8 text-primary/40" />
      </div>

      {/* Product Details */}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-white truncate mb-1">
          {item.name}
        </h4>
        <p className="text-xs text-white/50 mb-2">
          {typeLabel}
          {typeDetail}
        </p>
        <p className="text-sm font-medium text-accent">
          {formatPrice(itemPrice)}
        </p>

        {/* Quantity Controls */}
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-1 bg-white/10 rounded-xl p-1">
            <button
              onClick={() => updateQuantity(item.sku, item.type, item.quantity - 1)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/70 hover:text-white"
              aria-label="Disminuir cantidad"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="w-8 text-center text-sm font-medium text-white">
              {item.quantity}
            </span>
            <button
              onClick={() => updateQuantity(item.sku, item.type, item.quantity + 1)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/70 hover:text-white"
              aria-label="Aumentar cantidad"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-white">
              {formatPrice(subtotal)}
            </span>
            <button
              onClick={() => removeItem(item.sku, item.type)}
              className="p-2 text-white/30 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all duration-300"
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

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const itemCount = items.length;

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-50 transition-all duration-500 ease-expo-out",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      </div>

      {/* Sidebar */}
      <div
        className={cn(
          "fixed top-0 right-0 h-full w-full sm:w-[440px] z-50 transform transition-transform duration-500 ease-expo-out",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Carrito de compras"
      >
        <div className="h-full bg-gradient-to-br from-gray-900 to-primary border-l border-white/10 shadow-2xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Tu Carrito</h2>
                {isHydrated && itemCount > 0 && (
                  <p className="text-xs text-white/50">
                    {itemCount} {itemCount === 1 ? "producto" : "productos"}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2.5 text-white/50 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-300"
              aria-label="Cerrar carrito"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {isHydrated && items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4">
                <div className="w-24 h-24 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6">
                  <ShoppingBag className="w-12 h-12 text-white/20" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  Tu carrito está vacío
                </h3>
                <p className="text-sm text-white/50 mb-8 max-w-[240px]">
                  Explora nuestros productos y agrega lo que necesites
                </p>
                <button
                  onClick={onClose}
                  className="px-8 py-3 bg-white text-primary rounded-full font-medium hover:bg-white/90 transition-all duration-300 hover:scale-105 active:scale-95"
                >
                  Continuar comprando
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item) => (
                  <CartItemRow key={`${item.sku}-${item.type}`} item={item} />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {isHydrated && items.length > 0 && (
            <div className="border-t border-white/10 p-6 space-y-4 bg-white/5">
              {/* Total */}
              <div className="flex items-center justify-between">
                <span className="text-white/60">Total estimado</span>
                <span className="text-2xl font-bold text-white">
                  {formatPrice(totalPrice)}
                </span>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <Link
                  href="/checkout"
                  onClick={onClose}
                  className="flex items-center justify-center gap-2 w-full py-4 bg-white text-primary font-semibold rounded-full hover:bg-white/90 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg"
                >
                  Proceder al pago
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="flex-1 py-3 text-sm font-medium text-white/70 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all duration-300"
                  >
                    Seguir comprando
                  </button>
                  <button
                    onClick={clearCart}
                    className="px-5 py-3 text-sm font-medium text-red-400 bg-red-400/10 border border-red-400/20 rounded-full hover:bg-red-400/20 transition-all duration-300"
                  >
                    Vaciar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
