"use client"

import { FC, useState } from "react"
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
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

interface EditProcessModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    process: {
        id: string
        name: string
        description?: string
        status?: string
        process_number?: string
        process_type?: string
        client_name?: string
    }
    onSuccess?: () => void
}

type ProcessType = "civil" | "penal" | "laboral" | "administrativo" | "constitucional" | "otro"
type ProcessStatus = "activo" | "archivado" | "cerrado"

const PROCESS_TYPES: { value: ProcessType; label: string }[] = [
    { value: "civil", label: "Civil" },
    { value: "penal", label: "Penal" },
    { value: "laboral", label: "Laboral" },
    { value: "administrativo", label: "Administrativo" },
    { value: "constitucional", label: "Constitucional" },
    { value: "otro", label: "Otro" },
]

const PROCESS_STATUSES: { value: ProcessStatus; label: string }[] = [
    { value: "activo", label: "Activo" },
    { value: "archivado", label: "Archivado" },
    { value: "cerrado", label: "Cerrado" },
]

export const EditProcessModal: FC<EditProcessModalProps> = ({
    open,
    onOpenChange,
    process,
    onSuccess
}) => {
    const [formData, setFormData] = useState({
        name: process.name,
        description: process.description || "",
        status: process.status || "activo",
        process_number: process.process_number || "",
        process_type: process.process_type || "",
        client_name: process.client_name || "",
    })
    const [isSaving, setIsSaving] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!formData.name.trim()) {
            toast.error("El nombre del proceso es requerido")
            return
        }

        setIsSaving(true)
        try {
            const response = await fetch(`/api/processes/${process.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(formData)
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || "Error al actualizar el proceso")
            }

            toast.success("Proceso actualizado correctamente")
            onOpenChange(false)
            onSuccess?.()
        } catch (error: any) {
            console.error("Error updating process:", error)
            toast.error(error.message || "Error al actualizar el proceso")
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-card border-border sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="text-foreground">Editar Proceso</DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                        Modifica los detalles del proceso legal
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nombre *</Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Ej: Divorcio García vs López"
                            className="bg-background"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Descripción</Label>
                        <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Descripción breve del caso..."
                            rows={3}
                            className="bg-background resize-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="status">Estado</Label>
                            <Select
                                value={formData.status}
                                onValueChange={(value) => setFormData({ ...formData, status: value })}
                            >
                                <SelectTrigger className="bg-background">
                                    <SelectValue placeholder="Seleccionar estado" />
                                </SelectTrigger>
                                <SelectContent>
                                    {PROCESS_STATUSES.map((status) => (
                                        <SelectItem key={status.value} value={status.value}>
                                            {status.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="process_type">Tipo de Proceso</Label>
                            <Select
                                value={formData.process_type}
                                onValueChange={(value) => setFormData({ ...formData, process_type: value })}
                            >
                                <SelectTrigger className="bg-background">
                                    <SelectValue placeholder="Seleccionar tipo" />
                                </SelectTrigger>
                                <SelectContent>
                                    {PROCESS_TYPES.map((type) => (
                                        <SelectItem key={type.value} value={type.value}>
                                            {type.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="process_number">Número de Radicado</Label>
                            <Input
                                id="process_number"
                                value={formData.process_number}
                                onChange={(e) => setFormData({ ...formData, process_number: e.target.value })}
                                placeholder="Ej: 2024-00123"
                                className="bg-background"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="client_name">Cliente</Label>
                            <Input
                                id="client_name"
                                value={formData.client_name}
                                onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                                placeholder="Nombre del cliente"
                                className="bg-background"
                            />
                        </div>
                    </div>

                    <DialogFooter className="pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isSaving}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isSaving}>
                            {isSaving ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Guardando...
                                </>
                            ) : (
                                "Guardar Cambios"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
