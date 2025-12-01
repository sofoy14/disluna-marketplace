"use client"

import { Plus } from "lucide-react"
import { useState, useEffect, useContext } from "react"
import { ChatbotUIContext } from "@/context/context"
import { useChatHandler } from "@/components/chat/chat-hooks/use-chat-handler"
import { ShaderCanvas } from "@/components/shader-canvas"
import { ModelSelectorToggle } from "@/components/chat/model-selector-toggle"
import { motion, AnimatePresence } from "framer-motion"
import { PlaceholdersAndVanishInput, ModernSendIcon } from "@/components/ui/placeholders-and-vanish-input"
import { CreateFileModal } from "@/components/modals/CreateFileModal"
import { cn } from "@/lib/utils"

export function WelcomeScreen() {
  const { selectedWorkspace } = useContext(ChatbotUIContext)
  const { handleNewChat, handleSendMessage } = useChatHandler()
  const [inputValue, setInputValue] = useState("")
  const [selectedShader, setSelectedShader] = useState(1)
  const [isSending, setIsSending] = useState(false)
  const [sentMessage, setSentMessage] = useState("")

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

  const handleSend = async (text?: string) => {
    const message = text || inputValue.trim()
    if (!message || isSending || !selectedWorkspace) return

    // Guardar el mensaje y mostrar animación
    setSentMessage(message)
    setIsSending(true)
    setInputValue("")

    // Esperar a que la animación del orbe se complete, luego crear chat y enviar mensaje
    setTimeout(async () => {
      try {
        // Crear el nuevo chat y navegar
        await handleNewChat()
        
        // Enviar el mensaje después de que la navegación esté lista
        setTimeout(() => {
          handleSendMessage(message, [], false)
        }, 150)
      } catch (e) {
        setIsSending(false)
        setSentMessage("")
      }
    }, 900)
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value)
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement> | React.KeyboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault()
    handleSend()
  }

  return (
    <div className="relative flex h-full flex-col bg-gradient-to-br from-background via-background to-primary/10 overflow-hidden">
      
      {/* Header */}
      <div className="absolute top-4 right-4 z-20">
        <ModelSelectorToggle />
      </div>

      {/* Contenido principal */}
      <div className="flex-1 flex items-center justify-center p-4 md:p-6 relative">
        
        <AnimatePresence mode="wait">
          {isSending && (
            <>
              {/* Orbe animándose - se mueve hacia donde estará el avatar del asistente */}
              <motion.div
                initial={{ 
                  position: "fixed", 
                  top: "50%", 
                  left: "50%", 
                  x: "-50%", 
                  y: "-50%", 
                  scale: 1,
                  opacity: 1,
                  zIndex: 70 
                }}
                animate={{ 
                  top: "calc(50% + 80px)",
                  left: "calc(50% - 280px)",
                  x: "-50%",
                  y: "-50%",
                  scale: 0.32,
                  opacity: 0,
                }}
                transition={{ 
                  duration: 0.8, 
                  ease: [0.32, 0.72, 0, 1],
                  opacity: { duration: 0.5, delay: 0.3 }
                }}
                className="pointer-events-none"
              >
                <div className="relative">
                  <ShaderCanvas size={100} shaderId={selectedShader} />
                  <div className="absolute inset-0 bg-primary/30 blur-3xl rounded-full -z-10 animate-pulse" />
                </div>
              </motion.div>

              {/* Pantalla de transición - aparece suavemente */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="fixed inset-0 z-50 bg-gradient-to-br from-background via-background to-primary/10 flex flex-col"
              >
                {/* Mensajes simulados */}
                <div className="flex-1 overflow-auto p-4 pt-20 max-w-3xl mx-auto w-full">
                  {/* Mensaje del usuario */}
                  <motion.div
                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
                    className="flex justify-end mb-6"
                  >
                    <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/90 text-primary-foreground shadow-lg shadow-primary/25 px-4 py-3.5 rounded-2xl rounded-tr-sm max-w-[70%]">
                      {/* Shine effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_2s_infinite] pointer-events-none" />
                      <p className="text-[15px] font-medium leading-relaxed relative z-10">{sentMessage}</p>
                    </div>
                  </motion.div>

                  {/* Respuesta del asistente (pensando) */}
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.5, ease: "easeOut" }}
                    className="flex gap-3 items-start"
                  >
                    {/* Avatar del asistente - aparece donde termina el orbe */}
                    <motion.div 
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.3, delay: 0.6, type: "spring", stiffness: 200 }}
                      className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-violet-500/20 ring-offset-2 ring-offset-background shadow-lg shadow-violet-500/10"
                    >
                      <ShaderCanvas size={36} shaderId={selectedShader} />
                    </motion.div>
                    <div className="relative overflow-hidden bg-gradient-to-br from-card via-card to-muted/50 border border-border/60 shadow-md shadow-black/5 dark:shadow-black/20 px-4 py-3.5 rounded-2xl rounded-tl-sm backdrop-blur-sm">
                      {/* Glass effect */}
                      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
                      <div className="flex items-center gap-1.5 relative z-10">
                        <span className="text-xs font-medium text-muted-foreground">Pensando</span>
                        <div className="flex space-x-1">
                          <motion.div 
                            animate={{ y: [0, -4, 0], scale: [1, 1.1, 1] }}
                            transition={{ repeat: Infinity, duration: 0.6, delay: 0 }}
                            className="w-1.5 h-1.5 bg-gradient-to-br from-primary to-primary/60 rounded-full shadow-sm shadow-primary/30"
                          />
                          <motion.div 
                            animate={{ y: [0, -4, 0], scale: [1, 1.1, 1] }}
                            transition={{ repeat: Infinity, duration: 0.6, delay: 0.12 }}
                            className="w-1.5 h-1.5 bg-gradient-to-br from-primary to-primary/60 rounded-full shadow-sm shadow-primary/30"
                          />
                          <motion.div 
                            animate={{ y: [0, -4, 0], scale: [1, 1.1, 1] }}
                            transition={{ repeat: Infinity, duration: 0.6, delay: 0.24 }}
                            className="w-1.5 h-1.5 bg-gradient-to-br from-primary to-primary/60 rounded-full shadow-sm shadow-primary/30"
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Contenido de bienvenida */}
        <motion.div 
          className="w-full max-w-2xl"
          animate={{ 
            opacity: isSending ? 0 : 1, 
            scale: isSending ? 0.9 : 1 
          }}
          transition={{ duration: 0.3 }}
        >
          {/* Orbe central */}
          <div className="flex justify-center mb-8">
            {!isSending && <ShaderCanvas size={100} shaderId={selectedShader} />}
          </div>

          {/* Título */}
          <h1 className="text-center text-2xl md:text-3xl lg:text-4xl mb-10 text-foreground font-light">
            ¿En qué puedo ayudarte hoy?
          </h1>

          {/* Input */}
          <PlaceholdersAndVanishInput
            placeholders={[
              "¿Cuáles son los requisitos para una demanda?",
              "Redacta una tutela por violación al debido proceso",
              "Busca jurisprudencia sobre contratos laborales",
              "Analiza este documento legal"
            ]}
            onChange={handleChange}
            onSubmit={handleSubmit}
            leftElement={
              <CreateFileModal onFileCreated={(file) => console.log(file)}>
                <motion.div
                  whileHover={{ scale: 1.05, rotate: 90 }}
                  whileTap={{ scale: 0.95 }}
                  className={cn(
                    "flex items-center justify-center",
                    "w-10 h-10 rounded-xl",
                    "bg-muted/50 hover:bg-muted",
                    "cursor-pointer transition-colors",
                    "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Plus className="w-5 h-5" />
                </motion.div>
              </CreateFileModal>
            }
            rightElement={
              <ModernSendIcon
                onClick={() => handleSend()}
                disabled={!inputValue || isSending}
              />
            }
            disabled={isSending}
          />
        </motion.div>
      </div>

      {/* Footer */}
      <div className="hidden md:block px-6 py-3 text-center">
        <p className="text-xs text-muted-foreground">
          La IA puede cometer errores. Verifica información importante.
        </p>
      </div>
    </div>
  )
}
