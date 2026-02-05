"use client";

import React from "react";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/context/CartContext";

interface CartIconProps {
  onClick?: () => void;
  className?: string;
}

export default function CartIcon({ onClick, className = "" }: CartIconProps) {
  const { totalItems, isHydrated } = useCart();

  return (
    <button
      onClick={onClick}
      className={`relative p-2 rounded-full transition-all duration-200 hover:bg-white/10 ${className}`}
      aria-label="Abrir carrito"
    >
      <ShoppingCart className="w-6 h-6 text-white" />
      
      {/* Badge with item count */}
      {isHydrated && totalItems > 0 && (
        <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-[#1E88E5] text-white text-xs font-bold rounded-full shadow-lg animate-in fade-in zoom-in duration-200">
          {totalItems > 99 ? "99+" : totalItems}
        </span>
      )}
    </button>
  );
}
