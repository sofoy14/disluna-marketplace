"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, X, ArrowRight, Package } from "lucide-react";
import { products } from "@/data/products";
import { cn } from "@/lib/utils";

interface SearchWithPreviewProps {
  isScrolled: boolean;
  variant?: "header" | "hero";
}

export function SearchWithPreview({ isScrolled, variant = "header" }: SearchWithPreviewProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filtrar productos
  const filteredProducts = query.trim()
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          p.category.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 5)
    : [];

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Navegación con teclado
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filteredProducts.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0 && filteredProducts[highlightedIndex]) {
        window.location.href = `/productos/${filteredProducts[highlightedIndex].sku}`;
      } else if (query.trim()) {
        window.location.href = `/productos?busqueda=${encodeURIComponent(query)}`;
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const isHero = variant === "hero";

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Input Container */}
      <div
        className={cn(
          "relative flex items-center transition-all duration-500 ease-expo-out",
          isHero && "transform hover:scale-[1.02]"
        )}
      >
        <div
          className={cn(
            "absolute left-4 transition-colors duration-300",
            isHero
              ? "text-white/60"
              : isScrolled
              ? "text-gray-400"
              : "text-white/60"
          )}
        >
          <Search className="w-5 h-5" />
        </div>

        <input
          ref={inputRef}
          type="text"
          placeholder={isHero ? "Busca tu bebida favorita..." : "Buscar productos..."}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setHighlightedIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className={cn(
            "w-full rounded-full text-base transition-all duration-500 ease-expo-out focus:outline-none",
            isHero
              ? "pl-12 pr-12 py-4 bg-white/10 backdrop-blur-xl border border-white/20 text-white placeholder-white/50 focus:bg-white/15 focus:border-white/30 shadow-glass"
              : isScrolled
              ? "pl-12 pr-10 py-2.5 bg-gray-100/80 border border-gray-200/50 text-gray-900 placeholder-gray-400 focus:bg-white focus:border-secondary/50 focus:shadow-soft"
              : "pl-12 pr-10 py-2.5 bg-white/10 backdrop-blur-md border border-white/20 text-white placeholder-white/50 focus:bg-white/20 focus:border-white/40"
          )}
        />

        {/* Clear button */}
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            className={cn(
              "absolute right-4 p-1 rounded-full transition-all duration-300 hover:scale-110",
              isHero
                ? "text-white/60 hover:text-white hover:bg-white/20"
                : isScrolled
                ? "text-gray-400 hover:text-gray-600 hover:bg-gray-200"
                : "text-white/60 hover:text-white hover:bg-white/20"
            )}
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Search button (hero only) */}
        {isHero && (
          <button
            onClick={() => {
              if (query.trim()) {
                window.location.href = `/productos?busqueda=${encodeURIComponent(query)}`;
              }
            }}
            className="absolute right-2 px-6 py-2 bg-white text-primary rounded-full font-medium text-sm hover:bg-white/90 transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg"
          >
            Buscar
          </button>
        )}
      </div>

      {/* Dropdown Preview */}
      {isOpen && (query.trim() || filteredProducts.length > 0) && (
        <div
          className={cn(
            "absolute left-0 right-0 mt-3 overflow-hidden z-50",
            "animate-slide-down"
          )}
        >
          <div
            className={cn(
              "rounded-2xl border backdrop-blur-xl shadow-glass-lg overflow-hidden",
              isHero || !isScrolled
                ? "bg-white/10 border-white/20"
                : "bg-white/95 border-gray-200/50"
            )}
          >
            {filteredProducts.length > 0 ? (
              <div className="py-2">
                {/* Results */}
                {filteredProducts.map((product, index) => (
                  <Link
                    key={product.sku}
                    href={`/productos/${product.sku}`}
                    onClick={() => setIsOpen(false)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={cn(
                      "flex items-center gap-4 px-4 py-3 mx-2 rounded-xl transition-all duration-300",
                      highlightedIndex === index
                        ? isHero || !isScrolled
                          ? "bg-white/20"
                          : "bg-gray-100"
                        : "hover:bg-white/5"
                    )}
                  >
                    {/* Product Image */}
                    <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {product.image ? (
                        <Image
                          src={product.image}
                          alt={product.name}
                          width={48}
                          height={48}
                          className="object-contain w-full h-full p-1"
                        />
                      ) : (
                        <Package className="w-6 h-6 text-gray-400" />
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          "font-medium truncate",
                          isHero || !isScrolled ? "text-white" : "text-gray-900"
                        )}
                      >
                        {product.name}
                      </p>
                      <p
                        className={cn(
                          "text-sm",
                          isHero || !isScrolled ? "text-white/60" : "text-gray-500"
                        )}
                      >
                        {product.size} • {product.category}
                      </p>
                    </div>

                    {/* Price */}
                    <div className="text-right">
                      <p
                        className={cn(
                          "font-semibold",
                          isHero || !isScrolled ? "text-white" : "text-primary"
                        )}
                      >
                        ${product.unitPrice.toLocaleString()}
                      </p>
                    </div>

                    <ArrowRight
                      className={cn(
                        "w-4 h-4 transition-all duration-300",
                        highlightedIndex === index
                          ? "opacity-100 translate-x-0"
                          : "opacity-0 -translate-x-2",
                        isHero || !isScrolled ? "text-white/60" : "text-gray-400"
                      )}
                    />
                  </Link>
                ))}

                {/* View all link */}
                <div className="px-4 pt-2 pb-1">
                  <Link
                    href={`/productos?busqueda=${encodeURIComponent(query)}`}
                    className={cn(
                      "flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all duration-300",
                      isHero || !isScrolled
                        ? "text-white/80 hover:text-white hover:bg-white/10"
                        : "text-primary hover:bg-primary/5"
                    )}
                  >
                    Ver todos los resultados
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ) : query.trim() ? (
              /* No results */
              <div className="px-4 py-8 text-center">
                <Package
                  className={cn(
                    "w-12 h-12 mx-auto mb-3 opacity-30",
                    isHero || !isScrolled ? "text-white" : "text-gray-400"
                  )}
                />
                <p
                  className={cn(
                    isHero || !isScrolled ? "text-white/60" : "text-gray-500"
                  )}
                >
                  No encontramos productos para "{query}"
                </p>
                <Link
                  href="/productos"
                  className={cn(
                    "inline-flex items-center gap-1 mt-2 text-sm font-medium transition-colors",
                    isHero || !isScrolled
                      ? "text-white/80 hover:text-white"
                      : "text-primary hover:text-primary/80"
                  )}
                >
                  Ver catálogo completo
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
