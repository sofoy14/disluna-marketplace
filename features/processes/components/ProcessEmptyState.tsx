import { Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { es } from "@/lib/i18n/es"

interface ProcessEmptyStateProps {
  onCreate: () => void
}

export function ProcessEmptyState({ onCreate }: ProcessEmptyStateProps) {
  return (
    <div className="premium-card flex flex-col items-center justify-center text-center px-8 py-12 animate-in fade-in">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6">
        <Sparkles className="w-8 h-8 text-primary" />
      </div>
      <h2 className="text-xl font-semibold mb-2">{es.processes.empty.title}</h2>
      <p className="text-sm text-muted-foreground max-w-md mb-6">
        {es.processes.empty.description}
      </p>
      <Button onClick={onCreate} className="glow-cta">
        {es.processes.empty.cta}
      </Button>
    </div>
  )
}
