"use client"

import { useState } from "react"
import { LegalDraft } from "@/types/draft"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface PlaceholderFormProps {
    placeholders: NonNullable<LegalDraft["placeholders"]>
    onInsert: (values: Record<string, string>) => void
    onClose: () => void
}

export function PlaceholderForm({ placeholders, onInsert, onClose }: PlaceholderFormProps) {
    const [values, setValues] = useState<Record<string, string>>(() => {
        // Inicializar con valores vacíos o ejemplos si existen
        const initial: Record<string, string> = {}
        placeholders.forEach(ph => {
            initial[ph.key] = ph.example || ""
        })
        return initial
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        // Filtrar valores vacíos opcionalmente, o permitir todos
        onInsert(values)
    }

    const handleChange = (key: string, value: string) => {
        setValues(prev => ({
            ...prev,
            [key]: value
        }))
    }

    return (
        <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Insertar Placeholders</DialogTitle>
                    <DialogDescription>
                        Completa los valores para reemplazar los placeholders en el documento.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
                        {placeholders.map((placeholder) => (
                            <div key={placeholder.key} className="space-y-2">
                                <Label htmlFor={placeholder.key}>
                                    {placeholder.label}
                                    <span className="ml-2 text-xs text-muted-foreground font-mono">
                                        {"{{"}{placeholder.key}{"}}"}
                                    </span>
                                </Label>
                                <Input
                                    id={placeholder.key}
                                    value={values[placeholder.key] || ""}
                                    onChange={(e) => handleChange(placeholder.key, e.target.value)}
                                    placeholder={placeholder.example || `Ingrese ${placeholder.label.toLowerCase()}`}
                                    className="w-full"
                                />
                                {placeholder.example && (
                                    <p className="text-xs text-muted-foreground">
                                        Ejemplo: {placeholder.example}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancelar
                        </Button>
                        <Button type="submit">
                            Insertar Valores
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}




