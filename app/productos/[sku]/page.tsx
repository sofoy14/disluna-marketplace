"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getProductBySku, getRelatedProducts, Product } from "@/data/products";
import { getCategoryById, getCategoryStyles } from "@/lib/categories";
import { ProductCard } from "@/components/ProductCard";
import {
  ChevronRight,
  Home,
  Package,
  ShoppingCart,
  Minus,
  Plus,
  Box,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCart } from "@/context/CartContext";

// Función para obtener color de marca
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

type PurchaseMode = "unit" | "box";

function ProductDetail({ product }: { product: Product }) {
  const [purchaseMode, setPurchaseMode] = useState<PurchaseMode>("unit");
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);
  const { addItem } = useCart();

  const category = getCategoryById(product.category);
  const categoryStyles = getCategoryStyles(product.category);
  const relatedProducts = getRelatedProducts(product.sku, 4);

  const currentPrice =
    purchaseMode === "unit" ? product.unitPrice : product.boxPrice;
  const totalPrice = currentPrice * quantity;

  const handleAddToCart = () => {
    addItem(
      {
        sku: product.sku,
        name: product.name,
        price: purchaseMode === "unit" ? product.unitPrice : product.boxPrice,
        image: product.image,
        unitsPerBox: product.unitsPerBox,
      },
      purchaseMode,
      quantity
    );
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const adjustQuantity = (delta: number) => {
    setQuantity((prev) => Math.max(1, prev + delta));
  };

  // Format price in COP
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-24">
      {/* Breadcrumbs */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <nav className="flex items-center gap-2 text-sm">
            <Link
              href="/"
              className="flex items-center gap-1 text-slate-500 hover:text-slate-700 transition-colors"
            >
              <Home className="w-4 h-4" />
              <span>Inicio</span>
            </Link>
            <ChevronRight className="w-4 h-4 text-slate-400" />
            <Link
              href="/productos"
              className="text-slate-500 hover:text-slate-700 transition-colors"
            >
              Productos
            </Link>
            <ChevronRight className="w-4 h-4 text-slate-400" />
            <span className="font-medium text-slate-900 truncate max-w-[200px]">
              {product.name}
            </span>
          </nav>
        </div>
      </div>

      {/* Product Detail */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Product Image - Placeholder con color de marca */}
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
            <div 
              className="aspect-square relative rounded-xl overflow-hidden flex items-center justify-center"
              style={{ backgroundColor: `${getBrandColor(product.name)}10` }}
            >
              {/* Círculo de fondo */}
              <div 
                className="absolute w-48 h-48 rounded-full opacity-30"
                style={{ backgroundColor: getBrandColor(product.name) }}
              />
              
              {/* Icono */}
              <div className="relative z-10 text-center">
                <Package 
                  className="w-24 h-24 mx-auto mb-4 opacity-40" 
                  style={{ color: getBrandColor(product.name) }}
                />
                <span 
                  className="text-sm font-medium uppercase tracking-wider opacity-60"
                  style={{ color: getBrandColor(product.name) }}
                >
                  {product.size}
                </span>
              </div>

              {/* Category Badge */}
              <div
                className={cn(
                  "absolute top-4 left-4 px-3 py-1.5 rounded-full text-sm font-medium",
                  categoryStyles.bg,
                  categoryStyles.text
                )}
              >
                <span className="mr-1">{category?.icon}</span>
                {category?.name}
              </div>
            </div>
          </div>

          {/* Product Info */}
          <div className="flex flex-col">
            <div className="flex-1">
              {/* SKU */}
              <p className="text-sm text-slate-500 mb-2">SKU: {product.sku}</p>

              {/* Name */}
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                {product.name}
              </h1>

              {/* Description */}
              <p className="text-slate-600 mb-6 text-lg">
                {product.description}
              </p>

              {/* Specs */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-slate-100 rounded-lg p-4 text-center">
                  <Package className="w-5 h-5 text-slate-500 mx-auto mb-2" />
                  <p className="text-xs text-slate-500 uppercase tracking-wide">
                    Presentación
                  </p>
                  <p className="font-semibold text-slate-900">{product.size}</p>
                </div>
                <div className="bg-slate-100 rounded-lg p-4 text-center">
                  <Box className="w-5 h-5 text-slate-500 mx-auto mb-2" />
                  <p className="text-xs text-slate-500 uppercase tracking-wide">
                    Unidades/Caja
                  </p>
                  <p className="font-semibold text-slate-900">
                    {product.unitsPerBox}
                  </p>
                </div>
                <div className="bg-slate-100 rounded-lg p-4 text-center">
                  <Package className="w-5 h-5 text-slate-500 mx-auto mb-2" />
                  <p className="text-xs text-slate-500 uppercase tracking-wide">
                    Categoría
                  </p>
                  <p className="font-semibold text-slate-900 text-sm">
                    {category?.name}
                  </p>
                </div>
              </div>

              {/* Purchase Mode Toggle */}
              <div className="mb-6">
                <p className="text-sm font-medium text-slate-700 mb-3">
                  Modo de compra
                </p>
                <div className="flex gap-2 p-1 bg-slate-100 rounded-lg w-fit">
                  <button
                    onClick={() => setPurchaseMode("unit")}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all",
                      purchaseMode === "unit"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    <Package className="w-4 h-4" />
                    Por unidad
                  </button>
                  <button
                    onClick={() => setPurchaseMode("box")}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all",
                      purchaseMode === "box"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    <Box className="w-4 h-4" />
                    Por caja ({product.unitsPerBox} unidades)
                  </button>
                </div>
              </div>

              {/* Price */}
              <div className="mb-6">
                <p className="text-sm text-slate-500 mb-1">
                  Precio {purchaseMode === "unit" ? "por unidad" : "por caja"}
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-slate-900">
                    {formatPrice(currentPrice)}
                  </span>
                  {purchaseMode === "box" && (
                    <span className="text-sm text-slate-500">
                      ({formatPrice(Math.round(currentPrice / product.unitsPerBox))} / unidad)
                    </span>
                  )}
                </div>
              </div>

              {/* Quantity Selector */}
              <div className="mb-8">
                <p className="text-sm font-medium text-slate-700 mb-3">
                  Cantidad
                </p>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3 bg-slate-100 rounded-lg p-1">
                    <button
                      onClick={() => adjustQuantity(-1)}
                      disabled={quantity <= 1}
                      className="w-10 h-10 flex items-center justify-center bg-white rounded-md shadow-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-12 text-center font-semibold text-lg">
                      {quantity}
                    </span>
                    <button
                      onClick={() => adjustQuantity(1)}
                      className="w-10 h-10 flex items-center justify-center bg-white rounded-md shadow-sm hover:bg-slate-50 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <span className="text-sm text-slate-500">
                    ={" "}
                    <span className="font-semibold text-slate-900">
                      {purchaseMode === "box"
                        ? quantity * product.unitsPerBox
                        : quantity}{" "}
                      unidades
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {/* Add to Cart Button */}
            <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-slate-200">
              <div className="text-right sm:text-left">
                <p className="text-sm text-slate-500">Total</p>
                <p className="text-2xl font-bold text-slate-900">
                  {formatPrice(totalPrice)}
                </p>
              </div>
              <button
                onClick={handleAddToCart}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold text-white transition-all duration-200",
                  addedToCart
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-blue-600 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/25"
                )}
              >
                {addedToCart ? (
                  <>
                    <Check className="w-5 h-5" />
                    Agregado al carrito
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-5 h-5" />
                    Agregar al carrito
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mt-16">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">
              Productos relacionados
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map((relatedProduct) => (
                <ProductCard key={relatedProduct.sku} product={relatedProduct} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProductDetailPage() {
  const params = useParams();
  const sku = params.sku as string;
  const product = getProductBySku(sku);

  if (!product) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Producto no encontrado
          </h1>
          <p className="text-slate-600 mb-6">
            El producto que buscas no existe o ha sido removido.
          </p>
          <Link
            href="/productos"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Ver todos los productos
          </Link>
        </div>
      </div>
    );
  }

  return <ProductDetail product={product} />;
}
