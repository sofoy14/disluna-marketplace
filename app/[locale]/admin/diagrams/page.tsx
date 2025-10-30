"use client"

import { useEffect, useState } from "react"
import { Network, ArrowRight } from "lucide-react"

export default function DiagramsPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Diagramas de Arquitectura
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Visualización de la arquitectura y flujos del sistema
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Diagrama de Autenticación */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Network className="h-5 w-5" />
            Flujo de Autenticación
          </h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="px-4 py-2 bg-blue-100 dark:bg-blue-900 rounded-lg text-sm font-medium">
                Usuario
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400" />
              <div className="px-4 py-2 bg-blue-100 dark:bg-blue-900 rounded-lg text-sm font-medium">
                Login
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400" />
              <div className="px-4 py-2 bg-green-100 dark:bg-green-900 rounded-lg text-sm font-medium">
                Email
              </div>
            </div>
            <div className="flex items-center gap-3 ml-8">
              <ArrowRight className="h-4 w-4 text-gray-400" />
              <div className="px-4 py-2 bg-green-100 dark:bg-green-900 rounded-lg text-sm font-medium">
                Verificación
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400" />
              <div className="px-4 py-2 bg-purple-100 dark:bg-purple-900 rounded-lg text-sm font-medium">
                Dashboard
              </div>
            </div>
          </div>
        </div>

        {/* Diagrama de Chat */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Network className="h-5 w-5" />
            Flujo de Chat con IA
          </h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="px-4 py-2 bg-blue-100 dark:bg-blue-900 rounded-lg text-sm font-medium">
                Usuario
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400" />
              <div className="px-4 py-2 bg-blue-100 dark:bg-blue-900 rounded-lg text-sm font-medium">
                Mensaje
              </div>
            </div>
            <div className="flex items-center gap-3 ml-8">
              <ArrowRight className="h-4 w-4 text-gray-400" />
              <div className="px-4 py-2 bg-green-100 dark:bg-green-900 rounded-lg text-sm font-medium">
                OpenRouter
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400" />
              <div className="px-4 py-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg text-sm font-medium">
                Búsqueda
              </div>
            </div>
            <div className="flex items-center gap-3 ml-16">
              <ArrowRight className="h-4 w-4 text-gray-400" />
              <div className="px-4 py-2 bg-purple-100 dark:bg-purple-900 rounded-lg text-sm font-medium">
                Respuesta
              </div>
            </div>
          </div>
        </div>

        {/* Arquitectura del Sistema */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Network className="h-5 w-5" />
            Arquitectura del Sistema
          </h2>
          <div className="space-y-3">
            <div className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm font-medium">
              Frontend (Next.js)
            </div>
            <div className="flex items-center justify-center">
              <ArrowRight className="h-4 w-4 text-gray-400" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="px-4 py-2 bg-blue-100 dark:bg-blue-900 rounded-lg text-sm text-center">
                Supabase
              </div>
              <div className="px-4 py-2 bg-green-100 dark:bg-green-900 rounded-lg text-sm text-center">
                OpenRouter
              </div>
              <div className="px-4 py-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg text-sm text-center">
                Serper
              </div>
            </div>
            <div className="flex items-center justify-center">
              <ArrowRight className="h-4 w-4 text-gray-400" />
            </div>
            <div className="px-4 py-2 bg-purple-100 dark:bg-purple-900 rounded-lg text-sm font-medium text-center">
              Wompi (Pagos)
            </div>
          </div>
        </div>

        {/* Diagrama de Base de Datos */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Network className="h-5 w-5" />
            Estructura de Datos
          </h2>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="px-4 py-2 bg-blue-100 dark:bg-blue-900 rounded-lg text-sm">
                Users
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400" />
              <div className="px-4 py-2 bg-green-100 dark:bg-green-900 rounded-lg text-sm">
                Profiles
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="px-4 py-2 bg-blue-100 dark:bg-blue-900 rounded-lg text-sm">
                Users
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400" />
              <div className="px-4 py-2 bg-purple-100 dark:bg-purple-900 rounded-lg text-sm">
                Workspaces
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="px-4 py-2 bg-purple-100 dark:bg-purple-900 rounded-lg text-sm">
                Workspaces
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400" />
              <div className="px-4 py-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg text-sm">
                Chats
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="px-4 py-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg text-sm">
                Chats
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400" />
              <div className="px-4 py-2 bg-red-100 dark:bg-red-900 rounded-lg text-sm">
                Messages
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Tabla de Relaciones
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                  Tabla
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                  Relación
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                  Tabla Relacionada
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">users</td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">has one</td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">profiles</td>
              </tr>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">users</td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">has many</td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">workspaces</td>
              </tr>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">workspaces</td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">has many</td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">chats</td>
              </tr>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">chats</td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">has many</td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">messages</td>
              </tr>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">users</td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">has many</td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">subscriptions</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">subscriptions</td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">has many</td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">invoices</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

