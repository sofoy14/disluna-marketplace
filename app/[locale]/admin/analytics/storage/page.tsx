"use client"

import { useEffect, useState } from "react"
import { Database, TrendingDown, HardDrive } from "lucide-react"
import { ExportButton } from "@/components/admin/ExportButton"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"

interface StorageData {
  user_id: string
  email: string
  name: string
  storage: {
    files: number
    file_items: number
    documents: number
    embeddings: number
    total: number
  }
  fileCount: number
  fileItemCount: number
  documentCount: number
  created_at: string
}

interface StorageStats {
  totalUsers: number
  totalStorage: number
  averageStorage: number
  byUser: StorageData[]
}

function formatStorage(bytes: number): string {
  if (bytes === 0) return '0 B'
  if (bytes < 1024) return `${bytes.toFixed(2)} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

export default function StorageMonitoringPage() {
  const [data, setData] = useState<StorageStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      setLoading(true)
      const response = await fetch("/api/admin/analytics/storage")
      if (response.ok) {
        const json = await response.json()
        setData(json)
      }
    } catch (error) {
      console.error("Error fetching storage data:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Cargando datos de storage...</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-red-500">Error al cargar los datos de storage</div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Monitoreo de Storage
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Consumo de almacenamiento por usuario
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
          {data.byUser && (
            <ExportButton 
              data={data.byUser.map(u => ({
                email: u.email,
                name: u.name,
                total: formatStorage(u.storage.total),
                files: formatStorage(u.storage.files),
                content: formatStorage(u.storage.file_items),
                documents: formatStorage(u.storage.documents),
                embeddings: formatStorage(u.storage.embeddings),
                created_at: u.created_at
              }))} 
              filename="storage-report"
            />
          )}
        </div>
      </div>

      {/* Resumen general */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-2">
            <HardDrive className="h-6 w-6 text-blue-600" />
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Almacenamiento Total
            </h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {formatStorage(data.totalStorage)}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-2">
            <Database className="h-6 w-6 text-green-600" />
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Usuarios Activos
            </h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {data.totalUsers}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-2">
            <TrendingDown className="h-6 w-6 text-purple-600" />
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Promedio por Usuario
            </h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {formatStorage(data.averageStorage)}
          </p>
        </div>
      </div>

      {/* Tabla de storage por usuario */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Consumo por Usuario
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Archivos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Contenido
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Documentos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Embeddings
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Archivos #
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {data.byUser.map((user, index) => (
                <tr key={user.user_id} className={index % 2 === 0 ? 'bg-gray-50 dark:bg-gray-800' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {user.name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {user.email}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {formatStorage(user.storage.total)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {formatStorage(user.storage.files)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {formatStorage(user.storage.file_items)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {formatStorage(user.storage.documents)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {formatStorage(user.storage.embeddings)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {user.fileCount} archivos
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

