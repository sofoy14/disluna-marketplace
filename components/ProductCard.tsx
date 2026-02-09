"use client";

import Link from "next/link";
import { Package, ArrowUpRight } from "lucide-react";
import { Product } from "@/data/products";
import { getCategoryStyles } from "@/lib/categories";
import { cn } from "@/lib/utils";

interface ProductCardProps {
  product: Product;
  className?: string;
}

export function ProductCard({ product, className }: ProductCardProps) {
  const categoryStyles = getCategoryStyles(product.category);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const getBrandColor = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('coca-cola') || lower.includes('coca cola')) return '#DC2626';
    if (lower.includes('sprite')) return '#22C55E';
    if (lower.includes('brisa')) return '#06B6D4';
    if (lower.includes('powerade')) return '#7C3AED';
    if (lower.includes('fresh')) return '#F97316';
    if (lower.includes('schweppes')) return '#DC2626';
    if (lower.includes('quatro')) return '#84CC16';
    return '#6B7280';
  };

  const brandColor = getBrandColor(product.name);

  return (
    <div
      className={cn(
        "group relative bg-white rounded-2xl border border-gray-100 overflow-hidden",
        "transition-all duration-500 ease-expo-out",
        "hover:shadow-soft-lg hover:border-gray-200 hover:-translate-y-2",
        className
      )}
    >
      {/* Image Container */}
      <Link href={`/productos/${product.sku}`} className="block relative">
        <div 
          className="aspect-square relative flex items-center justify-center overflow-hidden bg-gray-50"
        >
          {product.image ? (
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-contain p-4 transition-transform duration-500 group-hover:scale-110"
              onError={(e) => {
                // Si la imagen falla, mostrar el placeholder
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent) {
                  parent.innerHTML = `
                    <div class="text-center">
                      <svg class="w-14 h-14 mx-auto mb-2 opacity-40" style="color: ${brandColor}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                      </svg>
                      <span class="text-xs font-medium uppercase tracking-wider opacity-50" style="color: ${brandColor}">${product.size}</span>
                    </div>
                  `;
                }
              }}
            />
          ) : (
            <>
              {/* Background circle */}
              <div 
                className="absolute w-32 h-32 rounded-full opacity-20 transition-transform duration-700 group-hover:scale-150"
                style={{ backgroundColor: brandColor }}
              />
              
              {/* Icon */}
              <div className="relative z-10 text-center transition-transform duration-500 group-hover:scale-110">
                <Package 
                  className="w-14 h-14 mx-auto mb-2 opacity-40 transition-all duration-500 group-hover:opacity-60" 
                  style={{ color: brandColor }}
                />
                <span 
                  className="text-xs font-medium uppercase tracking-wider opacity-50"
                  style={{ color: brandColor }}
                >
                  {product.size}
                </span>
              </div>
            </>
          )}

          {/* Category Badge */}
          <div
            className={cn(
              "absolute top-3 left-3 px-3 py-1.5 rounded-full text-xs font-medium",
              "backdrop-blur-md bg-white/80 shadow-sm",
              categoryStyles.text
            )}
          >
            {product.category.split(' ')[0]}
          </div>

          {/* Hover overlay with CTA */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-end justify-center pb-6">
            <span className="inline-flex items-center gap-1 px-4 py-2 bg-white text-gray-900 rounded-full text-sm font-medium transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
              Ver detalle
              <ArrowUpRight className="w-4 h-4" />
            </span>
          </div>
        </div>
      </Link>

      {/* Content */}
      <div className="p-5">
        {/* SKU */}
        <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">{product.sku}</p>

        {/* Name */}
        <Link href={`/productos/${product.sku}`}>
          <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2 group-hover:text-primary transition-colors duration-300 text-sm leading-tight min-h-[2.5rem]">
            {product.name} {product.size}
          </h3>
        </Link>

        {/* Prices */}
        <div className="flex items-end justify-between mt-4 pt-4 border-t border-gray-100">
          <div>
            <p className="text-[10px] text-gray-400 mb-0.5 uppercase tracking-wider">Unidad</p>
            <p className="font-bold text-gray-900">
              {formatPrice(product.unitPrice)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-gray-400 mb-0.5 uppercase tracking-wider">
              Caja x{product.unitsPerBox}
            </p>
            <p className="font-bold text-primary">
              {formatPrice(product.boxPrice)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
