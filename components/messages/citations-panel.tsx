import { NormalizedCitation } from "@/types/model-answer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible"
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react"
import { useMemo, useState } from "react"

interface CitationsPanelProps {
  items?: NormalizedCitation[]
  className?: string
}

export const CitationsPanel = ({ items, className }: CitationsPanelProps) => {
  const [isOpen, setIsOpen] = useState(false)

  const safeItems = useMemo(
    () =>
      (items ?? []).map((item, idx) => ({
        ...item,
        id: item.id ?? `citation-${idx + 1}`
      })),
    [items]
  )

  if (safeItems.length === 0) return null

  const handleOpenLink = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer")
  }

  return (
    <Card className={`mt-6 border-border/60 bg-muted/10 ${className ?? ""}`}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="flex cursor-pointer flex-row items-center justify-between gap-3 pb-3 hover:bg-muted/30">
            <div>
              <CardTitle className="text-sm font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Fuentes consultadas
              </CardTitle>
              <Badge variant="outline" className="mt-2 text-xs">
                {safeItems.length} {safeItems.length === 1 ? "referencia" : "referencias"}
              </Badge>
            </div>
            {isOpen ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-4 pb-5 pt-2">
            {safeItems.map((item, index) => (
              <div
                key={item.id}
                className="rounded-md border border-border/40 bg-background/70 p-3 shadow-[0_1px_2px_rgba(0,_0,_0,_0.08)] transition-colors hover:bg-background/80"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-snug text-foreground">
                      {index + 1}. {item.title}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {item.type && (
                        <Badge variant="outline" className="uppercase tracking-wide">
                          {item.type}
                        </Badge>
                      )}
                      {item.source && <span>{item.source}</span>}
                      {item.issuedAt && <span>Año {item.issuedAt}</span>}
                    </div>
                    {item.description && (
                      <p className="text-xs leading-snug text-muted-foreground/90">
                        {item.description}
                      </p>
                    )}
                  </div>
                  {item.url ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenLink(item.url!)}
                      className="h-8 w-8 rounded-full"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
