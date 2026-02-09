import { cn } from "@/lib/utils"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowUp, Square } from "lucide-react"
import { FC, useEffect, useRef, useState, ReactNode, useCallback } from "react"
import ReactTextareaAutosize from "react-textarea-autosize"

interface ChatInputAreaProps {
    value: string
    onChange: (value: string) => void
    onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
    onPaste?: (e: React.ClipboardEvent) => void
    onCompositionStart?: () => void
    onCompositionEnd?: () => void
    placeholder?: string
    placeholders?: string[]
    disabled?: boolean
    textareaRef?: React.RefObject<HTMLTextAreaElement>
    leftElement?: ReactNode
    rightElement?: ReactNode
    showSuggestions?: boolean
}

export const ChatInputArea: FC<ChatInputAreaProps> = ({
    value,
    onChange,
    onKeyDown,
    onPaste,
    onCompositionStart,
    onCompositionEnd,
    placeholder,
    placeholders = [],
    disabled = false,
    textareaRef,
    leftElement,
    rightElement,
    showSuggestions = true
}) => {
    const [isFocused, setIsFocused] = useState(false)
    const [currentPlaceholder, setCurrentPlaceholder] = useState(0)
    const [internalValue, setInternalValue] = useState(value)
    const isComposing = useRef(false)
    const placeholderIntervalRef = useRef<NodeJS.Timeout | null>(null)

    // Sincronizar valor interno con el valor externo solo cuando no esté componiendo
    useEffect(() => {
        if (!isComposing.current) {
            setInternalValue(value)
        }
    }, [value])

    // Rotating placeholders logic - solo cuando showSuggestions=true Y no hay texto
    useEffect(() => {
        // Limpiar intervalo previo
        if (placeholderIntervalRef.current) {
            clearInterval(placeholderIntervalRef.current)
            placeholderIntervalRef.current = null
        }

        // Solo iniciar animación si debe mostrar sugerencias, no hay texto, y hay placeholders
        if (showSuggestions && !internalValue && placeholders.length > 0) {
            placeholderIntervalRef.current = setInterval(() => {
                setCurrentPlaceholder((prev) => (prev + 1) % placeholders.length)
            }, 3000)
        }

        return () => {
            if (placeholderIntervalRef.current) {
                clearInterval(placeholderIntervalRef.current)
                placeholderIntervalRef.current = null
            }
        }
    }, [showSuggestions, internalValue, placeholders.length])

    // Manejar cambios del textarea con optimización de rendimiento
    const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value
        
        // Actualizar valor interno inmediatamente para respuesta instantánea
        setInternalValue(newValue)
        
        // Solo propagar al padre si no estamos en medio de una composición
        if (!isComposing.current) {
            onChange(newValue)
        }
    }, [onChange])

    // Manejar inicio de composición (para input methods como CJK, emoji picker, etc.)
    const handleCompositionStart = useCallback(() => {
        isComposing.current = true
        onCompositionStart?.()
    }, [onCompositionStart])

    // Manejar fin de composición
    const handleCompositionEnd = useCallback((e: React.CompositionEvent<HTMLTextAreaElement>) => {
        isComposing.current = false
        // Propagar el valor final al padre
        const finalValue = e.currentTarget.value
        setInternalValue(finalValue)
        onChange(finalValue)
        onCompositionEnd?.()
    }, [onChange, onCompositionEnd])

    // Manejar keydown con prevención de comportamientos por defecto cuando sea necesario
    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // Si estamos componiendo, no propagar ciertas teclas
        if (isComposing.current && (e.key === 'Enter' || e.key === 'Escape')) {
            return
        }
        
        onKeyDown?.(e)
    }, [onKeyDown])

    // Determinar si mostrar placeholders animados
    const shouldShowAnimatedPlaceholders = showSuggestions && !internalValue && placeholders.length > 0
    
    // Determinar si mostrar placeholder estático
    const shouldShowStaticPlaceholder = !internalValue && (!showSuggestions || placeholders.length === 0) && placeholder

    return (
        <div
            className={cn(
                "relative mx-auto w-full overflow-hidden",
                "rounded-2xl",
                "bg-background/95 backdrop-blur-xl",
                "border border-white/10 dark:border-white/5",
                "transition-colors duration-200",
                isFocused && "border-primary/30",
                internalValue && "bg-background"
            )}
            style={{ minHeight: "60px" }}
        >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

            <div className="flex items-end gap-2 px-3 py-2 relative z-10 w-full">
                {leftElement && (
                    <div className="flex-shrink-0 z-20 mb-1">
                        {leftElement}
                    </div>
                )}

                <div className="relative flex-1 min-w-0 self-center">
                    <ReactTextareaAutosize
                        ref={textareaRef}
                        className={cn(
                            "w-full resize-none border-none bg-transparent",
                            "px-2 py-3",
                            "text-sm sm:text-base",
                            "text-foreground placeholder:text-transparent", // Hide default placeholder
                            "focus:outline-none focus:ring-0",
                            "relative z-20"
                        )}
                        minRows={1}
                        maxRows={8}
                        value={internalValue}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        onPaste={onPaste}
                        onCompositionStart={handleCompositionStart}
                        onCompositionEnd={handleCompositionEnd}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        disabled={disabled}
                        aria-label="Mensaje de chat"
                        aria-multiline="true"
                    />

                    {/* Animated Placeholders */}
                    {shouldShowAnimatedPlaceholders && (
                        <div 
                            className="pointer-events-none absolute inset-0 flex items-center px-2 text-sm sm:text-base text-muted-foreground/50 z-10"
                            aria-hidden="true"
                        >
                            <AnimatePresence mode="wait">
                                <motion.p
                                    key={`placeholder-${currentPlaceholder}`}
                                    initial={{ y: 5, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    exit={{ y: -5, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="truncate"
                                >
                                    {placeholders[currentPlaceholder]}
                                </motion.p>
                            </AnimatePresence>
                        </div>
                    )}

                    {/* Static Placeholder fallback */}
                    {shouldShowStaticPlaceholder && (
                        <div 
                            className="pointer-events-none absolute inset-0 flex items-center px-2 text-sm sm:text-base text-muted-foreground/50 z-10"
                            aria-hidden="true"
                        >
                            <p className="truncate">{placeholder}</p>
                        </div>
                    )}
                </div>

                {rightElement && (
                    <div className="flex-shrink-0 z-20 mb-1">
                        {rightElement}
                    </div>
                )}
            </div>

            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-border/30 to-transparent" />
        </div>
    )
}
