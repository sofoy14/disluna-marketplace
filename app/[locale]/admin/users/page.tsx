"use client"

import { useEffect, useState } from "react"
import { UserCard } from "@/components/admin/UserCard"
import { SearchBar } from "@/components/admin/SearchBar"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { AdminUser } from "@/types/admin"

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [filteredUsers, setFilteredUsers] = useState<AdminUser[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    // Filtrar usuarios por búsqueda
    if (searchQuery.trim() === "") {
      setFilteredUsers(users)
    } else {
      const filtered = users.filter(user =>
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredUsers(filtered)
    }
  }, [searchQuery, users])

  async function fetchUsers() {
    try {
      const response = await fetch("/api/admin/users")
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
        setFilteredUsers(data)
      }
    } catch (error) {
      console.error("Error fetching users:", error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSuspend(userId: string) {
    try {
      const response = await fetch(`/api/admin/users/${userId}/suspend`, {
        method: "POST"
      })
      if (response.ok) {
        fetchUsers() // Refresh list
      }
    } catch (error) {
      console.error("Error suspending user:", error)
    }
  }

  async function handleDelete(userId: string) {
    if (!confirm("¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer.")) {
      return
    }
    
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE"
      })
      if (response.ok) {
        fetchUsers() // Refresh list
      }
    } catch (error) {
      console.error("Error deleting user:", error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Cargando usuarios...</div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Gestión de Usuarios
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {filteredUsers.length} {filteredUsers.length === 1 ? "usuario" : "usuarios"} total{filteredUsers.length === 1 ? "" : "es"}
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Usuario
        </Button>
      </div>

      <div className="mb-6">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Buscar por email o nombre..."
        />
      </div>

      <div className="space-y-4">
        {filteredUsers.length > 0 ? (
          filteredUsers.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              onSuspend={handleSuspend}
              onDelete={handleDelete}
            />
          ))
        ) : (
          <div className="text-center py-12 text-gray-500">
            {searchQuery ? "No se encontraron usuarios con esa búsqueda" : "No hay usuarios"}
          </div>
        )}
      </div>
    </div>
  )
}

