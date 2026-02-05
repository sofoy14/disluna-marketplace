"use client";

import { useState, useMemo } from "react";
import { Filter, Search, Package } from "lucide-react";
import { products, getAllCategories } from "@/data/products";
import { ProductCard } from "@/components/ProductCard";
import { categories as categoryStyles } from "@/lib/categories";

export default function ProductosPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState("relevancia");

  const allCategories = getAllCategories();

  const filteredProducts = useMemo(() => {
    let filtered = products;

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter((p) => p.category === selectedCategory);
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.category.toLowerCase().includes(query) ||
          p.sku.toLowerCase().includes(query)
      );
    }

    // Sort
    switch (sortBy) {
      case "precio-menor":
        filtered = [...filtered].sort((a, b) => a.unitPrice - b.unitPrice);
        break;
      case "precio-mayor":
        filtered = [...filtered].sort((a, b) => b.unitPrice - a.unitPrice);
        break;
      case "nombre":
        filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    return filtered;
  }, [selectedCategory, searchQuery, sortBy]);

  return (
    <div className="min-h-screen bg-gray-50 py-8 pt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Nuestros Productos</h1>
          <p className="text-gray-600">Explora nuestra variedad de bebidas para tu negocio</p>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar productos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
              />
            </div>
            <div className="flex gap-4">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent bg-white"
              >
                <option value="relevancia">Ordenar por: Relevancia</option>
                <option value="precio-menor">Precio: Menor a mayor</option>
                <option value="precio-mayor">Precio: Mayor a menor</option>
                <option value="nombre">Nombre</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Filters */}
          <div className="hidden lg:block">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sticky top-24">
              <div className="flex items-center space-x-2 mb-4">
                <Filter className="w-5 h-5 text-gray-500" />
                <h3 className="font-semibold text-gray-800">Categorías</h3>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors text-left ${
                    selectedCategory === null
                      ? "bg-primary text-white"
                      : "hover:bg-gray-50 text-gray-700"
                  }`}
                >
                  <span>Todas</span>
                  <span className={selectedCategory === null ? "text-white/80" : "text-gray-400"}>
                    {products.length}
                  </span>
                </button>

                {allCategories.map((category) => {
                  const count = products.filter((p) => p.category === category).length;
                  const styles = categoryStyles.find((c) => c.id === category);
                  return (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors text-left ${
                        selectedCategory === category
                          ? "bg-primary text-white"
                          : "hover:bg-gray-50 text-gray-700"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {styles?.icon && <span>{styles.icon}</span>}
                        <span className="text-sm">{category}</span>
                      </div>
                      <span
                        className={
                          selectedCategory === category ? "text-white/80" : "text-gray-400"
                        }
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Mobile Category Pills */}
          <div className="lg:hidden overflow-x-auto pb-2 -mx-4 px-4">
            <div className="flex space-x-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`flex items-center space-x-2 px-4 py-2 border rounded-full whitespace-nowrap transition-colors ${
                  selectedCategory === null
                    ? "bg-primary text-white border-primary"
                    : "bg-white border-gray-200 hover:border-secondary"
                }`}
              >
                <span className="text-sm">Todas</span>
              </button>
              {allCategories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`flex items-center space-x-2 px-4 py-2 border rounded-full whitespace-nowrap transition-colors ${
                    selectedCategory === category
                      ? "bg-primary text-white border-primary"
                      : "bg-white border-gray-200 hover:border-secondary"
                  }`}
                >
                  <span className="text-sm">{category}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Products Grid */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-4">
              <p className="text-gray-600">
                Mostrando{" "}
                <span className="font-medium text-gray-800">{filteredProducts.length}</span>{" "}
                productos
              </p>
              {selectedCategory && (
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="text-sm text-secondary hover:text-primary"
                >
                  Limpiar filtros
                </button>
              )}
            </div>

            {filteredProducts.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl">
                <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  No se encontraron productos
                </h3>
                <p className="text-gray-500">Intenta con otros términos de búsqueda</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.sku} product={product} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
