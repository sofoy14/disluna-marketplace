import { Badge } from "@/components/ui/badge"
import { Tables } from "@/supabase/types"
import { IconMicrophone, IconClock, IconLanguage } from "@tabler/icons-react"
import { FC, useRef, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { UpdateTranscription } from "./update-transcription"

interface TranscriptionItemProps {
  transcription: Tables<"transcriptions">
}

const itemVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { type: 'spring', stiffness: 400, damping: 30 }
  }
}

export const TranscriptionItem: FC<TranscriptionItemProps> = ({ transcription }) => {
  const router = useRouter()
  const params = useParams()
  const workspaceId = params.workspaceid as string
  const [showActions, setShowActions] = useState(false)
  const itemRef = useRef<HTMLDivElement>(null)

  // Formatear duración
  const formatDuration = (seconds?: number) => {
    if (!seconds) return "N/A"
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  // Obtener badge de estado
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
      <Badge className={badges[status as keyof typeof badges]}>
        {labels[status as keyof typeof labels]}
      </Badge>
    )
  }

  // Formatear fecha relativa
  const getFormattedDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
      
      if (diffInSeconds < 60) return "hace unos momentos"
      if (diffInSeconds < 3600) return `hace ${Math.floor(diffInSeconds / 60)} min`
      if (diffInSeconds < 86400) return `hace ${Math.floor(diffInSeconds / 3600)} h`
      if (diffInSeconds < 604800) return `hace ${Math.floor(diffInSeconds / 86400)} días`
      if (diffInSeconds < 2592000) return `hace ${Math.floor(diffInSeconds / 604800)} semanas`
      if (diffInSeconds < 31536000) return `hace ${Math.floor(diffInSeconds / 2592000)} meses`
      return `hace ${Math.floor(diffInSeconds / 31536000)} años`
    } catch {
      return "recientemente"
    }
  }

  const handleClick = () => {
    if (!workspaceId) return
    router.push(`/${workspaceId}/transcriptions/${transcription.id}`)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter") {
      e.stopPropagation()
      itemRef.current?.click()
    }
  }

  return (
    <UpdateTranscription transcription={transcription}>
      <motion.div
        ref={itemRef}
        variants={itemVariants}
        initial="hidden"
        animate="visible"
        className={cn(
          "group relative flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200",
          "hover:bg-foreground/5 hover:shadow-sm",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        )}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onClick={handleClick}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        <div className="flex-shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <IconMicrophone className="h-4 w-4 text-primary" />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="truncate text-sm font-medium text-foreground">
              {transcription.name}
            </p>
            {getStatusBadge(transcription.status)}
          </div>
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {transcription.status === "completed" && transcription.duration && (
              <div className="flex items-center gap-1">
                <IconClock className="h-3 w-3" />
                <span>{formatDuration(transcription.duration)}</span>
              </div>
            )}
            {transcription.language && (
              <div className="flex items-center gap-1">
                <IconLanguage className="h-3 w-3" />
                <span>{transcription.language.toUpperCase()}</span>
              </div>
            )}
            <span className="text-[10px]">•</span>
            <span>{getFormattedDate(transcription.created_at)}</span>
          </div>
        </div>
      </motion.div>
    </UpdateTranscription>
  )
}

