import Papa from 'papaparse'

// Funciones para exportar datos

export interface ExportOptions {
  filename?: string
  format?: 'csv' | 'json'
}

export function exportToCSV(data: any[], filename: string = 'export') {
  const csv = Papa.unparse(data)
  
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}.csv`)
  link.style.visibility = 'hidden'
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function exportToJSON(data: any[], filename: string = 'export') {
  const jsonStr = JSON.stringify(data, null, 2)
  
  const blob = new Blob([jsonStr], { type: 'application/json' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}.json`)
  link.style.visibility = 'hidden'
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function downloadData(data: any[], options: ExportOptions = {}) {
  const { filename = 'export', format = 'csv' } = options
  
  if (format === 'csv') {
    exportToCSV(data, filename)
  } else {
    exportToJSON(data, filename)
  }
}

