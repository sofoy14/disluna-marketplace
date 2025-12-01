"use client"

import { FC, useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Link2, 
  X as XIcon,
  Linkedin,
  MessageCircle,
  Check,
  X
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ShaderCanvas } from "@/components/shader-canvas"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader,
  DialogTitle 
} from "@/components/ui/dialog"
import { toast } from "sonner"

interface ShareMessageModalProps {
  isOpen: boolean
  onClose: () => void
  messageContent: string
}

export const ShareMessageModal: FC<ShareMessageModalProps> = ({
  isOpen,
  onClose,
  messageContent
}) => {
  const [copied, setCopied] = useState(false)
  const [shaderId, setShaderId] = useState<number>(1)

  // Escuchar cambios en el shader seleccionado
  useEffect(() => {
    if (typeof window === 'undefined') return

    const saved = localStorage.getItem('selectedShader')
    if (saved) setShaderId(parseInt(saved, 10))

    const handleShaderChanged = (e: CustomEvent<number>) => {
      setShaderId(e.detail)
    }

    window.addEventListener('shaderChanged', handleShaderChanged as unknown as EventListener)
    return () => {
      window.removeEventListener('shaderChanged', handleShaderChanged as unknown as EventListener)
    }
  }, [])

  // Truncar el mensaje para la vista previa
  const truncatedMessage = messageContent.length > 200 
    ? messageContent.substring(0, 200) + "..." 
    : messageContent

  const handleCopyLink = async () => {
    try {
      // En producción, esto generaría un enlace único al mensaje compartido
      const shareUrl = window.location.href
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      toast.success("Enlace copiado al portapapeles")
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast.error("Error al copiar el enlace")
    }
  }

  const handleShareX = () => {
    const text = encodeURIComponent(truncatedMessage + "\n\nGenerado por ALI - Asistente Legal Inteligente")
    const url = encodeURIComponent(window.location.href)
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank')
  }

  const handleShareLinkedIn = () => {
    const url = encodeURIComponent(window.location.href)
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank')
  }

  const handleShareFacebook = () => {
    const url = encodeURIComponent(window.location.href)
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank')
  }

  const shareOptions = [
    {
      id: "copy",
      label: "Copiar link",
      icon: copied ? Check : Link2,
      onClick: handleCopyLink,
      iconClass: copied ? "text-emerald-500" : ""
    },
    {
      id: "x",
      label: "X",
      icon: () => (
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
      onClick: handleShareX
    },
    {
      id: "linkedin",
      label: "LinkedIn",
      icon: Linkedin,
      onClick: handleShareLinkedIn
    },
    {
      id: "facebook",
      label: "Facebook",
      icon: () => (
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
      onClick: handleShareFacebook
    }
  ]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden bg-background/95 backdrop-blur-xl border-border/50">
        <div className="relative">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 z-10 p-1.5 rounded-full bg-background/80 hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>

          {/* Preview Card */}
          <div className="p-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={cn(
                "relative rounded-2xl p-6 overflow-hidden",
                "bg-gradient-to-br from-card via-card to-muted/30",
                "border border-border/60",
                "shadow-xl"
              )}
            >
              {/* Subtle background pattern */}
              <div className="absolute inset-0 opacity-5">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(var(--primary)),transparent_70%)]" />
              </div>

              {/* Message content */}
              <div className="relative z-10 min-h-[200px]">
                <p className="text-foreground leading-relaxed text-base">
                  {truncatedMessage}
                </p>
              </div>

              {/* Orb with ALI branding - Bottom Right */}
              <motion.div 
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 300, damping: 20 }}
                className="absolute bottom-4 right-4"
              >
                <div className="relative">
                  <div className="rounded-full overflow-hidden ring-2 ring-primary/30 ring-offset-2 ring-offset-background shadow-lg shadow-primary/20">
                    <ShaderCanvas size={56} shaderId={shaderId} />
                  </div>
                  {/* ALI text inside the orb */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span 
                      className="text-sm font-bold tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
                      style={{ color: 'hsl(var(--primary))' }}
                    >
                      ALI
                    </span>
                  </div>
                  {/* Glow effect */}
                  <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl -z-10" />
                </div>
              </motion.div>
            </motion.div>
          </div>

          {/* Share Options */}
          <div className="px-6 pb-6">
            <div className="flex items-center justify-center gap-6">
              {shareOptions.map((option, index) => {
                const Icon = option.icon
                return (
                  <motion.button
                    key={option.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + index * 0.05 }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={option.onClick}
                    className="flex flex-col items-center gap-2 group"
                  >
                    <div className={cn(
                      "p-3.5 rounded-full transition-all duration-200",
                      "bg-muted/50 hover:bg-muted",
                      "border border-border/50 hover:border-primary/30",
                      "shadow-sm hover:shadow-md",
                      option.iconClass
                    )}>
                      {typeof Icon === 'function' && Icon.prototype && Icon.prototype.render ? (
                        <Icon className={cn("w-5 h-5", option.iconClass)} />
                      ) : (
                        <Icon className={cn("w-5 h-5", option.iconClass)} />
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                      {option.label}
                    </span>
                  </motion.button>
                )
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

