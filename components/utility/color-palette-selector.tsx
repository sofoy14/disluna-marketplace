"use client"

import React from 'react'
import { Palette, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ColorPalette {
  id: string
  name: string
  colors: {
    primary: string
    primaryLight: string
    primaryDark: string
    gradientFrom: string
    gradientTo: string
  }
}

const colorPalettes: ColorPalette[] = [
  {
    id: 'purple',
    name: 'Morado',
    colors: {
      primary: '#8b5cf6',
      primaryLight: '#a78bfa',
      primaryDark: '#7c3aed',
      gradientFrom: '#8b5cf6',
      gradientTo: '#6d28d9'
    }
  },
  {
    id: 'blue',
    name: 'Azul',
    colors: {
      primary: '#3b82f6',
      primaryLight: '#60a5fa',
      primaryDark: '#2563eb',
      gradientFrom: '#3b82f6',
      gradientTo: '#1e40af'
    }
  },
  {
    id: 'green',
    name: 'Verde',
    colors: {
      primary: '#10b981',
      primaryLight: '#34d399',
      primaryDark: '#059669',
      gradientFrom: '#10b981',
      gradientTo: '#047857'
    }
  },
  {
    id: 'red',
    name: 'Rojo',
    colors: {
      primary: '#ef4444',
      primaryLight: '#f87171',
      primaryDark: '#dc2626',
      gradientFrom: '#ef4444',
      gradientTo: '#b91c1c'
    }
  },
  {
    id: 'orange',
    name: 'Naranja',
    colors: {
      primary: '#f97316',
      primaryLight: '#fb923c',
      primaryDark: '#ea580c',
      gradientFrom: '#f97316',
      gradientTo: '#c2410c'
    }
  },
  {
    id: 'teal',
    name: 'Verde Azulado',
    colors: {
      primary: '#14b8a6',
      primaryLight: '#2dd4bf',
      primaryDark: '#0d9488',
      gradientFrom: '#14b8a6',
      gradientTo: '#0f766e'
    }
  },
  {
    id: 'yellow',
    name: 'Amarillo',
    colors: {
      primary: '#eab308',
      primaryLight: '#facc15',
      primaryDark: '#ca8a04',
      gradientFrom: '#eab308',
      gradientTo: '#a16207'
    }
  }
]

interface ColorPaletteSelectorProps {
  selectedPalette: string
  onPaletteChange: (paletteId: string) => void
}

export function ColorPaletteSelector({ selectedPalette, onPaletteChange }: ColorPaletteSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Palette className="h-4 w-4" />
        <span>Paleta de Colores</span>
      </div>
      
      {/* Grid responsiva que evita cortes en móvil */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3">
        {colorPalettes.map((palette) => {
          const isSelected = selectedPalette === palette.id
          
          return (
            <button
              key={palette.id}
              onClick={() => onPaletteChange(palette.id)}
              className={cn(
                "relative group flex flex-col items-center gap-1.5 sm:gap-2 p-2 sm:p-3 rounded-lg border-2 transition-all min-w-0",
                isSelected 
                  ? "border-primary bg-primary/10" 
                  : "border-muted hover:border-primary/50 hover:bg-muted/50"
              )}
            >
              <div 
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg relative overflow-hidden flex-shrink-0"
                style={{ 
                  background: `linear-gradient(135deg, ${palette.colors.primary} 0%, ${palette.colors.primaryDark} 100%)`
                }}
              >
                {isSelected && (
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                    <Check className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                )}
              </div>
              <span className="text-[11px] sm:text-xs font-medium text-center capitalize truncate w-full">{palette.name}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export { colorPalettes }
export type { ColorPalette }





