"use client"

import { AdminUser } from "@/types/admin"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { MoreVertical, Eye } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

function formatStorage(bytes: number): string {
  if (bytes === 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

interface UserCardProps {
  user: AdminUser
  onSuspend?: (userId: string) => void
  onDelete?: (userId: string) => void
}

export function UserCard({ user, onSuspend, onDelete }: UserCardProps) {
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4 flex-1">
          <Avatar className="h-12 w-12">
            <AvatarImage 
              src={user.profile?.image_url || ""} 
              alt={user.name}
            />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                {user.name}
              </h3>
              <Badge 
                variant={user.is_active ? "default" : "secondary"}
                className="ml-2"
              >
                {user.is_active ? "Activo" : "Inactivo"}
              </Badge>
              {user.subscription && (
                <Badge variant="outline">
                  {user.subscription.status}
                </Badge>
              )}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
              {user.email}
            </p>
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-500">
              <span>
                Registrado: {new Date(user.created_at).toLocaleDateString()}
              </span>
              {user.last_login && (
                <span>
                  Última sesión: {new Date(user.last_login).toLocaleDateString()}
                </span>
              )}
            </div>
            {user.stats && (
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-4 text-xs mb-2">
                  <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                    💬 {user.stats.chats} chats
                  </span>
                  <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                    📁 {user.stats.files} archivos
                  </span>
                  <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                    💾 {formatStorage(user.stats.storage)}
                  </span>
                  <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                    🎯 {user.stats.tokens.toLocaleString()} tokens
                  </span>
                </div>
                {user.stats.storageBreakdown && (
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 dark:text-gray-500">
                    <div>Archivos: {formatStorage(user.stats.storageBreakdown.files)}</div>
                    <div>Contenido: {formatStorage(user.stats.storageBreakdown.fileItems)}</div>
                    <div>Documentos: {formatStorage(user.stats.storageBreakdown.documents)}</div>
                    <div>Embeddings: {formatStorage(user.stats.storageBreakdown.embeddings)}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href={`/admin/users/${user.id}`}>
            <Button variant="ghost" size="sm">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onSuspend?.(user.id)}>
                {user.is_active ? "Suspender" : "Activar"}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onDelete?.(user.id)}
                className="text-red-600"
              >
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}

