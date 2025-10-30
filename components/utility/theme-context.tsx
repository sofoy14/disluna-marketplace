"use client"

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { useTheme as useNextTheme } from 'next-themes'
import { Tables } from '@/supabase/types'

interface ThemePreferences {
  themeMode: 'dark' | 'light'
  customPrimaryColor: string
  selectedPalette: string
}

interface ThemeContextType {
  themePreferences: ThemePreferences
  setThemePreferences: (prefs: Partial<ThemePreferences>) => void
  applyCustomColors: (color: string) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function useThemePreferences() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useThemePreferences must be used within ThemePreferencesProvider')
  }
  return context
}

interface ThemePreferencesProviderProps {
  children: ReactNode
  profile: Tables<"profiles"> | null
}

export function ThemePreferencesProvider({ children, profile }: ThemePreferencesProviderProps) {
  const { setTheme, theme } = useNextTheme()
  const [themePreferences, setThemePreferencesState] = useState<ThemePreferences>({
    themeMode: (profile?.theme_mode as 'dark' | 'light') || 'dark',
    customPrimaryColor: profile?.custom_primary_color || '#8b5cf6',
    selectedPalette: profile?.selected_palette || 'purple'
  })

  // Aplicar colores personalizados
  const applyCustomColors = useCallback((color: string) => {
    if (typeof window === 'undefined') return

    // Convertir hex a HSL
    const hexToHsl = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16) / 255
      const g = parseInt(hex.slice(3, 5), 16) / 255
      const b = parseInt(hex.slice(5, 7), 16) / 255

      const max = Math.max(r, g, b)
      const min = Math.min(r, g, b)
      let h = 0
      let s = 0
      const l = (max + min) / 2

      if (max !== min) {
        const d = max - min
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
        switch (max) {
          case r:
            h = ((g - b) / d + (g < b ? 6 : 0)) / 6
            break
          case g:
            h = ((b - r) / d + 2) / 6
            break
          case b:
            h = ((r - g) / d + 4) / 6
            break
        }
      }

      return {
        h: Math.round(h * 360),
        s: Math.round(s * 100),
        l: Math.round(l * 100)
      }
    }

    const { h, s, l } = hexToHsl(color)
    
    // Aplicar variables CSS dinámicas
    const root = document.documentElement
    
    // Esta es la clave: actualizar --primary directamente con HSL
    // y también --primary-foreground (color del texto sobre el primario)
    root.style.setProperty('--primary', `${h} ${s}% ${l}%`)
    
    // Color de texto sobre primary (blanco o negro según luminosidad)
    const foregroundL = l > 50 ? 0 : 100
    root.style.setProperty('--primary-foreground', `0 0% ${foregroundL}%`)
    
    // También guardar las variables auxiliares
    root.style.setProperty('--custom-primary-hue', h.toString())
    root.style.setProperty('--custom-primary-saturation', `${s}%`)
    root.style.setProperty('--custom-primary-lightness', `${l}%`)
    root.style.setProperty('--custom-primary-color', color)
  }, [])

  // Sincronizar con el perfil
  useEffect(() => {
    if (profile) {
      const newPrefs = {
        themeMode: (profile.theme_mode as 'dark' | 'light') || 'dark',
        customPrimaryColor: profile.custom_primary_color || '#8b5cf6',
        selectedPalette: profile.selected_palette || 'purple'
      }
      setThemePreferencesState(newPrefs)
      
      // Aplicar tema
      if (profile.theme_mode) {
        setTheme(profile.theme_mode)
      }
      
      // Aplicar color personalizado
      applyCustomColors(newPrefs.customPrimaryColor)
    }
  }, [profile, setTheme, applyCustomColors])

  // Actualizar preferencias
  const setThemePreferences = useCallback((prefs: Partial<ThemePreferences>) => {
    setThemePreferencesState(prev => ({
      ...prev,
      ...prefs
    }))

    // Aplicar modo de tema
    if (prefs.themeMode) {
      setTheme(prefs.themeMode)
    }

    // Aplicar color personalizado
    if (prefs.customPrimaryColor) {
      applyCustomColors(prefs.customPrimaryColor)
    }
  }, [applyCustomColors, setTheme])

  // Aplicar color inicial
  useEffect(() => {
    applyCustomColors(themePreferences.customPrimaryColor)
  }, [applyCustomColors, themePreferences.customPrimaryColor])

  // Guardar en localStorage como backup
  useEffect(() => {
    localStorage.setItem('themePreferences', JSON.stringify(themePreferences))
  }, [themePreferences])

  return (
    <ThemeContext.Provider value={{
      themePreferences,
      setThemePreferences,
      applyCustomColors
    }}>
      {children}
    </ThemeContext.Provider>
  )
}

