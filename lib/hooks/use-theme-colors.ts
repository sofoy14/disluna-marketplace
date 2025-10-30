"use client"

import { useEffect } from 'react'
import { useThemePreferences } from '@/components/utility/theme-context'

export function useThemeColors() {
  const { themePreferences, applyCustomColors } = useThemePreferences()

  useEffect(() => {
    // Aplicar colores personalizados inicialmente
    applyCustomColors(themePreferences.customPrimaryColor)
  }, [themePreferences.customPrimaryColor, applyCustomColors])

  return {
    primaryColor: themePreferences.customPrimaryColor,
    themeMode: themePreferences.themeMode,
    selectedPalette: themePreferences.selectedPalette
  }
}





