"use client";

import { useState, useMemo } from "react";
import { useOrders } from "@/context/OrderContext";
import {
  ShoppingBag,
  MapPin,
  Phone,
  User,
  CheckCircle,
  Clock3,
  Truck,
  XCircle,
  Calendar,
} from "lucide-react";

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
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
}

const statusConfig = {
  pending: { label: "Pendiente", color: "bg-amber-100 text-amber-700", icon: Clock3 },
  processing: { label: "Procesando", color: "bg-blue-100 text-blue-700", icon: ShoppingBag },
  shipped: { label: "En camino", color: "bg-purple-100 text-purple-700", icon: Truck },
  delivered: { label: "Entregado", color: "bg-green-100 text-green-700", icon: CheckCircle },
  cancelled: { label: "Cancelado", color: "bg-red-100 text-red-700", icon: XCircle },
};

export default function AdminOrdersPage() {
  const { orders, updateOrderStatus } = useOrders();
  const [orderFilter, setOrderFilter] = useState<"all" | "pending" | "processing" | "shipped" | "delivered">("all");

  const filteredOrders = useMemo(() => {
    if (orderFilter === "all") return orders;
    return orders.filter((o) => o.status === orderFilter);
  }, [orders, orderFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Gestión de Pedidos</h1>
        <p className="text-sm text-gray-500">
          {orders.length} pedidos totales
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center space-x-2 overflow-x-auto">
          {[
            { id: "all", label: "Todos", count: orders.length },
            { id: "pending", label: "Pendientes", count: orders.filter((o) => o.status === "pending").length },
            { id: "processing", label: "Procesando", count: orders.filter((o) => o.status === "processing").length },
            { id: "shipped", label: "En camino", count: orders.filter((o) => o.status === "shipped").length },
            { id: "delivered", label: "Entregados", count: orders.filter((o) => o.status === "delivered").length },
          ].map((filter) => (
            <button
              key={filter.id}
              onClick={() => setOrderFilter(filter.id as any)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                orderFilter === filter.id
                  ? "bg-primary text-white"
                  : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              {filter.label} ({filter.count})
            </button>
          ))}
        </div>
      </div>

      {/* Orders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredOrders.map((order) => {
          const StatusIcon = statusConfig[order.status].icon;
          return (
            <div key={order.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="font-bold text-gray-800">{order.orderNumber}</p>
                  <p className="text-xs text-gray-500">{formatDate(order.createdAt)}</p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${statusConfig[order.status].color}`}
                >
                  {statusConfig[order.status].label}
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center text-sm">
                  <User className="w-4 h-4 text-gray-400 mr-3" />
                  <span className="text-gray-800">{order.customerName}</span>
                  <span className="text-xs text-gray-400 ml-2">(#{order.customerId})</span>
                </div>
                <div className="flex items-center text-sm">
                  <Phone className="w-4 h-4 text-gray-400 mr-3" />
                  <span className="text-gray-600">{order.customerPhone}</span>
                </div>
                <div className="flex items-center text-sm">
                  <MapPin className="w-4 h-4 text-gray-400 mr-3" />
                  <span className="text-gray-600 truncate">{order.neighborhood}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div>
                  <p className="text-xs text-gray-500">{order.items.length} productos</p>
                  <p className="text-lg font-bold text-primary">{formatPrice(order.total)}</p>
                </div>
                <select
                  value={order.status}
                  onChange={(e) => updateOrderStatus(order.id, e.target.value as any)}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="pending">Pendiente</option>
                  <option value="processing">Procesando</option>
                  <option value="shipped">En camino</option>
                  <option value="delivered">Entregado</option>
                  <option value="cancelled">Cancelado</option>
                </select>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
