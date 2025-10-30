"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MessageSquare, FolderOpen, Mic, Send, Upload } from "lucide-react"
import { useContext, useState, useEffect } from "react"
import { ChatbotUIContext } from "@/context/context"
import { useChatHandler } from "@/components/chat/chat-hooks/use-chat-handler"
import { useRouter } from "next/navigation"
import { ShaderCanvas } from "@/components/shader-canvas"

const suggestions = [
  {
    icon: MessageSquare,
    title: "Consultas",
    description: "Realiza consultas legales y obtén respuestas especializadas sobre jurisprudencia y normativa.",
  },
  {
    icon: FolderOpen,
    title: "Mis procesos",
    description: "Gestiona y consulta tus procesos legales con contexto dedicado.",
  },
  {
    icon: Mic,
    title: "Transcripción de audio",
    description: "Transcribe y analiza audios para documentos legales y transcripciones judiciales.",
  },
]


export function WelcomeScreen() {
  const { profile, selectedWorkspace } = useContext(ChatbotUIContext)
  const { handleNewChat, handleSendMessage } = useChatHandler()
  const router = useRouter()
  const [inputValue, setInputValue] = useState("")
  const [selectedShader, setSelectedShader] = useState(1) // Default to shader ID 1

  // Load shader from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedShader = localStorage.getItem('selectedShader')
      if (savedShader) {
        setSelectedShader(parseInt(savedShader, 10))
      }

      // Listen for shader changes from user panel
      const handleShaderChanged = (e: CustomEvent<number>) => {
        setSelectedShader(e.detail)
      }

      window.addEventListener('shaderChanged', handleShaderChanged as EventListener)

      return () => {
        window.removeEventListener('shaderChanged', handleShaderChanged as EventListener)
      }
    }
  }, [])

  const handleSend = async () => {
    const message = inputValue.trim()
    if (!message) return

    // Crear nuevo chat y, tras navegar, enviar el primer mensaje
    await handleNewChat()
    setTimeout(() => {
      try {
        handleSendMessage(message, [], false)
      } catch (e) {
        // Silenciar error visible en UI inicial
        console.error('Error enviando primer mensaje desde WelcomeScreen:', e)
      }
    }, 50)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleCardClick = async (cardTitle: string) => {
    if (cardTitle === "Consultas") {
      // Abrir chat normal para consultas y, si hay texto, enviarlo
      if (inputValue.trim()) {
        await handleSend()
      } else {
        await handleNewChat()
      }
    } else if (cardTitle === "Mis procesos") {
      // Ir a la pestaña de procesos
      const url = `/${selectedWorkspace?.id}?tab=collections`
      router.push(url)
    } else if (cardTitle === "Transcripción de audio") {
      // Ir a la página de transcripciones
      const url = `/${selectedWorkspace?.id}/transcriptions`
      router.push(url)
    }
  }

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-gradient-to-br from-background via-background to-primary/20 overflow-hidden">
        {/* Main Content - Flex para ocupar todo sin scroll en móviles */}
        <div className="flex-1 flex items-center justify-center p-2 md:p-6 overflow-y-auto min-h-0">
          <div className="w-full max-w-3xl h-full flex flex-col">
            {/* Welcome Card - Flex para distribuir espacio */}
            <div className="bg-card/50 backdrop-blur-sm rounded-xl md:rounded-2xl p-3 md:p-8 border border-border flex flex-col h-full md:h-auto justify-between md:justify-start">
              {/* Icon - Más pequeño en móviles */}
              <div className="flex justify-center mb-2 md:mb-8 flex-shrink-0">
                <ShaderCanvas size={80} shaderId={selectedShader} />
              </div>

              {/* Title - Compacto en móviles */}
              <h1 className="text-center text-lg md:text-3xl mb-2 md:mb-8 text-foreground flex-shrink-0">¿Cómo puedo ayudarte hoy?</h1>

                {/* Suggestion Cards - Grid compacto en móviles */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4 mb-2 md:mb-8 flex-1 min-h-0">
                  {suggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      onClick={() => handleCardClick(suggestion.title)}
                      className="bg-muted/50 p-2 md:p-4 rounded-lg md:rounded-xl hover:bg-muted cursor-pointer transition-colors border border-border flex flex-col justify-center"
                    >
                      <div className="flex justify-center mb-1.5 md:mb-3">
                        <div className="w-7 h-7 md:w-10 md:h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                          <suggestion.icon className="w-3.5 h-3.5 md:w-5 md:h-5 text-primary" />
                        </div>
                      </div>
                      <h3 className="text-center text-xs md:text-sm mb-1 md:mb-2 text-foreground font-medium">{suggestion.title}</h3>
                      <p className="text-center text-[10px] md:text-xs text-muted-foreground leading-tight md:leading-relaxed line-clamp-2">
                        {suggestion.description}
                      </p>
                    </div>
                  ))}
                </div>

              {/* Input - Compacto en móviles, siempre al final */}
              <div className="relative flex-shrink-0 mt-auto">
                <div className="flex items-center gap-1.5 md:gap-3 bg-input rounded-full px-2 md:px-4 py-1.5 md:py-3 border border-input">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-5 h-5 md:w-6 md:h-6 flex-shrink-0 hover:bg-muted/50 rounded-full p-0"
                        aria-label="Subir documento"
                      >
                        <Upload className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground hover:text-foreground transition-colors" />
                      </Button>
                    <Input
                      placeholder="Escribe tu consulta aquí..."
                      className="flex-1 border-0 bg-transparent text-foreground placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 p-0 text-sm md:text-base"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                    />
                    <Button
                      size="icon"
                      className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-primary hover:bg-primary/90 flex-shrink-0"
                      onClick={handleSend}
                    >
                      <Send className="w-3 h-3 md:w-4 md:h-4 text-primary-foreground" />
                    </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer - Oculto en móviles para ahorrar espacio */}
        <div className="hidden md:block px-6 py-3 md:py-4 text-center flex-shrink-0">
          <p className="text-xs text-muted-foreground">
            La IA puede cometer errores. Verifica información importante.
          </p>
        </div>
      </div>
    </div>
  )
}
