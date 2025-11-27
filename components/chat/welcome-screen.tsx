"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, Upload, Plus, Paperclip } from "lucide-react"
import { useContext, useState, useEffect } from "react"
import { ChatbotUIContext } from "@/context/context"
import { useChatHandler } from "@/components/chat/chat-hooks/use-chat-handler"
import { useRouter } from "next/navigation"
import { ShaderCanvas } from "@/components/shader-canvas"
import { ModelSelectorToggle } from "@/components/chat/model-selector-toggle"
import { motion, AnimatePresence } from "framer-motion"
import { PlaceholdersAndVanishInput, ModernSendIcon } from "@/components/ui/placeholders-and-vanish-input"
import { IconCirclePlus, IconSend } from "@tabler/icons-react"
import { CreateFileModal } from "@/components/modals/CreateFileModal"
import { cn } from "@/lib/utils"

export function WelcomeScreen() {
  const { profile, selectedWorkspace } = useContext(ChatbotUIContext)
  const { handleNewChat, handleSendMessage } = useChatHandler()
  const router = useRouter()
  const [inputValue, setInputValue] = useState("")
  const [selectedShader, setSelectedShader] = useState(1) // Default to shader ID 1
  const [isSending, setIsSending] = useState(false)
  const [sentMessage, setSentMessage] = useState("") // Store the message being sent

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

  const handleSend = async (text?: string) => {
    const message = text || inputValue.trim()
    if (!message) return

    setIsSending(true)
    setSentMessage(message) 

    setTimeout(async () => {
      await handleNewChat()
      setTimeout(() => {
        try {
          handleSendMessage(message, [], false)
        } catch (e) {
          console.error('Error enviando primer mensaje desde WelcomeScreen:', e)
        }
      }, 50)
    }, 1200)
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value)
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement> | React.KeyboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault()
    handleSend()
  }

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <div className="flex-1 flex flex-col bg-gradient-to-br from-background via-background to-primary/20 overflow-hidden relative">
        
        {/* Header with Model Selector */}
        <div className="absolute top-4 right-4 z-20">
           <ModelSelectorToggle />
        </div>

        <div className="flex-1 flex items-center justify-center p-2 md:p-6 overflow-y-auto min-h-0 relative">
          
          <AnimatePresence>
            {isSending && (
              <>
                {/* Orb Animation */}
                <motion.div
                  initial={{ 
                    position: "fixed", 
                    top: "50%", 
                    left: "50%", 
                    x: "-50%", 
                    y: "-50%", 
                    scale: 1,
                    zIndex: 50 
                  }}
                  animate={[
                    {
                      scale: 1.2,
                      transition: { duration: 0.4, ease: "easeOut" }
                    },
                    { 
                      top: "120px",    
                      left: "40px",    
                      x: "0%",
                      y: "0%",
                      scale: 0.2,      
                      opacity: 0,      
                      transition: { duration: 0.8, ease: "easeInOut", delay: 0.4 }
                    }
                  ]}
                  className="pointer-events-none"
                >
                  <div className="relative">
                    <ShaderCanvas size={150} shaderId={selectedShader} />
                    <div className="absolute inset-0 bg-primary/30 blur-3xl rounded-full -z-10 animate-pulse" />
                  </div>
                </motion.div>

                {/* Temporary Chat UI Simulation for Transition */}
                <motion.div
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   transition={{ duration: 0.5, delay: 0.2 }}
                   className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm flex flex-col pt-[80px] px-4 md:px-6 max-w-3xl mx-auto w-full"
                >
                  {/* User Message Bubble (Unified Style) */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                    className="self-end mb-6 flex flex-row-reverse gap-3 px-4 py-3"
                  >
                    <div className="bg-background text-foreground border border-border shadow-md shadow-primary/20 px-4 py-3 rounded-2xl rounded-tr-sm max-w-[70%] text-sm leading-relaxed whitespace-pre-wrap font-medium">
                      {sentMessage}
                    </div>
                  </motion.div>

                  {/* AI Thinking Indicator (Unified Style) */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.6 }}
                    className="self-start flex gap-3 px-4 py-3 items-start"
                  >
                    <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 opacity-0">
                       <div className="w-full h-full bg-primary/20" />
                    </div>
                    
                    <div className="bg-muted text-foreground border-border px-4 py-3 rounded-2xl rounded-tl-md shadow-sm">
                      <div className="flex space-x-1 items-center h-6">
                        <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                        <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                        <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce"></div>
                        <span className="text-xs text-muted-foreground ml-2">Pensando...</span>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          <motion.div 
            className="w-full max-w-3xl h-full flex flex-col"
            animate={{ opacity: isSending ? 0 : 1, scale: isSending ? 0.95 : 1 }}
            transition={{ duration: 0.3 }}
          >
            {/* Welcome Card Unified */}
            <div className="bg-card/50 backdrop-blur-sm rounded-xl md:rounded-2xl p-8 md:p-12 border border-border flex flex-col justify-center items-center min-h-[400px]">
              
              <div className="flex justify-center mb-8 flex-shrink-0">
                 {!isSending && <ShaderCanvas size={120} shaderId={selectedShader} />}
                 {isSending && <div className="w-[120px] h-[120px]" />}
              </div>

              <h1 className="text-center text-2xl md:text-4xl mb-12 text-foreground font-light">
                ¿En qué puedo ayudarte hoy?
              </h1>

              <div className="w-full max-w-2xl">
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
                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
                        className={cn(
                          "flex items-center justify-center",
                          "w-10 h-10 rounded-xl",
                          "bg-muted/50 hover:bg-muted",
                          "cursor-pointer transition-colors duration-200",
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
                      disabled={!inputValue}
                    />
                  }
                />
              </div>
            </div>
          </motion.div>
        </div>

        <div className="hidden md:block px-6 py-3 md:py-4 text-center flex-shrink-0">
          <p className="text-xs text-muted-foreground">
            La IA puede cometer errores. Verifica información importante.
          </p>
        </div>
      </div>
    </div>
  )
}
