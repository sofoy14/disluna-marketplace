"use client"

import { useState } from "react"
import { FollowUpBubbles } from "./follow-up-bubbles"

// Ejemplo de cómo integrar FollowUpBubbles en un chat
export function FollowUpBubblesExample() {
  const [selectedQuestion, setSelectedQuestion] = useState<string>("")
  const [messages, setMessages] = useState<Array<{role: 'user' | 'bot', content: string}>>([
    { role: 'bot', content: '¿Cuándo firmaste el contrato y con qué empresa?' }
  ])

  const handleSelect = (question: string) => {
    setSelectedQuestion(question)
    setMessages(prev => [...prev, { role: 'user', content: question }])
    
    // Simular respuesta del bot después de 1 segundo
    setTimeout(() => {
      setMessages(prev => [...prev, { 
        role: 'bot', 
        content: 'Gracias por esa información. ¿Podrías proporcionarme más detalles sobre tu cargo?' 
      }])
    }, 1000)
  }

  const lastBotMessage = messages.filter(m => m.role === 'bot').pop()?.content || ""

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <h2 className="text-2xl font-bold mb-4">Ejemplo de FollowUpBubbles</h2>
      
      {/* Chat messages */}
      <div className="space-y-2 mb-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`p-3 rounded-lg ${
              message.role === 'user' 
                ? 'bg-primary text-primary-foreground ml-auto max-w-[80%]' 
                : 'bg-muted text-muted-foreground mr-auto max-w-[80%]'
            }`}
          >
            {message.content}
          </div>
        ))}
      </div>

      {/* Follow-up bubbles */}
      <FollowUpBubbles
        lastBotQuestion={lastBotMessage}
        jurisdiction="Colombia"
        practiceArea="laboral"
        onSelect={handleSelect}
      />

      {/* Mostrar pregunta seleccionada */}
      {selectedQuestion && (
        <div className="mt-4 p-3 bg-green-100 dark:bg-green-900 rounded-lg">
          <p className="text-sm font-medium">Pregunta seleccionada:</p>
          <p className="text-sm">{selectedQuestion}</p>
        </div>
      )}
    </div>
  )
}

// Ejemplos de uso según los requerimientos
export function EjemplosRequeridos() {
  const [selected, setSelected] = useState("")

  return (
    <div className="space-y-8 p-6">
      <h2 className="text-xl font-bold">Ejemplos según requerimientos</h2>
      
      {/* Ejemplo 1: Laboral */}
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold mb-2">Ejemplo 1 - Laboral:</h3>
        <p className="text-sm text-muted-foreground mb-3">
          lastBotQuestion: "¿Cuándo firmaste el contrato y con qué empresa?"
        </p>
        <FollowUpBubbles
          lastBotQuestion="¿Cuándo firmaste el contrato y con qué empresa?"
          jurisdiction="Colombia"
          practiceArea="laboral"
          onSelect={setSelected}
        />
      </div>

      {/* Ejemplo 2: Penal */}
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold mb-2">Ejemplo 2 - Penal:</h3>
        <p className="text-sm text-muted-foreground mb-3">
          lastBotQuestion: "¿En qué ciudad ocurrió el hecho?"
        </p>
        <FollowUpBubbles
          lastBotQuestion="¿En qué ciudad ocurrió el hecho?"
          practiceArea="penal"
          onSelect={setSelected}
        />
      </div>

      {/* Ejemplo 3: Civil */}
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold mb-2">Ejemplo 3 - Civil:</h3>
        <p className="text-sm text-muted-foreground mb-3">
          lastBotQuestion: "¿Cuál es el valor adeudado y desde cuándo?"
        </p>
        <FollowUpBubbles
          lastBotQuestion="¿Cuál es el valor adeudado y desde cuándo?"
          practiceArea="civil"
          onSelect={setSelected}
        />
      </div>

      {/* Ejemplo 4: Familia */}
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold mb-2">Ejemplo 4 - Familia:</h3>
        <p className="text-sm text-muted-foreground mb-3">
          lastBotQuestion: "¿Buscas divorcio de mutuo acuerdo o contencioso?"
        </p>
        <FollowUpBubbles
          lastBotQuestion="¿Buscas divorcio de mutuo acuerdo o contencioso?"
          practiceArea="familia"
          onSelect={setSelected}
        />
      </div>

      {selected && (
        <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
          <p className="text-sm font-medium">Última selección:</p>
          <p className="text-sm">{selected}</p>
        </div>
      )}
    </div>
  )
}

export default FollowUpBubblesExample
