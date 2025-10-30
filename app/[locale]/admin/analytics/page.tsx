"use client"

import { useEffect, useState } from "react"
import { StatsCard } from "@/components/admin/StatsCard"
import { Users, TrendingUp, DollarSign, FileText } from "lucide-react"
import { AdminMetrics } from "@/types/admin"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts"

export default function AnalyticsPage() {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMetrics()
  }, [])

  async function fetchMetrics() {
    try {
      const response = await fetch("/api/admin/analytics/overview")
      if (response.ok) {
        const data = await response.json()
        setMetrics(data)
      }
    } catch (error) {
      console.error("Error fetching metrics:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Cargando analytics...</div>
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className="text-red-500">Error al cargar las métricas</div>
    )
  }

  // Mock data for charts - En producción esto vendría de la API
  const userGrowthData = [
    { name: "Ene", usuarios: 12 },
    { name: "Feb", usuarios: 19 },
    { name: "Mar", usuarios: 15 },
    { name: "Abr", usuarios: 25 },
    { name: "May", usuarios: 30 },
    { name: "Jun", usuarios: metrics.total_users }
  ]

  const subscriptionData = metrics.subscriptions_by_plan.map(plan => ({
    name: plan.plan_name,
    suscripciones: plan.count
  }))

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Analytics
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Métricas y análisis detallados del sistema
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Total Usuarios"
          value={metrics.total_users}
          icon={Users}
        />
        <StatsCard
          title="Suscripciones Activas"
          value={metrics.active_subscriptions}
          icon={TrendingUp}
        />
        <StatsCard
          title="Ingresos Totales"
          value={`$${metrics.total_revenue.toLocaleString()}`}
          icon={DollarSign}
        />
        <StatsCard
          title="Nuevos Usuarios"
          value={metrics.new_users_this_month}
          description="Este mes"
          icon={FileText}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Crecimiento de Usuarios
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={userGrowthData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="usuarios" 
                stroke="#8884d8" 
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Distribución de Planes
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={subscriptionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="suscripciones" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
            Nuevos Usuarios
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Hoy</span>
              <span className="font-semibold">{metrics.new_users_today}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Esta semana</span>
              <span className="font-semibold">{metrics.new_users_this_week}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Este mes</span>
              <span className="font-semibold">{metrics.new_users_this_month}</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
            Estado de Usuarios
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Activos</span>
              <span className="font-semibold text-green-600">{metrics.active_users}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Inactivos</span>
              <span className="font-semibold text-red-600">{metrics.inactive_users}</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
            Ingresos
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Total</span>
              <span className="font-semibold">${metrics.total_revenue.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Este mes</span>
              <span className="font-semibold">${metrics.revenue_this_month.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

