/**
 * Storage Indicator Component
 * 
 * Displays storage usage with progress bar and alerts
 */

"use client"

import { useStorageQuota } from "@/lib/hooks/use-storage-quota"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle, HardDrive, Loader2 } from "lucide-react"
import Link from "next/link"

export function StorageIndicator() {
  const { quota, loading, error, canUpload, isNearLimit, isAtLimit } =
    useStorageQuota()

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Cargando...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-xs text-red-500">
        Error cargando información de almacenamiento
      </div>
    )
  }

  if (!quota || !quota.plan.hasStorage) {
    return (
      <div className="text-xs text-gray-500">
        Sin almacenamiento de archivos{" "}
        <Link
          href="/precios"
          className="text-blue-600 hover:underline ml-1"
        >
          Actualizar plan
        </Link>
      </div>
    )
  }

  if (quota.isUnlimited) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600">
        <HardDrive className="w-4 h-4" />
        <span>Almacenamiento ilimitado</span>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-gray-600">
          <HardDrive className="w-4 h-4" />
          <span>{quota.formatted.used}</span>
          <span className="text-gray-400">/</span>
          <span className="text-gray-900 font-medium">
            {quota.formatted.limit}
          </span>
        </div>
        <span className="text-xs text-gray-400">
          {quota.documentsCount} archivo(s)
        </span>
      </div>

      <Progress
        value={quota.usagePercentage}
        className={`h-2 ${
          isAtLimit
            ? "bg-red-100"
            : isNearLimit
              ? "bg-yellow-100"
              : "bg-gray-100"
        }`}
      />

      {isNearLimit && !isAtLimit && (
        <Alert variant="default" className="py-2 border-yellow-200 bg-yellow-50">
          <AlertTriangle className="w-4 h-4 text-yellow-600" />
          <AlertDescription className="text-xs text-yellow-800">
            Estás usando {quota.usagePercentage.toFixed(0)}% de tu
            almacenamiento.
            <Link
              href="/precios"
              className="underline ml-1 font-medium"
            >
              Considera actualizar tu plan
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {isAtLimit && (
        <Alert variant="destructive" className="py-2">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription className="text-xs">
            Has alcanzado tu límite de almacenamiento.
            <Link
              href="/precios"
              className="underline ml-1 font-medium"
            >
              Actualiza tu plan
            </Link>
            {" "}para subir más archivos.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

export function StorageIndicatorCompact() {
  const { quota, loading } = useStorageQuota()

  if (loading || !quota || !quota.plan.hasStorage || quota.isUnlimited) {
    return null
  }

  const percentage = quota.usagePercentage
  const colorClass =
    percentage >= 100
      ? "text-red-600"
      : percentage >= 80
        ? "text-yellow-600"
        : "text-gray-600"

  return (
    <div className={`flex items-center gap-1.5 text-xs ${colorClass}`}>
      <HardDrive className="w-3.5 h-3.5" />
      <span>
        {quota.formatted.used} / {quota.formatted.limit}
      </span>
    </div>
  )
}
