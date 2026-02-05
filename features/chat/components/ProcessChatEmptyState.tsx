"use client"

import { useState, useEffect } from "react"
import { ShaderCanvas } from "@/components/shader-canvas"
import { motion } from "framer-motion"

interface ProcessChatEmptyStateProps {
  suggestionChips: string[]
  onChipClick: (chip: string) => void
}

export function ProcessChatEmptyState({ suggestionChips, onChipClick }: ProcessChatEmptyStateProps) {
  const [selectedShader, setSelectedShader] = useState(1)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedShader = localStorage.getItem('selectedShader')
      if (savedShader) {
        setSelectedShader(parseInt(savedShader, 10))
      }

      const handleShaderChanged = (e: CustomEvent<number>) => {
        setSelectedShader(e.detail)
      }

      window.addEventListener('shaderChanged', handleShaderChanged as EventListener)
      return () => {
        window.removeEventListener('shaderChanged', handleShaderChanged as EventListener)
      }
    }
  }, [])

  // Limitar a máximo 2 sugerencias
  const limitedSuggestions = suggestionChips.slice(0, 2)

  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      {/* Orbe de energía */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <div className="relative">
          <ShaderCanvas size={80} shaderId={selectedShader} />
          <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full -z-10" />
        </div>
      </motion.div>

      {/* Título minimalista */}
      <motion.h2 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="text-lg font-medium text-foreground mb-2"
      >
        ¿Qué quieres saber sobre este proceso?
      </motion.h2>

      <motion.p 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="text-sm text-muted-foreground mb-8 max-w-md"
      >
        Puedo analizar hechos, pruebas, contradicciones y normas aplicables.
      </motion.p>

      {/* Máximo 2 sugerencias */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        {limitedSuggestions.map((chip, index) => (
          <motion.button
            key={index}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onChipClick(chip)}
            className="px-5 py-2.5 rounded-xl text-sm font-medium
              bg-card/50 hover:bg-primary/10 
              border border-border/50 hover:border-primary/30
              text-muted-foreground hover:text-foreground
              transition-all duration-200"
          >
            {chip}
          </motion.button>
        ))}
      </motion.div>
    </div>
  )
}
