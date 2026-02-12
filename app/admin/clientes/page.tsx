"use client";

import { useMemo } from "react";
import { useOrders } from "@/context/OrderContext";
import {
  Users,
  Phone,
  Mail,
  MapPin,
  ShoppingBag,
  TrendingUp,
} from "lucide-react";

function formatPrice(price: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(price);
}

export default function AdminCustomersPage() {
  const { orders } = useOrders();

  // Calcular estadísticas de clientes
  const customerStats = useMemo(() => {
    const customers = new Map();

    orders.forEach((order) => {
      if (!customers.has(order.customerId)) {
        customers.set(order.customerId, {
          id: order.customerId,
          name: order.customerName,
          phone: order.customerPhone,
          email: order.customerEmail,
          address: order.address,
          neighborhood: order.neighborhood,
          city: order.city,
          orders: [],
          totalSpent: 0,
          totalOrders: 0,
        });
      }

      const customer = customers.get(order.customerId);
      customer.orders.push(order);
      customer.totalSpent += order.total;
      customer.totalOrders += 1;
    });

    return Array.from(customers.values()).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [orders]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Clientes Frecuentes</h1>
        <p className="text-sm text-gray-500">
          {customerStats.length} clientes únicos
        </p>
      </div>

      {/* Customers List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="divide-y divide-gray-100">
          {customerStats.map((customer, index) => (
            <div
              key={customer.id}
              className="p-6 flex items-center hover:bg-gray-50 transition-colors"
            >
              {/* Rank Badge */}
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg mr-4 flex-shrink-0 ${
                  index === 0
                    ? "bg-yellow-100 text-yellow-700"
                    : index === 1
                    ? "bg-gray-200 text-gray-700"
                    : index === 2
                    ? "bg-orange-100 text-orange-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                #{index + 1}
              </div>

              {/* Customer Info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800">{customer.name}</p>
                <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                  <span className="flex items-center">
                    <Phone className="w-3 h-3 mr-1" />
                    {customer.phone}
                  </span>
                  <span className="flex items-center">
                    <MapPin className="w-3 h-3 mr-1" />
                    {customer.neighborhood}
                  </span>
                </div>
              </div>

              {/* Stats */}
              <div className="text-right">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">{customer.totalOrders}</p>
                    <p className="text-xs text-gray-500">
                      {customer.totalOrders === 1 ? "pedido" : "pedidos"}
                    </p>
                  </div>
                </div>
                <p className="text-lg font-bold text-gray-800">{formatPrice(customer.totalSpent)}</p>
                <p className="text-xs text-gray-500">Total gastado</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">Cliente Top</p>
            <div className="p-2 bg-yellow-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-yellow-700" />
            </div>
          </div>
          <p className="text-lg font-bold text-gray-800">
            {customerStats[0]?.name || "N/A"}
          </p>
          <p className="text-sm text-gray-500">
            {formatPrice(customerStats[0]?.totalSpent || 0)} en compras
          </p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">Total Clientes</p>
            <div className="p-2 bg-primary/10 rounded-lg">
              <Users className="w-5 h-5 text-primary" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-800">{customerStats.length}</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">Pedidos Totales</p>
            <div className="p-2 bg-secondary/10 rounded-lg">
              <ShoppingBag className="w-5 h-5 text-secondary" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-800">{orders.length}</p>
        </div>
      </div>
    </div>
  );
}
