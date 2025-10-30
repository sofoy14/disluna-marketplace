"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Database, Play, Download } from "lucide-react"
import { ExportButton } from "@/components/admin/ExportButton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface TableSchema {
  name: string
  columns: Array<{
    name: string
    type: string
  }>
}

export default function DatabaseExplorerPage() {
  const [tables, setTables] = useState<TableSchema[]>([])
  const [selectedTable, setSelectedTable] = useState<string>("")
  const [columns, setColumns] = useState<string[]>([])
  const [queryResults, setQueryResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState("SELECT * FROM {table} LIMIT 100")

  useEffect(() => {
    fetchTables()
  }, [])

  useEffect(() => {
    if (selectedTable) {
      const newQuery = query.replace("{table}", selectedTable)
      setQuery(newQuery)
    }
  }, [selectedTable])

  async function fetchTables() {
    try {
      const response = await fetch("/api/admin/database/tables")
      if (response.ok) {
        const data = await response.json()
        setTables(data)
      }
    } catch (error) {
      console.error("Error fetching tables:", error)
    }
  }

  async function executeQuery() {
    if (!selectedTable) {
      alert("Por favor selecciona una tabla")
      return
    }

    setLoading(true)
    try {
      const actualQuery = query.replace("{table}", selectedTable)
      const response = await fetch("/api/admin/database/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: actualQuery }),
      })

      if (response.ok) {
        const data = await response.json()
        setQueryResults(data)
      } else {
        alert("Error al ejecutar la consulta")
      }
    } catch (error) {
      console.error("Error executing query:", error)
      alert("Error al ejecutar la consulta")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Explorador de Base de Datos
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Consulta e inspecciona las tablas de la base de datos
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Database className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <Select value={selectedTable} onValueChange={setSelectedTable}>
            <SelectTrigger className="w-[300px]">
              <SelectValue placeholder="Seleccionar tabla" />
            </SelectTrigger>
            <SelectContent>
              {tables.map((table) => (
                <SelectItem key={table.name} value={table.name}>
                  {table.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Consulta SQL
            </label>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full min-h-[120px] px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-mono text-sm"
              placeholder="SELECT * FROM users LIMIT 100"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={executeQuery} disabled={loading || !selectedTable}>
              <Play className="h-4 w-4 mr-2" />
              {loading ? "Ejecutando..." : "Ejecutar"}
            </Button>
            {queryResults.length > 0 && (
              <ExportButton data={queryResults} filename="database-export" />
            )}
          </div>
        </div>
      </div>

      {queryResults.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Resultados ({queryResults.length} filas)
            </h3>
          </div>
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0">
                <tr>
                  {Object.keys(queryResults[0] || {}).map((key) => (
                    <th
                      key={key}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {queryResults.slice(0, 100).map((row, index) => (
                  <tr key={index}>
                    {Object.values(row).map((cell: any, cellIndex) => (
                      <td
                        key={cellIndex}
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400"
                      >
                        {typeof cell === 'object' 
                          ? JSON.stringify(cell).slice(0, 50) + "..."
                          : String(cell).slice(0, 100)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

