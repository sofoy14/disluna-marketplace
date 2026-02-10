"use client";

import { useState, useMemo } from "react";
import { useOrders } from "@/context/OrderContext";
import { 
  TrendingUp, 
  ShoppingBag, 
  Users, 
  DollarSign,
  Package,
  MapPin,
  Clock,
  ChevronRight,
  Filter,
  LayoutGrid,
  List,
  Calendar,
  BarChart3,
  Phone,
  Mail,
  Home,
  CheckCircle,
  Clock3,
  Truck,
  XCircle
} from "lucide-react";

// Simple Line Chart Component
function LineChart({ data, width = 600, height = 200 }: { data: { date: string; value: number }[]; width?: number; height?: number }) {
  if (data.length === 0) return <div className="text-gray-400 text-center py-8">Sin datos</div>;
  
  const maxValue = Math.max(...data.map(d => d.value)) || 1;
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

// Bar Chart Component
function BarChart({ data, width = 300, height = 150 }: { data: { label: string; value: number; color?: string }[]; width?: number; height?: number }) {
  if (data.length === 0) return <div className="text-gray-400 text-center py-8">Sin datos</div>;
  
  const maxValue = Math.max(...data.map(d => d.value)) || 1;
  const padding = 10;
  const barWidth = (width - padding * 2) / data.length - 8;
  
  return (
    <svg width={width} height={height} className="overflow-visible">
      {data.map((d, i) => {
        const barHeight = (d.value / maxValue) * (height - 30);
        const x = padding + i * ((width - padding * 2) / data.length) + 4;
        const y = height - barHeight - 20;
        
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
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
  processing: { label: "Procesando", color: "bg-blue-100 text-blue-700", icon: Package },
  shipped: { label: "En camino", color: "bg-purple-100 text-purple-700", icon: Truck },
  delivered: { label: "Entregado", color: "bg-green-100 text-green-700", icon: CheckCircle },
  cancelled: { label: "Cancelado", color: "bg-red-100 text-red-700", icon: XCircle },
};

type ViewMode = "dashboard" | "orders" | "customers" | "products";

export default function DashboardPage() {
  const { 
    orders, 
    stats, 
    ordersByDay, 
    ordersByNeighborhood, 
    topProducts, 
    recentOrders,
    customerFrequency,
    updateOrderStatus 
  } = useOrders();
  
  const [viewMode, setViewMode] = useState<ViewMode>("dashboard");
  const [orderFilter, setOrderFilter] = useState<"all" | "pending" | "processing" | "shipped" | "delivered">("all");

  const filteredOrders = useMemo(() => {
    if (orderFilter === "all") return orders;
    return orders.filter(o => o.status === orderFilter);
  }, [orders, orderFilter]);

  const chartData = useMemo(() => 
    ordersByDay.map(d => ({ date: d.date, value: d.revenue })),
    [ordersByDay]
  );

  const neighborhoodData = useMemo(() => 
    ordersByNeighborhood.slice(0, 6).map(n => ({
      label: n.neighborhood,
      value: n.orders,
      color: "#0EA5E9"
    })),
    [ordersByNeighborhood]
  );

  // KPI Cards
  const KPICard = ({ title, value, icon: Icon, trend, color }: any) => (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-800">{value}</p>
          {trend && (
            <p className={`text-xs mt-1 flex items-center ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              <TrendingUp className={`w-3 h-3 mr-1 ${trend < 0 && 'rotate-180'}`} />
              {trend > 0 ? '+' : ''}{trend}% vs ayer
            </p>
          )}
        </div>
        <div className={`p-3 rounded-xl ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center">
                <LayoutGrid className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">Dashboard DISLUNA</h1>
                <p className="text-xs text-gray-500">Panel de administración</p>
              </div>
            </div>
            
            {/* Navigation */}
            <nav className="flex space-x-1">
              {[
                { id: "dashboard", label: "Resumen", icon: BarChart3 },
                { id: "orders", label: "Pedidos", icon: ShoppingBag },
                { id: "customers", label: "Clientes", icon: Users },
                { id: "products", label: "Productos", icon: Package },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setViewMode(item.id as ViewMode)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    viewMode === item.id 
                      ? "bg-primary text-white" 
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* DASHBOARD VIEW */}
        {viewMode === "dashboard" && (
          <div className="space-y-8">
            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <KPICard 
                title="Ventas Totales" 
                value={formatPrice(stats.totalRevenue)} 
                icon={DollarSign} 
                color="bg-green-500"
                trend={12}
              />
              <KPICard 
                title="Total Pedidos" 
                value={stats.totalOrders.toString()} 
                icon={ShoppingBag} 
                color="bg-primary"
                trend={8}
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Sales Chart */}
              <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
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

            {/* Recent Orders & Top Products */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Orders */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-800">Pedidos Recientes</h3>
                  <button 
                    onClick={() => setViewMode("orders")}
                    className="text-sm text-secondary hover:underline flex items-center"
                  >
                    Ver todos <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-3">
                  {recentOrders.slice(0, 5).map((order) => {
                    const StatusIcon = statusConfig[order.status].icon;
                    return (
                      <div key={order.id} className="flex items-center p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                        <div className={`p-2 rounded-lg ${statusConfig[order.status].color} mr-3`}>
                          <StatusIcon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-800 text-sm">{order.orderNumber}</p>
                          <p className="text-xs text-gray-500 truncate">{order.customerName}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-800 text-sm">{formatPrice(order.total)}</p>
                          <p className="text-xs text-gray-400">{formatDate(order.createdAt)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Top Products */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-6">Productos Más Vendidos</h3>
                <div className="space-y-3">
                  {topProducts.slice(0, 5).map((product, i) => (
                    <div key={product.sku} className="flex items-center">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold mr-3 ${
                        i === 0 ? 'bg-yellow-100 text-yellow-700' :
                        i === 1 ? 'bg-gray-200 text-gray-700' :
                        i === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 text-sm truncate">{product.name}</p>
                        <p className="text-xs text-gray-500">{product.quantity} vendidos</p>
                      </div>
                      <p className="font-semibold text-gray-800 text-sm">{formatPrice(product.revenue)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ORDERS VIEW */}
        {viewMode === "orders" && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-2">
              <Filter className="w-4 h-4 text-gray-400 mr-2" />
              {[
                { id: "all", label: "Todos", count: orders.length },
                { id: "pending", label: "Pendientes", count: orders.filter(o => o.status === "pending").length },
                { id: "processing", label: "Procesando", count: orders.filter(o => o.status === "processing").length },
                { id: "shipped", label: "En camino", count: orders.filter(o => o.status === "shipped").length },
                { id: "delivered", label: "Entregados", count: orders.filter(o => o.status === "delivered").length },
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
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig[order.status].color}`}>
                        {statusConfig[order.status].label}
                      </span>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm">
                        <Users className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-gray-600">{order.customerName}</span>
                        <span className="text-xs text-gray-400 ml-2">(#{order.customerId})</span>
                      </div>
                      <div className="flex items-center text-sm">
                        <Phone className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-gray-600">{order.customerPhone}</span>
                      </div>
                      <div className="flex items-center text-sm">
                        <MapPin className="w-4 h-4 text-gray-400 mr-2" />
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
        )}

        {/* CUSTOMERS VIEW */}
        {viewMode === "customers" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800">Clientes Frecuentes</h3>
                <p className="text-sm text-gray-500">Ordenados por total de compras</p>
              </div>
              <div className="divide-y divide-gray-100">
                {customerFrequency.map((customer, i) => (
                  <div key={customer.customerId} className="p-6 flex items-center hover:bg-gray-50 transition-colors">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg mr-4 ${
                      i === 0 ? 'bg-yellow-100 text-yellow-700' :
                      i === 1 ? 'bg-gray-200 text-gray-700' :
                      i === 2 ? 'bg-orange-100 text-orange-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      #{customer.customerId}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800">{customer.name}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span className="flex items-center">
                          <Phone className="w-3 h-3 mr-1" />
                          {customer.phone}
                        </span>
                        <span className="flex items-center">
                          <ShoppingBag className="w-3 h-3 mr-1" />
                          {customer.orders} pedidos
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-primary">{formatPrice(customer.totalSpent)}</p>
                      <p className="text-xs text-gray-500">Total comprado</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* PRODUCTS VIEW */}
        {viewMode === "products" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {topProducts.map((product, i) => (
                <div key={product.sku} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                      i === 0 ? 'bg-yellow-100 text-yellow-700' :
                      i === 1 ? 'bg-gray-200 text-gray-700' :
                      i === 2 ? 'bg-orange-100 text-orange-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      #{i + 1}
                    </div>
                    <span className="text-xs text-gray-400">{product.sku}</span>
                  </div>
                  <h4 className="font-semibold text-gray-800 mb-4">{product.name}</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-2xl font-bold text-primary">{product.quantity}</p>
                      <p className="text-xs text-gray-500">Unidades vendidas</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-lg font-bold text-green-600">{formatPrice(product.revenue)}</p>
                      <p className="text-xs text-gray-500">Ingresos</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
