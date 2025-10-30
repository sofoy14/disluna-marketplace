"use client"

import { useEffect, useState } from "react"
import { StatsCard } from "@/components/admin/StatsCard"
import { Users, TrendingUp, DollarSign, Activity } from "lucide-react"
import { AdminMetrics } from "@/types/admin"
import { formatBytes } from "@/lib/utils"

export default function AdminDashboard() {
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
        <div className="text-gray-500">Cargando métricas...</div>
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className="text-red-500">Error al cargar las métricas</div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Panel de Administración
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Resumen general del sistema
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Total de Usuarios"
          value={metrics.total_users}
          description={`${metrics.active_users} activos`}
          icon={Users}
          trend={{
            value: metrics.new_users_this_week > 0 
              ? Math.round((metrics.new_users_this_week / metrics.total_users) * 100)
              : 0,
            isPositive: true
          }}
        />
        
        <StatsCard
          title="Usuarios Activos"
          value={metrics.active_users}
          description={`${metrics.inactive_users} inactivos`}
          icon={Activity}
          trend={{
            value: metrics.new_users_today,
            isPositive: true
          }}
        />
        
        <StatsCard
          title="Ingresos Totales"
          value={`$${metrics.total_revenue.toLocaleString()}`}
          description={`$${metrics.revenue_this_month.toLocaleString()} este mes`}
          icon={DollarSign}
          trend={{
            value: metrics.revenue_this_month > 0 ? 15 : 0,
            isPositive: true
          }}
        />
        
        <StatsCard
          title="Suscripciones Activas"
          value={metrics.active_subscriptions}
          description="Planes activos"
          icon={TrendingUp}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Nuevos Usuarios
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Hoy</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {metrics.new_users_today}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Esta semana</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {metrics.new_users_this_week}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Este mes</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {metrics.new_users_this_month}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Suscripciones por Plan
          </h2>
          <div className="space-y-3">
            {metrics.subscriptions_by_plan.length > 0 ? (
              metrics.subscriptions_by_plan.map((plan, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">
                    {plan.plan_name}
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {plan.count}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm">No hay suscripciones activas</p>
            )}
          </div>
        </div>
      </div>

      {/* Sección de consumo agregada */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Consumo del Sistema
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Total Chats</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {metrics.total_chats || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Total Mensajes</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {metrics.total_messages || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Total Archivos</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {metrics.total_files || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Total Tokens</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {metrics.total_tokens?.toLocaleString() || 0}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Almacenamiento
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Total Almacenamiento</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {formatBytes(metrics.total_storage || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Almacenamiento Promedio</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {metrics.total_users > 0 ? formatBytes((metrics.total_storage || 0) / metrics.total_users) : '0 B'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

