"use client"

import { FC, useState, useRef, useEffect } from "react"
import { useChat } from "ai/react"
import { MessageSquare, Loader2, AlertCircle } from "lucide-react"
// Note: We'll create a simpler input for process chat
import { ProcessStatusBadge } from "./process-status-badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { useScroll } from "@/components/chat/chat-hooks/use-scroll"

interface ProcessChatProps {
  processId: string
  processName: string
  indexingStatus: "pending" | "processing" | "ready" | "error"
  chatId?: string
}

export const ProcessChat: FC<ProcessChatProps> = ({
  processId,
  processName,
  indexingStatus,
  chatId
}) => {
  const [chatSettings, setChatSettings] = useState({
    model: "gpt-4o-mini",
    temperature: 0.3
  })

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error
  } = useChat({
    api: `/api/processes/${processId}/chat`,
    body: {
      chatSettings,
      match_count: 10,
      chatId: chatId || `process-${processId}`
    },
    onError: (error) => {
      console.error("Chat error:", error)
    }
  })

  const {
    messagesStartRef,
    messagesEndRef,
    handleScroll,
    scrollToBottom,
    setIsAtBottom
  } = useScroll()

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const isReady = indexingStatus === "ready"
  const isProcessing = indexingStatus === "processing"
  const isError = indexingStatus === "error"

  return (
    <div className="flex flex-col h-full">
      {/* Banner */}
      <div className="border-b bg-card p-4">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-5 h-5 text-purple-400" />
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">
              Estás chateando sobre el proceso:
            </p>
            <p className="font-semibold">{processName}</p>
          </div>
          <ProcessStatusBadge status={indexingStatus} />
        </div>
      </div>

      {/* Status Alerts */}
      {!isReady && (
        <div className="p-4">
          <Alert
            variant={isError ? "destructive" : "default"}
            className={isProcessing ? "bg-blue-500/10 border-blue-500/30" : ""}
          >
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>
              {isProcessing
                ? "Los documentos se están indexando. Por favor espera unos momentos antes de hacer consultas."
                : isError
                ? "Hubo un error al indexar los documentos. Revisa la pestaña de Documentos para más detalles."
                : "No hay documentos indexados en este proceso. Sube y indexa documentos primero."}
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto"
        onScroll={handleScroll}
        ref={messagesStartRef}
      >
        {messages.length === 0 && isReady && (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <MessageSquare className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">Inicia una conversación</p>
            <p className="text-sm text-muted-foreground max-w-md">
              Haz preguntas sobre los documentos de este proceso. La IA responderá basándose únicamente en la información indexada.
            </p>
          </div>
        )}

        {messages.length > 0 && (
          <div className="p-4 space-y-4">
            {messages.map((message, index) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-4 ${
                    message.role === "user"
                      ? "bg-purple-500/20 text-purple-100"
                      : "bg-muted text-foreground"
                  }`}
                >
                  <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {isLoading && (
          <div className="flex items-center gap-2 p-4 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Pensando...</span>
          </div>
        )}

        {error && (
          <div className="p-4">
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>
                {error.message || "Error al procesar la consulta"}
              </AlertDescription>
            </Alert>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t bg-card p-4">
        <form onSubmit={handleSubmit} className="space-y-2">
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit(e as any)
                }
              }}
              placeholder={
                isReady
                  ? "Escribe tu pregunta sobre los documentos del proceso..."
                  : "Espera a que los documentos se indexen..."
              }
              disabled={!isReady || isLoading}
              className="flex-1 min-h-[60px] rounded-lg border bg-background px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
              rows={2}
            />
            <Button
              type="submit"
              disabled={!isReady || isLoading || !input.trim()}
              size="icon"
              className="h-[60px] w-[60px]"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <MessageSquare className="w-4 h-4" />
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

