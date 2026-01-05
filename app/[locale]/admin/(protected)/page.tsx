"use client"

import { useEffect, useState } from "react"
import { StatsCard } from "@/components/admin/StatsCard"
import { Users, TrendingUp, DollarSign, Activity } from "lucide-react"
import { AdminMetrics } from "@/types/admin"
import { formatBytes } from "@/lib/utils"
import { DataGlobe } from "@/components/admin/data-globe"

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    fetchMetrics()
  }, [])

  async function fetchMetrics() {
    setLoading(true)
    setErrorMsg(null)
    try {
      const response = await fetch("/api/admin/analytics/overview")
      if (response.ok) {
        const data = await response.json()
        setMetrics(data)
      } else {
        const err = await response.json().catch(() => ({}))
        setErrorMsg(err.error || `Error ${response.status}: ${response.statusText}`)
      }
    } catch (error) {
      console.error("Error fetching metrics:", error)
      setErrorMsg("Error de conexión al obtener métricas.")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[500px]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
          <div className="text-gray-400 animate-pulse">Cargando métricas del sistema...</div>
        </div>
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className="flex items-center justify-center h-[500px]">
        <div className="glass-panel border-red-500/20 bg-red-500/5 p-8 rounded-2xl border text-center max-w-md">
          <div className="mx-auto w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
            <Users className="text-red-400 w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Error al cargar</h3>
          <p className="text-gray-400 mb-6">{errorMsg || "No se pudieron cargar las métricas. Verifica tu conexión o permisos."}</p>
          <button
            onClick={fetchMetrics}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors font-medium text-sm"
          >
            Reintentar
          </button>
        </div>
      </div>
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

      <div className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            Mapa de Actividad Global
          </h2>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-purple-500 animate-pulse"></span>
            <span className="text-sm text-gray-400">Actualización en tiempo real</span>
          </div>
        </div>
        <DataGlobe />
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="group bg-gradient-to-br from-white/5 to-white/0 dark:from-white/5 dark:to-white/0 rounded-2xl border border-white/10 p-6 hover:border-white/20 transition-all duration-300">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <span className="bg-blue-500/20 text-blue-400 p-2 rounded-lg mr-3">
              <Activity size={18} />
            </span>
            Consumo del Sistema
          </h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
              <span className="text-gray-400">Total Chats</span>
              <span className="font-mono font-semibold text-white">
                {metrics.total_chats?.toLocaleString() || 0}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
              <span className="text-gray-400">Total Mensajes</span>
              <span className="font-mono font-semibold text-white">
                {metrics.total_messages?.toLocaleString() || 0}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
              <span className="text-gray-400">Total Tokens</span>
              <span className="font-mono font-semibold text-white">
                {metrics.total_tokens?.toLocaleString() || 0}
              </span>
            </div>
          </div>
        </div>

        <div className="group bg-gradient-to-br from-white/5 to-white/0 dark:from-white/5 dark:to-white/0 rounded-2xl border border-white/10 p-6 hover:border-white/20 transition-all duration-300">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <span className="bg-purple-500/20 text-purple-400 p-2 rounded-lg mr-3">
              <Users size={18} />
            </span>
            Almacenamiento
          </h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
              <span className="text-gray-400">Total Almacenamiento</span>
              <span className="font-mono font-semibold text-white">
                {formatBytes(metrics.total_storage || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
              <span className="text-gray-400">Uso Promedio</span>
              <span className="font-mono font-semibold text-white">
                {metrics.total_users > 0 ? formatBytes((metrics.total_storage || 0) / metrics.total_users) : '0 B'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

