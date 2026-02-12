"use client";

import { useMemo } from "react";
import { useOrders } from "@/context/OrderContext";
import {
  TrendingUp,
  ShoppingBag,
  Users,
  DollarSign,
  Package,
  BarChart3,
  ArrowRight,
} from "lucide-react";

function formatPrice(price: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(price);
}

export default function DashboardPage() {
  const {
    orders,
    stats,
    ordersByDay,
    ordersByNeighborhood,
  } = useOrders();

  const chartData = useMemo(() =>
    ordersByDay.map((d) => ({ date: d.date, value: d.revenue })),
    [ordersByDay]
  );

  const neighborhoodData = useMemo(() =>
    ordersByNeighborhood.slice(0, 6).map((n) => ({
      label: n.neighborhood,
      value: n.orders,
      color: "#0EA5E9",
    })),
    [ordersByNeighborhood]
  );

  // KPI Cards
  const KPICard = ({ title, value, icon: Icon, color }: any) => (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-800">{value}</p>
        </div>
        <div className={`p-3 rounded-xl ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );

  // Simple Line Chart Component
  function LineChart({ data, width = 600, height = 200 }: { data: { date: string; value: number }[]; width?: number; height?: number }) {
    if (data.length === 0) return <div className="text-gray-400 text-center py-8">Sin datos</div>;

    const maxValue = Math.max(...data.map((d) => d.value)) || 1;
    const padding = 20;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    const points = data.map((d, i) => ({
      x: padding + (i / (data.length - 1)) * chartWidth,
      y: height - padding - (d.value / maxValue) * chartHeight,
    }));

    const pathD = points.reduce((acc, p, i) =>
      i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`, ""
    );

    const areaD = `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

    return (
      <svg width={width} height={height} className="overflow-visible">
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0EA5E9" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#0EA5E9" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#areaGradient)" />
        <path d={pathD} fill="none" stroke="#0EA5E9" strokeWidth="2" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3" fill="#0EA5E9" />
        ))}
      </svg>
    );
  }

  // Simple Bar Chart Component
  function BarChart({ data, width = 300, height = 150 }: { data: { label: string; value: number; color?: string }[]; width?: number; height?: number }) {
    if (data.length === 0) return <div className="text-gray-400 text-center py-8">Sin datos</div>;

    const maxValue = Math.max(...data.map((d) => d.value)) || 1;
    const padding = 10;
    const barWidth = (width - padding * 2) / data.length - 8;

    return (
      <svg width={width} height={height} className="overflow-visible">
        {data.map((d, i) => {
          const barHeight = (d.value / maxValue) * (height - 30);
          const x = padding + i * ((width - padding * 2) / data.length) + 4;

          return (
            <g key={i}>
              <rect
                x={x}
                y={height - barHeight - 20}
                width={barWidth}
                height={barHeight}
                fill={d.color || "#0EA5E9"}
                rx="4"
              />
              <text
                x={x + barWidth / 2}
                y={height - 5}
                textAnchor="middle"
                fontSize="10"
                fill="#6B7280"
              >
                {d.label.slice(0, 8)}{d.label.length > 8 ? "..." : ""}
              </text>
            </g>
          );
        })}
      </svg>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Dashboard DISLUNA</h1>
        <p className="text-sm text-gray-500">
          Resumen general del negocio
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Ventas Totales"
          value={formatPrice(stats.totalRevenue)}
          icon={DollarSign}
          color="bg-green-500"
        />
        <KPICard
          title="Total Pedidos"
          value={stats.totalOrders.toString()}
          icon={ShoppingBag}
          color="bg-primary"
        />
        <KPICard
          title="Clientes"
          value={stats.totalCustomers.toString()}
          icon={Users}
          color="bg-secondary"
        />
        <KPICard
          title="Ticket Promedio"
          value={formatPrice(stats.averageOrderValue)}
          icon={TrendingUp}
          color="bg-purple-500"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Chart */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Ventas últimos 30 días</h3>
              <p className="text-sm text-gray-500">Ingresos diarios</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-primary">{formatPrice(stats.todayRevenue)}</p>
              <p className="text-xs text-gray-500">Hoy ({stats.todayOrders} pedidos)</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <LineChart data={chartData} width={600} height={200} />
          </div>
        </div>

        {/* Neighborhoods Chart */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Pedidos por Barrio</h3>
          <p className="text-sm text-gray-500 mb-6">Top zonas de entrega</p>
          <BarChart data={neighborhoodData} width={280} height={180} />
          <div className="mt-4 space-y-2">
            {ordersByNeighborhood.slice(0, 3).map((n, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{n.neighborhood}</span>
                <span className="font-medium">{n.orders} pedidos</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <ShoppingBag className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Ver Pedidos</h3>
              <p className="text-sm text-gray-500">Gestionar todos los pedidos</p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-400" />
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-secondary/10 rounded-full">
              <Users className="w-6 h-6 text-secondary" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Ver Clientes</h3>
              <p className="text-sm text-gray-500">Ver clientes frecuentes</p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-400" />
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-purple-500/10 rounded-full">
              <Package className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Gestionar Productos</h3>
              <p className="text-sm text-gray-500">Agregar y editar productos</p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-400" />
        </div>
      </div>
    </div>
  );
}
