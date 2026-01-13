"use client"

import { FC } from "react"
import { Info } from "lucide-react"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

export type SearchType = 'vector' | 'graph' | 'hybrid'

interface SearchTypeSelectorProps {
    value: SearchType
    onChange: (value: SearchType) => void
    disabled?: boolean
}

export const SearchTypeSelector: FC<SearchTypeSelectorProps> = ({
    value,
    onChange,
    disabled = false
}) => {
    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">Tipo de Búsqueda</Label>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                            <p className="text-sm">
                                Selecciona cómo la IA buscará información en tus documentos
                            </p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>

            <RadioGroup
                value={value}
                onValueChange={(val) => onChange(val as SearchType)}
                disabled={disabled}
                className="space-y-2"
            >
                {/* Hybrid */}
                <div className="flex items-start space-x-3 rounded-lg border p-3 hover:bg-accent/50 transition-colors">
                    <RadioGroupItem value="hybrid" id="hybrid" className="mt-0.5" />
                    <div className="flex-1 space-y-1">
                        <Label
                            htmlFor="hybrid"
                            className="font-medium cursor-pointer flex items-center gap-2"
                        >
                            Híbrida
                            <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">
                                Recomendado
                            </span>
                        </Label>
                        <p className="text-xs text-muted-foreground">
                            Combina búsqueda semántica y grafo de conocimiento para resultados óptimos
                        </p>
                    </div>
                </div>

                {/* Vector */}
                <div className="flex items-start space-x-3 rounded-lg border p-3 hover:bg-accent/50 transition-colors">
                    <RadioGroupItem value="vector" id="vector" className="mt-0.5" />
                    <div className="flex-1 space-y-1">
                        <Label htmlFor="vector" className="font-medium cursor-pointer">
                            Vectorial
                        </Label>
                        <p className="text-xs text-muted-foreground">
                            Búsqueda semántica basada en embeddings (significado similar)
                        </p>
                    </div>
                </div>

                {/* Graph */}
                <div className="flex items-start space-x-3 rounded-lg border p-3 hover:bg-accent/50 transition-colors">
                    <RadioGroupItem value="graph" id="graph" className="mt-0.5" />
                    <div className="flex-1 space-y-1">
                        <Label htmlFor="graph" className="font-medium cursor-pointer">
                            Grafo
                        </Label>
                        <p className="text-xs text-muted-foreground">
                            Búsqueda en grafo de conocimiento (relaciones contextuales)
                        </p>
                    </div>
                </div>
            </RadioGroup>
        </div>
    )
}
