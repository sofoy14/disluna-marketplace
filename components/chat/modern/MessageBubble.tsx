'use client'

import { motion } from 'framer-motion'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ShaderCanvas } from '@/components/shader-canvas'
import { cn } from '@/lib/utils'
import { Check, CheckCheck, Clock, AlertCircle, Copy, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { MessageActionBar } from '@/components/messages/message-action-bar'

interface MessageBubbleProps {
  variant: 'user' | 'ai' | 'system'
  content: string
  timestamp: Date
  status?: 'sending' | 'sent' | 'delivered' | 'error'
  avatar?: string
  userName?: string
  onCopy?: () => void
  onRegenerate?: () => void
  onBranchChat?: () => void
  onReport?: () => void
  onLike?: () => void
  onDislike?: () => void
  isLast?: boolean
  isGenerating?: boolean
  children?: React.ReactNode
}

const statusIcons = {
  sending: Clock,
  sent: Check,
  delivered: CheckCheck,
  error: AlertCircle,
}

export function MessageBubble({
  variant,
  content,
  timestamp,
  status = 'delivered',
  avatar,
  userName = 'Usuario',
  onCopy,
  onRegenerate,
  onBranchChat,
  onReport,
  onLike,
  onDislike,
  isLast = false,
  isGenerating = false,
  children
}: MessageBubbleProps) {
  const [copied, setCopied] = useState(false)
  const isUser = variant === 'user'
  const isAI = variant === 'ai'
  const isSystem = variant === 'system'

  // Shader seleccionado por el usuario en panel de personalización
  const [shaderId, setShaderId] = useState<number>(1)

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

  const StatusIcon = statusIcons[status]

  const handleCopy = () => {
    if (onCopy) {
      onCopy()
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (isSystem) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10, filter: 'blur(8px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="flex justify-center my-4"
      >
        <div className="px-5 py-2.5 rounded-full bg-gradient-to-r from-muted/80 to-muted/60 backdrop-blur-sm text-muted-foreground text-sm font-medium border border-border/50 shadow-sm">
          {content}
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        type: 'spring',
        stiffness: 350,
        damping: 28,
      }}
      className={cn(
        'group flex gap-3 px-4 py-3',
        isUser && 'flex-row-reverse',
      )}
    >
      {/* Avatar: usuario con foto; asistente con ShaderCanvas */}
      {isUser ? (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 400, damping: 20 }}
        >
          <Avatar className="w-9 h-9 flex-shrink-0 ring-2 ring-primary/20 ring-offset-2 ring-offset-background shadow-lg">
            <AvatarImage src={avatar} alt={userName} />
            <AvatarFallback className={cn(
              'text-xs font-semibold',
              'bg-gradient-to-br from-primary to-primary/70 text-primary-foreground'
            )}>
              {userName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </motion.div>
      ) : (
        <motion.div 
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 400, damping: 20 }}
          className="w-9 h-9 flex-shrink-0 rounded-full overflow-hidden ring-2 ring-violet-500/20 ring-offset-2 ring-offset-background shadow-lg shadow-violet-500/10"
        >
          <ShaderCanvas size={36} shaderId={shaderId} />
        </motion.div>
      )}

      {/* Message Container */}
      <div className={cn(
        'flex flex-col gap-2',
        isUser ? 'items-end max-w-[70%] sm:max-w-[70%]' : 'items-start max-w-[80%] sm:max-w-[75%]'
      )}>
        {/* Bubble */}
        <motion.div
          whileHover={{ scale: 1.005 }}
          transition={{ duration: 0.15 }}
          className={cn(
            'relative overflow-hidden',
            'px-4 py-3.5 rounded-2xl',
            'transition-all duration-200',
            isUser && [
              'bg-gradient-to-br from-primary via-primary to-primary/90',
              'text-primary-foreground',
              'rounded-tr-sm',
              'shadow-lg shadow-primary/25',
              'hover:shadow-xl hover:shadow-primary/30',
              'border-0',
            ],
            isAI && [
              'bg-gradient-to-br from-card via-card to-muted/50',
              'text-card-foreground',
              'rounded-tl-sm',
              'border border-border/60',
              'shadow-md shadow-black/5 dark:shadow-black/20',
              'hover:shadow-lg hover:border-border/80',
              'backdrop-blur-sm',
            ],
          )}
        >
          {/* Subtle glass effect overlay for AI messages */}
          {isAI && (
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
          )}
          
          {/* Shine effect for user messages */}
          {isUser && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out pointer-events-none" />
          )}

          {/* Content */}
          {children || (
            <div className={cn(
              'text-[15px] leading-relaxed whitespace-pre-wrap relative z-10',
              isUser && 'font-medium',
              isAI && 'font-normal',
            )}>
              {content}
            </div>
          )}

        </motion.div>

        {/* Action Bar for AI messages */}
        {isAI && onCopy && (
          <MessageActionBar
            messageContent={typeof children === 'string' ? children : content}
            isAssistant={true}
            isLast={isLast}
            isGenerating={isGenerating}
            onCopy={onCopy}
            onRegenerate={onRegenerate}
            onBranchChat={onBranchChat}
            onReport={onReport}
            onLike={onLike}
            onDislike={onDislike}
          />
        )}
      </div>
    </motion.div>
  )
}

