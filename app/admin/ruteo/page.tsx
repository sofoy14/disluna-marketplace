"use client";

import { useState, useMemo } from "react";
import { useOrders } from "@/context/OrderContext";
import { useProducts } from "@/context/ProductContext";
import {
  Calendar,
  Package,
  MapPin,
  User,
  CheckCircle,
  Circle,
  Truck,
  ChevronDown,
  ChevronUp,
  Filter,
  Download,
  Printer,
} from "lucide-react";
import type { Order, OrderItem } from "@/context/OrderContext";

function formatPrice(price: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(price);
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("es-CO", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

interface ConsolidatedProduct {
  sku: string;
  name: string;
  image?: string;
  totalUnits: number;
  totalBoxes: number;
  customersCount: number;
  loaded: boolean;
  items: {
    orderId: string;
    orderNumber: string;
    customerName: string;
    quantity: number;
    type: "unit" | "box";
    unitsPerBox?: number;
  }[];
}

export default function RuteoPage() {
  const { orders } = useOrders();
  const { getProductBySku } = useProducts();

  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [showDetails, setShowDetails] = useState(false);
  const [loadedProducts, setLoadedProducts] = useState<Set<string>>(new Set());

  // Obtener fecha más reciente y más antigua
  const dateRange = useMemo(() => {
    if (orders.length === 0) return null;
    const dates = orders.map((o) => o.createdAt.split("T")[0]);
    return {
      min: dates.sort()[0],
      max: dates.reverse()[0],
    };
  }, [orders]);

  // Filtrar pedidos por fecha seleccionada
  const ordersForDate = useMemo(() => {
    return orders.filter((order) => {
      return order.createdAt.startsWith(selectedDate) && order.status !== "cancelled";
    });
  }, [orders, selectedDate]);

  // Consolidar productos
  const consolidatedProducts = useMemo(() => {
    const productMap = new Map<string, ConsolidatedProduct>();

    ordersForDate.forEach((order) => {
      order.items.forEach((item) => {
        const existing = productMap.get(item.sku);

        if (existing) {
          // Sumar cantidades
          const totalUnitsInThisOrder =
            item.type === "box" && item.unitsPerBox
              ? item.quantity * item.unitsPerBox
              : item.quantity;

          existing.totalUnits += totalUnitsInThisOrder;
          existing.totalBoxes += item.type === "box" ? item.quantity : 0;
          existing.customersCount += 1;
          existing.items.push({
            orderId: order.id,
            orderNumber: order.orderNumber,
            customerName: order.customerName,
            quantity: item.quantity,
            type: item.type,
            unitsPerBox: item.unitsPerBox,
          });
        } else {
          // Nuevo producto
          const totalUnits =
            item.type === "box" && item.unitsPerBox
              ? item.quantity * item.unitsPerBox
              : item.quantity;

          productMap.set(item.sku, {
            sku: item.sku,
            name: item.name,
            image: item.image,
            totalUnits,
            totalBoxes: item.type === "box" ? item.quantity : 0,
            customersCount: 1,
            loaded: loadedProducts.has(item.sku),
            items: [
              {
                orderId: order.id,
                orderNumber: order.orderNumber,
                customerName: order.customerName,
                quantity: item.quantity,
                type: item.type,
                unitsPerBox: item.unitsPerBox,
              },
            ],
          });
        }
      });
    });

    return Array.from(productMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [ordersForDate, loadedProducts]);

  // Clientes únicos para el día
  const customersForDate = useMemo(() => {
    const customersMap = new Map();
    ordersForDate.forEach((order) => {
      if (!customersMap.has(order.customerId)) {
        customersMap.set(order.customerId, {
          id: order.customerId,
          name: order.customerName,
          phone: order.customerPhone,
          address: order.address,
          neighborhood: order.neighborhood,
          orderCount: 0,
          total: 0,
        });
      }
      const customer = customersMap.get(order.customerId);
      customer.orderCount += 1;
      customer.total += order.total;
    });
    return Array.from(customersMap.values());
  }, [ordersForDate]);

  // Estadísticas
  const stats = useMemo(() => {
    return {
      totalProducts: consolidatedProducts.length,
      totalUnits: consolidatedProducts.reduce((sum, p) => sum + p.totalUnits, 0),
      totalBoxes: consolidatedProducts.reduce((sum, p) => sum + p.totalBoxes, 0),
      totalCustomers: customersForDate.length,
      totalRevenue: ordersForDate.reduce((sum, o) => sum + o.total, 0),
      loadedCount: consolidatedProducts.filter((p) => p.loaded).length,
    };
  }, [consolidatedProducts, customersForDate, ordersForDate]);

  const toggleProductLoaded = (sku: string) => {
    setLoadedProducts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sku)) {
        newSet.delete(sku);
      } else {
        newSet.add(sku);
      }
      return newSet;
    });
  };

  const markAllAsLoaded = () => {
    const allSkus = consolidatedProducts.map((p) => p.sku);
    setLoadedProducts(new Set(allSkus));
  };

  const clearLoaded = () => {
    setLoadedProducts(new Set());
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Ruta del Día</h1>
        <p className="text-sm text-gray-500">
          Planificación de surtido consolidado para entregas
        </p>
      </div>

      {/* Date Selector */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Seleccionar Fecha de Entrega
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={dateRange?.min}
                max={dateRange?.max}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex items-end space-x-2">
            <button
              onClick={() => {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                setSelectedDate(yesterday.toISOString().split("T")[0]);
              }}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Día anterior
            </button>
            <button
              onClick={() => {
                setSelectedDate(new Date().toISOString().split("T")[0]);
              }}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              Hoy
            </button>
          </div>
        </div>
      </div>

      {/* No orders for date */}
      {ordersForDate.length === 0 ? (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-100 text-center">
          <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            No hay pedidos para esta fecha
          </h3>
          <p className="text-gray-500">
            Selecciona otro día o espera nuevos pedidos
          </p>
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Productos</p>
                  <p className="text-2xl font-bold text-gray-800">{stats.totalProducts}</p>
                </div>
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Package className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Unidades</p>
                  <p className="text-2xl font-bold text-gray-800">{stats.totalUnits}</p>
                </div>
                <div className="p-2 bg-green-50 rounded-lg">
                  <Package className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Clientes</p>
                  <p className="text-2xl font-bold text-gray-800">{stats.totalCustomers}</p>
                </div>
                <div className="p-2 bg-purple-50 rounded-lg">
                  <User className="w-5 h-5 text-purple-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Ingresos</p>
                  <p className="text-lg font-bold text-gray-800">{formatPrice(stats.totalRevenue)}</p>
                </div>
                <div className="p-2 bg-amber-50 rounded-lg">
                  <Truck className="w-5 h-5 text-amber-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Progress de surtido */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-800">Progreso de Surtido</h3>
                <p className="text-xs text-gray-500">
                  {stats.loadedCount} de {stats.totalProducts} productos cargados
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={markAllAsLoaded}
                  className="text-xs px-3 py-1.5 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                >
                  Marcar todos
                </button>
                <button
                  onClick={clearLoaded}
                  className="text-xs px-3 py-1.5 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Limpiar
                </button>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${stats.totalProducts > 0 ? (stats.loadedCount / stats.totalProducts) * 100 : 0}%`,
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Lista Consolidada de Productos */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-800">
                  📦 Productos a Cargar
                </h2>
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  {showDetails ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
              </div>

              <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
                {consolidatedProducts.map((product) => (
                  <div
                    key={product.sku}
                    className={`p-4 hover:bg-gray-50 transition-colors ${
                      product.loaded ? "bg-green-50/50" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        {/* Checkbox */}
                        <button
                          onClick={() => toggleProductLoaded(product.sku)}
                          className={`mt-1 flex-shrink-0 ${
                            product.loaded ? "text-green-600" : "text-gray-300 hover:text-green-500"
                          } transition-colors`}
                        >
                          {product.loaded ? (
                            <CheckCircle className="w-5 h-5" />
                          ) : (
                            <Circle className="w-5 h-5" />
                          )}
                        </button>

                        {/* Imagen */}
                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {product.image ? (
                            <img
                              src={product.image}
                              alt={product.name}
                              className="object-cover w-full h-full"
                            />
                          ) : (
                            <Package className="w-6 h-6 text-gray-400" />
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-800 text-sm">{product.name}</p>
                          <div className="flex items-center space-x-3 mt-1 text-xs text-gray-500">
                            <span className="flex items-center">
                              <Package className="w-3 h-3 mr-1" />
                              <strong className="text-gray-700">{product.totalUnits}</strong> unid
                            </span>
                            {product.totalBoxes > 0 && (
                              <span className="flex items-center">
                                <Package className="w-3 h-3 mr-1" />
                                <strong className="text-gray-700">{product.totalBoxes}</strong> cajas
                              </span>
                            )}
                            <span className="flex items-center">
                              <User className="w-3 h-3 mr-1" />
                              {product.customersCount} cliente{product.customersCount > 1 ? "s" : ""}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Detalles expandidos */}
                    {showDetails && (
                      <div className="mt-3 pl-8 border-t border-gray-100 pt-3">
                        <p className="text-xs text-gray-500 mb-2">Pedidos incluidos:</p>
                        <div className="space-y-1">
                          {product.items.map((item, idx) => (
                            <div
                              key={`${item.orderId}-${idx}`}
                              className="text-xs bg-gray-50 rounded px-2 py-1 flex items-center justify-between"
                            >
                              <span>
                                <strong>{item.orderNumber}</strong> - {item.customerName}
                              </span>
                              <span className="text-gray-600">
                                {item.quantity} {item.type === "box" ? "cajas" : "unid"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Lista de Clientes */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-800">
                  📍 Clientes a Visitar
                </h2>
              </div>

              <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
                {customersForDate.map((customer, index) => (
                  <div key={customer.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start space-x-3">
                      {/* Número de ruta */}
                      <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-white">{index + 1}</span>
                      </div>

                      {/* Info del cliente */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 text-sm">{customer.name}</p>
                        <div className="mt-1 space-y-1">
                          <div className="flex items-start text-xs text-gray-500">
                            <MapPin className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" />
                            <span>{customer.address}, {customer.neighborhood}</span>
                          </div>
                          <div className="flex items-center space-x-3 text-xs text-gray-500">
                            <span>{customer.phone}</span>
                            <span>•</span>
                            <span>{customer.orderCount} pedido{customer.orderCount > 1 ? "s" : ""}</span>
                            <span>•</span>
                            <span className="font-medium text-gray-700">{formatPrice(customer.total)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex items-center justify-end space-x-4">
            <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
              <Printer className="w-4 h-4" />
              <span>Imprimir lista</span>
            </button>
            <button className="flex items-center space-x-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
              <Download className="w-4 h-4" />
              <span>Exportar ruta</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
