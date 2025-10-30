"use client"

import { CheckCircle2, Search, AlertCircle, Loader2, FileText } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface ReasoningStep {
  step: string
  description: string
  status: 'analyzing' | 'requirements' | 'gathering' | 'validating' | 'generating' | 'complete'
}

interface ReasoningStepsProps {
  steps: ReasoningStep[]
}

const stepConfig: Record<ReasoningStep['status'], { icon: React.ReactNode; color: string; label: string }> = {
  analyzing: { 
    icon: <Search className="h-4 w-4" />, 
    color: "bg-blue-500", 
    label: "Analizando" 
  },
  requirements: { 
    icon: <AlertCircle className="h-4 w-4" />, 
    color: "bg-purple-500", 
    label: "Requisitos" 
  },
  gathering: { 
    icon: <AlertCircle className="h-4 w-4" />, 
    color: "bg-yellow-500", 
    label: "Recopilando" 
  },
  validating: { 
    icon: <CheckCircle2 className="h-4 w-4" />, 
    color: "bg-green-500", 
    label: "Validando" 
  },
  generating: { 
    icon: <FileText className="h-4 w-4" />, 
    color: "bg-orange-500", 
    label: "Generando" 
  },
  complete: { 
    icon: <CheckCircle2 className="h-4 w-4" />, 
    color: "bg-green-600", 
    label: "Completado" 
  }
}

export function ReasoningSteps({ steps }: ReasoningStepsProps) {
  if (steps.length === 0) return null

  return (
    <div className="space-y-2">
      {steps.map((step, index) => {
        const config = stepConfig[step.status]
        return (
          <Badge
            key={index}
            variant="outline"
            className={`flex items-center gap-2 border-2 ${config.color} text-white`}
          >
            {config.icon}
            <span className="font-medium">{config.label}:</span>
            <span>{step.description}</span>
          </Badge>
        )
      })}
    </div>
  )
}

