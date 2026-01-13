"use client"

import { AnimatePresence, motion } from "framer-motion"
import { useEffect, useRef, useState, ReactNode } from "react"
import { cn } from "@/lib/utils"

// Icono de enviar moderno con animación
export function ModernSendIcon({
  onClick,
  disabled,
  size = 20
}: {
  onClick: () => void
  disabled?: boolean
  size?: number
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? {} : { scale: 1.05 }}
      whileTap={disabled ? {} : { scale: 0.95 }}
      className={cn(
        "relative flex items-center justify-center",
        "w-10 h-10 rounded-xl",
        "transition-all duration-300 ease-out",
        disabled
          ? "bg-muted/50 cursor-not-allowed"
          : "bg-gradient-to-br from-primary via-primary to-primary/80 hover:shadow-lg hover:shadow-primary/30 cursor-pointer"
      )}
    >
      {/* Efecto de brillo en hover */}
      {!disabled && (
        <motion.div
          className="absolute inset-0 rounded-xl bg-gradient-to-tr from-white/20 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity"
        />
      )}

      {/* Icono de flecha/enviar moderno */}
      <motion.svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className={cn(
          "relative z-10 transition-colors",
          disabled ? "text-muted-foreground/50" : "text-primary-foreground"
        )}
        initial={false}
        animate={disabled ? {} : { x: 0 }}
        whileHover={disabled ? {} : { x: 2 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
      >
        <path
          d="M6 12L3.269 3.126A59.768 59.768 0 0 1 21.485 12 59.77 59.77 0 0 1 3.27 20.876L5.999 12Zm0 0h7.5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </motion.svg>
    </motion.button>
  )
}

export function PlaceholdersAndVanishInput({
  placeholders,
  onChange,
  onSubmit,
  onKeyDown,
  onCompositionStart,
  onCompositionEnd,
  onPaste,
  value = "",
  disabled = false,
  className,
  textareaRef,
  leftElement,
  rightElement,
  showSuggestions = true
}: {
  placeholders: string[]
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  onCompositionStart?: () => void
  onCompositionEnd?: () => void
  onPaste?: (e: React.ClipboardEvent) => void
  value?: string
  disabled?: boolean
  className?: string
  textareaRef?: React.RefObject<HTMLTextAreaElement>
  leftElement?: ReactNode
  rightElement?: ReactNode
  showSuggestions?: boolean
}) {
  const [isFocused, setIsFocused] = useState(false)
  const [currentPlaceholder, setCurrentPlaceholder] = useState(0)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const internalTextareaRef = useRef<HTMLTextAreaElement>(null)
  const activeTextareaRef = textareaRef || internalTextareaRef

  // Rotación de placeholders - solo cuando showSuggestions=true Y value está vacío
  useEffect(() => {
    // Limpiar intervalo previo
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    // Solo iniciar animación si debe mostrar sugerencias y no hay texto
    if (showSuggestions && !value) {
      intervalRef.current = setInterval(() => {
        setCurrentPlaceholder((prev) => (prev + 1) % placeholders.length)
      }, 3000)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [showSuggestions, value, placeholders.length])

  // Manejar keydown - propagar al padre y manejar Enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (onKeyDown) {
      onKeyDown(e)
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (onSubmit) {
        // Create a synthetic FormEvent since we're calling from a textarea
        // We cast it to any first to avoid strict type checks since we just need it to trigger the handler
        const formEvent = e as unknown as React.FormEvent<HTMLFormElement>
        onSubmit(formEvent)
      }
    }
  }

  // Manejar cambios - simplemente propagar
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange && onChange(e)
  }

  return (
    <motion.div
      initial={false}
      animate={{
        boxShadow: isFocused
          ? "0 0 0 2px hsl(var(--primary) / 0.2), 0 8px 32px -8px rgba(0,0,0,0.15)"
          : "0 2px 12px -4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)"
      }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn(
        "relative mx-auto w-full overflow-hidden",
        "rounded-2xl",
        "bg-background/95 backdrop-blur-xl",
        "border border-white/10 dark:border-white/5",
        "transition-colors duration-200",
        isFocused && "border-primary/30",
        value && "bg-background",
        className
      )}
      style={{ minHeight: "60px" }}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

      <div className="flex items-center gap-2 px-3 py-2 h-full relative z-10">
        {leftElement && (
          <motion.div
            className="flex-shrink-0 z-20 self-end mb-1"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {leftElement}
          </motion.div>
        )}

        <div className="relative flex-1 min-w-0">
          <textarea
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onCompositionStart={onCompositionStart}
            onCompositionEnd={onCompositionEnd}
            onPaste={onPaste}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            ref={activeTextareaRef}
            value={value}
            disabled={disabled}
            rows={1}
            className={cn(
              "w-full resize-none border-none bg-transparent",
              "px-2 py-3",
              "text-sm sm:text-base",
              "text-foreground placeholder:text-muted-foreground/60",
              "focus:outline-none focus:ring-0",
              "relative z-20" // Ensure textarea is above placeholders
            )}
            style={{
              minHeight: "48px",
              maxHeight: "200px"
            }}
          />

          {/* Placeholders animados - solo mostrar si showSuggestions=true Y value está vacío */}
          {showSuggestions && !value && (
            <div className="pointer-events-none absolute inset-0 flex items-center px-2 text-sm sm:text-base leading-none text-muted-foreground/50 z-10">
              <AnimatePresence mode="wait">
                <motion.p
                  initial={{ y: 5, opacity: 0 }}
                  key={`placeholder-${currentPlaceholder}`}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -10, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="w-full truncate text-left"
                >
                  {placeholders[currentPlaceholder]}
                </motion.p>
              </AnimatePresence>
            </div>
          )}
        </div>

        {rightElement && (
          <div className="flex-shrink-0 z-20 self-end mb-1">
            {rightElement}
          </div>
        )}
      </div>

      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-border/30 to-transparent" />
    </motion.div>
  )
}
