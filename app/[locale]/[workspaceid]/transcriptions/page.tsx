"use client"

import { useState, useEffect, useRef } from "react"
import { toast } from "sonner"
import { Icon } from "@/components/ui/icon"
import { ShaderCanvas } from "@/components/shader-canvas"
import { useParams, useRouter } from "next/navigation"

interface Transcription {
  id: string
  name: string
  description?: string
  transcript?: string
  language?: string
  duration?: number
  tokens?: number
  status: "pending" | "processing" | "completed" | "failed"
  created_at: string
  audio_path: string
}

export default function TranscriptionsPage() {
  const params = useParams()
  const router = useRouter()
  const workspaceId = params.workspaceid as string

  const [transcriptions, setTranscriptions] = useState<Transcription[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchTranscriptions()
  }, [])

  const fetchTranscriptions = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/transcriptions")
      
      if (!response.ok) {
        throw new Error("Failed to fetch transcriptions")
      }

      const data = await response.json()
      setTranscriptions(data.transcriptions || [])
    } catch (error) {
      console.error("Error fetching transcriptions:", error)
      toast.error("Error al cargar transcripciones")
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith("audio/")) {
      toast.error("Por favor sube un archivo de audio válido")
      return
    }

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("name", file.name)
      formData.append("workspace_id", workspaceId || "")

      const response = await fetch("/api/transcriptions/upload", {
        method: "POST",
        body: formData
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to upload audio")
      }

      const data = await response.json()
      
      // Iniciar transcripción automáticamente
      if (data.transcription?.id) {
        toast.success("Audio subido. Iniciando transcripción...")
        
        // Llamar a la API de transcripción
        await fetch("/api/transcriptions/transcribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transcription_id: data.transcription.id,
            audio_path: data.transcription.audio_path
          })
        }).catch(err => {
          console.error("Error starting transcription:", err)
          toast.error("Error al iniciar transcripción")
        })
      }
      
      // Recargar lista después de un breve delay
      setTimeout(() => {
        fetchTranscriptions()
      }, 2000)

    } catch (error: any) {
      console.error("Error uploading audio:", error)
      toast.error(error.message || "Error al subir audio")
    } finally {
      setIsUploading(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "N/A"
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400",
      processing: "bg-primary/20 text-primary",
      completed: "bg-green-500/20 text-green-600 dark:text-green-400",
      failed: "bg-red-500/20 text-red-600 dark:text-red-400"
    }
    
    const labels = {
      pending: "Pendiente",
      processing: "Procesando",
      completed: "Completado",
      failed: "Error"
    }

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badges[status as keyof typeof badges]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    )
  }

  if (isLoading && transcriptions.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Icon.Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Cargando transcripciones...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header eliminado */}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {transcriptions.length === 0 ? (
          /* Empty state - Upload card */
          <div className="flex items-center justify-center h-full">
            <div className="max-w-2xl w-full">
              <div
                className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
                  isDragging ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="flex items-center justify-center mx-auto mb-4">
                  <ShaderCanvas size={80} />
                </div>
                
                <h2 className="text-xl font-semibold mb-2 text-foreground">Transcribe a texto tu primer audio</h2>
                <p className="text-muted-foreground mb-6">
                  Sube un archivo de audio para transcribirlo a texto. Luego podrás hacerle consultas a Ariel acerca de ese audio.
                </p>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {isUploading ? (
                    <>
                      <Icon.Loader2 className="h-5 w-5 animate-spin" />
                      Subiendo audio...
                    </>
                  ) : (
                    <>
                      <Icon.Upload className="h-5 w-5" />
                      Subir audio
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* List of transcriptions */
          <div className="grid gap-4">
            {transcriptions.map((transcription) => (
              <div
                key={transcription.id}
                className="border rounded-lg p-6 hover:border-primary transition-colors cursor-pointer"
                onClick={() => router.push(`/${workspaceId}/transcriptions/${transcription.id}`)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Icon.Mic className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold text-lg">{transcription.name}</h3>
                      {getStatusBadge(transcription.status)}
                    </div>
                    
                    {transcription.description && (
                      <p className="text-muted-foreground text-sm mb-2">{transcription.description}</p>
                    )}

                    {transcription.status === "completed" && (
                      <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Duración:</span>
                          <span className="ml-2 font-medium text-foreground">{formatDuration(transcription.duration)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Idioma:</span>
                          <span className="ml-2 font-medium text-foreground">{transcription.language?.toUpperCase() || "N/A"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Tokens:</span>
                          <span className="ml-2 font-medium text-foreground">{transcription.tokens || 0}</span>
                        </div>
                      </div>
                    )}

                    {transcription.status === "completed" && transcription.transcript && (
                      <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                        <p className="text-sm text-foreground line-clamp-3">
                          {transcription.transcript}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <span className="text-xs text-muted-foreground">
                      {new Date(transcription.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

