"use client";

import { useState, useMemo } from "react";
import { useProducts } from "@/context/ProductContext";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Package,
  Image as ImageIcon,
  DollarSign,
  Box,
  Save,
  X,
  Filter,
  Upload,
  Loader2,
} from "lucide-react";
import Image from "next/image";
import type { Product } from "@/context/ProductContext";

function formatPrice(price: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(price);
}

type ViewMode = "list" | "add" | "edit";

export default function AdminProductsPage() {
  const {
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    categories,
  } = useProducts();

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Form state
  const [formData, setFormData] = useState<Partial<Product>>({
    name: "",
    category: "",
    size: "",
    unitPrice: 0,
    boxPrice: 0,
    unitsPerBox: 1,
    image: "",
    description: "",
  });

  // Upload state
  const [uploading, setUploading] = useState(false);

  // Filter and search products
  const filteredProducts = useMemo(() => {
    let filtered = products;

    // Filter by category
    if (categoryFilter !== "all") {
      filtered = filtered.filter((p) => p.category === categoryFilter);
    }

    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.sku.includes(query) ||
          p.category.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [products, categoryFilter, searchQuery]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, currentPage]);

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setFormData(product);
    setViewMode("edit");
  };

  const handleDelete = (sku: string) => {
    if (confirm("¿Estás seguro de eliminar este producto?")) {
      deleteProduct(sku);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validaciones
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      alert("Tipo de archivo no permitido. Usa JPG, PNG o WebP");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("El archivo es demasiado grande. Máximo 5MB");
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al subir imagen");
      }

      const result = await response.json();
      setFormData({ ...formData, image: result.url });
    } catch (error) {
      console.error("Error al subir imagen:", error);
      alert("Error al subir la imagen. Por favor intenta de nuevo.");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (viewMode === "add") {
      if (formData.name && formData.category && formData.unitPrice && formData.boxPrice) {
        addProduct(formData as Omit<Product, "sku">);
        setViewMode("list");
        resetForm();
      }
    } else if (viewMode === "edit" && selectedProduct) {
      updateProduct(selectedProduct.sku, formData);
      setViewMode("list");
      resetForm();
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      category: "",
      size: "",
      unitPrice: 0,
      boxPrice: 0,
      unitsPerBox: 1,
      image: "",
      description: "",
    });
    setSelectedProduct(null);
    setUploading(false);
  };

  const handleCancel = () => {
    setViewMode("list");
    resetForm();
  };

  // LIST VIEW
  if (viewMode === "list") {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Gestión de Productos</h1>
            <p className="text-sm text-gray-500">
              {products.length} productos en el catálogo
            </p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setViewMode("add");
            }}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar Producto</span>
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, SKU o categoría..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div className="sm:w-64">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={categoryFilter}
                  onChange={(e) => {
                    setCategoryFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent appearance-none bg-white"
                >
                  <option value="all">Todas las categorías</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Producto</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">SKU</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Categoría</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">P. Unitario</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">P. Caja</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Unid/Caja</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedProducts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                      <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>No se encontraron productos</p>
                    </td>
                  </tr>
                ) : (
                  paginatedProducts.map((product) => (
                    <tr key={product.sku} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                            {product.image ? (
                              <Image
                                src={product.image}
                                alt={product.name}
                                width={48}
                                height={48}
                                className="object-cover w-full h-full"
                              />
                            ) : (
                              <Package className="w-6 h-6 text-gray-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-800 text-sm truncate">{product.name}</p>
                            {product.size && (
                              <p className="text-xs text-gray-500">{product.size}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 font-mono">{product.sku}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{product.category}</td>
                      <td className="px-4 py-3 text-sm text-gray-800 text-right font-medium">
                        {formatPrice(product.unitPrice)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-800 text-right font-medium">
                        {formatPrice(product.boxPrice)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 text-center">
                        {product.unitsPerBox}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => handleEdit(product)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(product.sku)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Mostrando {(currentPage - 1) * itemsPerPage + 1} -{" "}
                {Math.min(currentPage * itemsPerPage, filteredProducts.length)} de{" "}
                {filteredProducts.length} productos
              </p>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Anterior
                </button>
                <span className="text-sm text-gray-600">
                  Página {currentPage} de {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ADD/EDIT FORM VIEW
  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={handleCancel}
          className="inline-flex items-center text-gray-600 hover:text-gray-800 transition-colors"
        >
          <X className="w-4 h-4 mr-2" />
          {viewMode === "add" ? "Cancelar" : "Volver"}
        </button>
        <h1 className="text-2xl font-bold text-gray-800 mt-4">
          {viewMode === "add" ? "Agregar Nuevo Producto" : "Editar Producto"}
        </h1>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Name */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre del Producto <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Ej: Coca-Cola 350ml"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Categoría <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              list="categories"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value.toUpperCase() })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Ej: GASEOSAS"
            />
            <datalist id="categories">
              {categories.map((cat) => (
                <option key={cat} value={cat} />
              ))}
            </datalist>
          </div>

          {/* Size */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tamaño
            </label>
            <input
              type="text"
              value={formData.size}
              onChange={(e) => setFormData({ ...formData, size: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Ej: 350ml"
            />
          </div>

          {/* Unit Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Precio Unitario <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="number"
                required
                min="0"
                value={formData.unitPrice}
                onChange={(e) => setFormData({ ...formData, unitPrice: Number(e.target.value) })}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="0"
              />
            </div>
          </div>

          {/* Box Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Precio por Caja <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="number"
                required
                min="0"
                value={formData.boxPrice}
                onChange={(e) => setFormData({ ...formData, boxPrice: Number(e.target.value) })}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="0"
              />
            </div>
          </div>

          {/* Units per Box */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Unidades por Caja <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Box className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="number"
                required
                min="1"
                value={formData.unitsPerBox}
                onChange={(e) => setFormData({ ...formData, unitsPerBox: Number(e.target.value) })}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="1"
              />
            </div>
          </div>

          {/* Image Upload */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Imagen del Producto
            </label>

            <div className="space-y-3">
              {/* Upload Button */}
              <div className="flex items-center gap-3">
                <label className="flex-1 flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary hover:bg-primary/5 transition-all">
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleImageUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                  <Upload className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-600">
                    {uploading ? "Subiendo imagen..." : "Click para subir imagen (JPG, PNG, WebP - Max 5MB)"}
                  </span>
                </label>
                {uploading && (
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                )}
              </div>

              {/* OR separator */}
              <div className="flex items-center">
                <div className="flex-1 h-px bg-gray-300"></div>
                <span className="px-3 text-xs text-gray-500">O</span>
                <div className="flex-1 h-px bg-gray-300"></div>
              </div>

              {/* URL Input */}
              <div className="flex-1">
                <input
                  type="text"
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="O pega la URL de la imagen"
                />
              </div>
            </div>

            {/* Preview */}
            {formData.image && (
              <div className="mt-3 flex items-center space-x-4">
                <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden">
                  <Image
                    src={formData.image}
                    alt="Preview"
                    width={80}
                    height={80}
                    className="object-cover w-full h-full"
                  />
                </div>
                <span className="text-sm text-gray-500">Vista previa</span>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descripción
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Descripción breve del producto..."
            />
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center justify-end space-x-4">
          <button
            type="button"
            onClick={handleCancel}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={uploading}
            className="inline-flex items-center space-x-2 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            <span>{viewMode === "add" ? "Guardar Producto" : "Actualizar Producto"}</span>
          </button>
        </div>
      </form>

      {selectedProduct && (
        <div className="mt-4 p-4 bg-blue-50 rounded-lg text-sm text-blue-800">
          <strong>SKU:</strong> {selectedProduct.sku}
        </div>
      )}
    </div>
  );
}
