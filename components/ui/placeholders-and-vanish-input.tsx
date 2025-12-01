"use client"

import { AnimatePresence, motion } from "framer-motion"
import { useCallback, useEffect, useRef, useState, ReactNode } from "react"
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
  const [animating, setAnimating] = useState(false)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const startAnimation = () => {
    if (!showSuggestions) return
    
    intervalRef.current = setInterval(() => {
      setAnimating(true)
      setTimeout(() => {
        setCurrentPlaceholder((prev) => (prev + 1) % placeholders.length)
        setAnimating(false)
      }, 1000)
    }, 3000)
  }

  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState !== "visible" && intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    } else if (document.visibilityState === "visible") {
      startAnimation()
    }
  }, [placeholders.length])

  useEffect(() => {
    if (showSuggestions) {
      startAnimation()
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [handleVisibilityChange, showSuggestions])

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const newDataRef = useRef<any[]>([])
  const internalTextareaRef = useRef<HTMLTextAreaElement>(null)
  const activeTextareaRef = textareaRef || internalTextareaRef
  const [inputValue, setInputValue] = useState(value)

  useEffect(() => {
    setInputValue(value)
  }, [value])

  const draw = useCallback(() => {
    if (!activeTextareaRef.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    canvas.width = 800
    canvas.height = 800
    ctx.clearRect(0, 0, 800, 800)
    const computedStyles = getComputedStyle(activeTextareaRef.current)

    const fontSize = parseFloat(computedStyles.getPropertyValue("font-size"))
    ctx.font = `${fontSize * 2}px ${computedStyles.fontFamily}`
    ctx.fillStyle = "#FFF"
    ctx.fillText(inputValue, 16, 40)

    const imageData = ctx.getImageData(0, 0, 800, 800)
    const pixelData = imageData.data
    const newData: any[] = []

    for (let t = 0; t < 800; t++) {
      let i = 4 * t * 800
      for (let n = 0; n < 800; n++) {
        if (pixelData[i] !== 0) {
          const o = {
            x: n,
            y: t,
            color: [
              pixelData[i],
              pixelData[i + 1],
              pixelData[i + 2],
              pixelData[i + 3]
            ]
          }
          newData.push(o)
        }
        i += 4
      }
    }

    newDataRef.current = newData.map(({ x, y, color }) => ({
      x,
      y,
      r: 1,
      color: `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${color[3]})`
    }))
  }, [inputValue])

  useEffect(() => {
    draw()
  }, [inputValue, draw])

  const animate = (start: number) => {
    const animateFrame = (pos: number = 0) => {
      requestAnimationFrame(() => {
        const newArr = []
        for (let i = 0; i < newDataRef.current.length; i++) {
          const current = newDataRef.current[i]
          if (current.x < pos) {
            newArr.push(current)
          } else {
            if (current.r <= 0) {
              current.r = 0
              continue
            }
            current.x += Math.random() > 0.5 ? 1 : -1
            current.y += Math.random() > 0.5 ? 1 : -1
            current.r -= 0.05 * Math.random()
            newArr.push(current)
          }
        }
        newDataRef.current = newArr
        const ctx = canvasRef.current?.getContext("2d")
        if (ctx) {
          ctx.clearRect(pos, 0, 800, 800)
          newDataRef.current.forEach((t) => {
            const { x: n, y: i, r: s, color } = t
            if (n > pos) {
              ctx.beginPath()
              ctx.rect(n, i, s, s)
              ctx.fillStyle = color
              ctx.strokeStyle = color
              ctx.stroke()
            }
          })
        }
        if (newDataRef.current.length > 0) {
          animateFrame(pos - 8)
        } else {
          setInputValue("")
          setAnimating(false)
        }
      })
    }
    animateFrame(start)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (onKeyDown) {
      onKeyDown(e)
    }
    
    if (!e.defaultPrevented && e.key === "Enter" && !e.shiftKey && !disabled) {
      e.preventDefault()
      vanishAndSubmit()
      onSubmit && onSubmit(e as any)
    }
  }

  const vanishAndSubmit = () => {
    if (!inputValue || disabled) return
    
    setAnimating(true)
    draw()

    const value = inputValue
    if (value && activeTextareaRef.current) {
      const maxX = newDataRef.current.reduce(
        (prev, current) => (current.x > prev ? current.x : prev),
        0
      )
      animate(maxX)
    }
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    vanishAndSubmit()
    onSubmit && onSubmit(e)
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    
    // Detener animaciones cuando el usuario empiece a escribir
    if (newValue.length > 0 && intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
      setAnimating(false)
    }
    
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
        inputValue && "bg-background",
        className
      )}
    >
      {/* Gradiente decorativo superior sutil */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      
      <canvas
        className={cn(
          "pointer-events-none absolute left-2 top-[20%] origin-top-left scale-50 transform pr-20 text-base invert filter dark:invert-0 sm:left-8",
          !animating ? "opacity-0" : "opacity-100"
        )}
        ref={canvasRef}
      />
      
      {/* Contenedor interno con flex para mejor alineación */}
      <div className="flex items-center gap-2 px-3 py-2">
        {/* Elemento izquierdo (ej: botón de archivo) */}
        {leftElement && (
          <motion.div 
            className="flex-shrink-0 z-10"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {leftElement}
          </motion.div>
        )}
        
        {/* Área de texto */}
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
            value={inputValue}
            disabled={disabled}
            rows={1}
            className={cn(
              "w-full resize-none border-none bg-transparent",
              "px-2 py-3",
              "text-sm sm:text-base",
              "text-foreground placeholder:text-muted-foreground/60",
              "focus:outline-none focus:ring-0",
              animating && "text-transparent dark:text-transparent"
            )}
            style={{
              minHeight: "48px",
              maxHeight: "200px"
            }}
          />

          {/* Placeholders animados */}
          {showSuggestions && (
            <div className="pointer-events-none absolute inset-0 flex items-center px-2 text-sm sm:text-base leading-none text-muted-foreground/50">
              {!inputValue && (
                <AnimatePresence mode="wait">
                  {!animating && (
                    <motion.p
                      initial={{ y: 5, opacity: 0 }}
                      key={`current-placeholder-${currentPlaceholder}`}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -15, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      className="w-full truncate text-left"
                    >
                      {placeholders[currentPlaceholder]}
                    </motion.p>
                  )}
                </AnimatePresence>
              )}
            </div>
          )}
        </div>

        {/* Elemento derecho (ej: botón de enviar/stop) */}
        {rightElement && (
          <div className="flex-shrink-0 z-10">
            {rightElement}
          </div>
        )}
      </div>
      
      {/* Línea decorativa inferior */}
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-border/30 to-transparent" />
    </motion.div>
  )
}

