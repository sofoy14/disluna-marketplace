"use client"

import { type ReactElement } from "react"
import { type PromptBlock } from "@/lib/stream-processor"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, AlertCircle, Search } from "lucide-react"

interface PromptRequestProps {
  payload: PromptBlock
}

const statusConfig: Record<PromptBlock["items"][number]["status"], {
  label: string
  icon: ReactElement
  badgeClass: string
}> = {
  pending: {
    label: "Falta",
    icon: <AlertCircle className="h-4 w-4" />, 
    badgeClass: "bg-amber-100 text-amber-800 border-amber-200"
  },
  collected: {
    label: "Completo",
    icon: <CheckCircle className="h-4 w-4" />, 
    badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-200"
  },
  needs_search: {
    label: "En revision",
    icon: <Search className="h-4 w-4" />, 
    badgeClass: "bg-blue-100 text-blue-800 border-blue-200"
  }
}

export function PromptRequest({ payload }: PromptRequestProps) {
  const pendingItems = payload.items.filter(item => item.status !== "collected")
  const completedItems = payload.items.filter(item => item.status === "collected")

  const renderItem = (item: PromptBlock["items"][number]) => {
    const config = statusConfig[item.status]
    return (
      <li key={item.id} className="rounded-lg border border-border bg-muted/60 p-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-foreground">
              {item.name}
            </p>
            {item.description && (
              <p className="mt-1 text-sm text-muted-foreground">
                {item.description}
              </p>
            )}
            {item.legalBasis && (
              <p className="mt-1 text-xs font-medium text-muted-foreground">
                Sustento: {item.legalBasis}
              </p>
            )}
          </div>
          <Badge variant="outline" className={`flex items-center gap-1 text-xs ${config.badgeClass}`}>
            {config.icon}
            {config.label}
          </Badge>
        </div>
      </li>
    )
  }

  return (
    <Card className="border-primary/40 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-primary">
          {payload.headline}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Documento: {payload.documentType}
        </p>
        {payload.referenceNote && (
          <p className="text-xs text-primary/80">
            {payload.referenceNote}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {pendingItems.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-medium text-foreground">Datos pendientes</p>
            <ul className="space-y-2">
              {pendingItems.map(renderItem)}
            </ul>
          </div>
        )}
        {completedItems.length > 0 && (
          <div className="border-t border-border/60 pt-3">
            <p className="mb-2 text-sm font-medium text-foreground">Informacion recopilada</p>
            <ul className="space-y-2">
              {completedItems.map(renderItem)}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
