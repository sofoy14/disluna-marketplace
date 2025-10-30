"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, ArrowRight } from "lucide-react"
import { ChatInput } from "./chat-input"
import { useContext } from "react"
import { ChatbotUIContext } from "@/context/context"

interface Suggestion {
  id: string
  title: string
  prompt: string
}

const suggestions: Suggestion[] = [
  {
    id: "tutela-salud",
    title: "Acción de tutela por cirugía",
    prompt: "Redacta una acción de tutela para que mi EPS cubra una cirugía que no está en el POS o PBS"
  },
  {
    id: "contrato-arrendamiento",
    title: "Contrato de arrendamiento",
    prompt: "Redacta un contrato de arrendamiento para Barranquilla por COP 2.5M mensuales con renovación y ajuste anual por IPC"
  },
  {
    id: "disolucion-sociedad",
    title: "Disolución de sociedad",
    prompt: "Proyecta un acuerdo de disolución de sociedad en comandita por mutuo acuerdo de todos los socios"
  },
  {
    id: "solicitud-sentencias",
    title: "Solicitud de sentencias",
    prompt: "Redacta una solicitud de sentencias recientes al Tribunal Superior de Bogotá"
  }
]

export function LegalWritingScreen() {
  const { setUserInput } = useContext(ChatbotUIContext)

  const handleSuggestionClick = (prompt: string) => {
    setUserInput(prompt)
  }

  return (
    <div className="flex h-full w-full flex-col bg-white dark:bg-gray-950">
      {/* Header */}
      <div className="border-b bg-white px-6 py-4 dark:bg-gray-950">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900">
            <FileText className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Redactar documento</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Genera bocetos personalizados de contratos, peticiones, acciones de tutela y más.
            </p>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="flex-1 overflow-auto px-6 py-8">
        <div className="mx-auto max-w-4xl">
          {/* Sugerencias */}
          <div>
            <h3 className="mb-4 text-lg font-semibold">Sugerencias</h3>
            <div className="grid gap-4 md:grid-cols-2">
              {suggestions.map((suggestion) => (
                <Card
                  key={suggestion.id}
                  className="cursor-pointer transition-all hover:border-primary hover:shadow-md"
                  onClick={() => handleSuggestionClick(suggestion.prompt)}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{suggestion.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {suggestion.prompt}
                    </p>
                    <ArrowRight className="mt-2 h-4 w-4 text-gray-400" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Input de chat */}
      <div className="border-t bg-white px-6 py-4 dark:bg-gray-950">
        <div className="mx-auto max-w-4xl">
          <ChatInput />
        </div>
      </div>
    </div>
  )
}

