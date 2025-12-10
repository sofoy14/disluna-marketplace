"use client"

import { useState, useEffect, useRef, useContext } from "react"
import { toast } from "sonner"
import { Icon } from "@/components/ui/icon"
import { ShaderCanvas } from "@/components/shader-canvas"
import { useParams, useRouter } from "next/navigation"
import { useProfilePlan } from "@/lib/hooks/use-profile-plan"
import { Crown, ArrowRight } from "lucide-react"
import Link from "next/link"
import { ALIContext } from "@/context/context"

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
  const { transcriptions: contextTranscriptions, setTranscriptions } = useContext(ALIContext)
  
  // Plan access control - simplified using profile
  const { 
    isLoading: planLoading, 
    canShowTranscriptions, 
    hasActivePlan
  } = useProfilePlan()

  const [transcriptions, setLocalTranscriptions] = useState<Transcription[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [selectedShader, setSelectedShader] = useState(1)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Use context transcriptions if available, otherwise fetch
    if (contextTranscriptions && contextTranscriptions.length > 0) {
      setLocalTranscriptions(contextTranscriptions as any)
    } else {
      fetchTranscriptions()
    }
    
    // Cargar shader guardado
    if (typeof window !== 'undefined') {
      const savedShader = localStorage.getItem('selectedShader')
      if (savedShader) {
        setSelectedShader(parseInt(savedShader, 10))
      }

      // Escuchar cambios de shader
      const handleShaderChanged = (e: CustomEvent<number>) => {
        setSelectedShader(e.detail)
      }

      window.addEventListener('shaderChanged', handleShaderChanged as EventListener)
      return () => {
        window.removeEventListener('shaderChanged', handleShaderChanged as EventListener)
      }
    }
  }, [])

  const fetchTranscriptions = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/transcriptions")
      
      if (!response.ok) {
        throw new Error("Failed to fetch transcriptions")
      }

      const data = await response.json()
      const fetchedTranscriptions = data.transcriptions || []
      setLocalTranscriptions(fetchedTranscriptions)
      // Update context as well
      setTranscriptions(fetchedTranscriptions as any)
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
      
      const transcriptionId = data.transcription?.id
      
      // Recargar lista después de un breve delay
      setTimeout(() => {
        fetchTranscriptions()
      }, 3000)
      
      // Poll for completion if we have a transcription ID
      if (transcriptionId) {
        const pollInterval = setInterval(async () => {
          const response = await fetch("/api/transcriptions")
          if (response.ok) {
            const pollData = await response.json()
            const updated = pollData.transcriptions || []
            setLocalTranscriptions(updated)
            setTranscriptions(updated as any)
            
            const transcription = updated.find((t: Transcription) => t.id === transcriptionId)
            if (transcription && transcription.status === "completed") {
              clearInterval(pollInterval)
              toast.success("Transcripción completada")
            } else if (transcription && transcription.status === "failed") {
              clearInterval(pollInterval)
              toast.error("Error en la transcripción")
            }
          }
        }, 2000)
        
        // Stop polling after 5 minutes
        setTimeout(() => clearInterval(pollInterval), 300000)
      }

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

  // Show loading while checking plan
  if (planLoading || (isLoading && transcriptions.length === 0)) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Icon.Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Cargando...</p>
        </div>
      </div>
    )
  }
  
  // Access denied for student plan
  if (!canShowTranscriptions && hasActivePlan) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <div className="max-w-md w-full mx-4">
          <div className="bg-card border border-border rounded-2xl p-8 shadow-xl">
            <div className="flex justify-center mb-6">
              <div className="p-4 rounded-full bg-gradient-to-br from-amber-500/20 to-amber-600/20 border border-amber-500/30">
                <Crown className="w-10 h-10 text-amber-500" />
              </div>
            </div>
            
            <h2 className="text-2xl font-bold text-center mb-3 text-foreground">
              Función exclusiva del Plan Profesional
            </h2>
            
            <p className="text-muted-foreground text-center mb-6">
              Las transcripciones de audio están disponibles únicamente en el Plan Profesional. 
              Actualiza tu suscripción para acceder a esta funcionalidad.
            </p>
            
            <div className="bg-muted/50 rounded-xl p-4 mb-6">
              <h3 className="font-semibold text-sm text-foreground mb-2">Con el Plan Profesional obtienes:</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  5 horas de transcripción de audio al mes
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  7 procesos legales incluidos
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Múltiples espacios de trabajo
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Tokens ilimitados
                </li>
              </ul>
            </div>
            
            <div className="flex flex-col gap-3">
              <Link
                href="/precios"
                className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-amber-500/25"
              >
                Actualizar a Profesional
                <ArrowRight className="w-4 h-4" />
              </Link>
              
              <button
                onClick={() => router.push(`/${workspaceId}/chat`)}
                className="w-full py-3 px-4 text-muted-foreground hover:text-foreground font-medium rounded-xl transition-colors"
              >
                Volver al chat
              </button>
            </div>
          </div>
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
                  <ShaderCanvas size={80} shaderId={selectedShader} />
                </div>
                
                <h2 className="text-xl font-semibold mb-2 text-foreground">Transcribe a texto tu primer audio</h2>
                <p className="text-muted-foreground mb-6">
                  Sube o arrastra tu archivo de audio aquí para transcribirlo a texto, luego podrás hacerle consultas a el Asistente Legal Inteligente sobre la información de la grabación
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
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
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

