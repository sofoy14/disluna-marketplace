import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

interface ProcessChatStatusProps {
    indexingStatus: "pending" | "processing" | "ready" | "error"
}

export function ProcessChatStatus({ indexingStatus }: ProcessChatStatusProps) {
    const isReady = indexingStatus === "ready"
    const isProcessing = indexingStatus === "processing"
    const isError = indexingStatus === "error"

    if (isReady) return null

    return (
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
    )
}
