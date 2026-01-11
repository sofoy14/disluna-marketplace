'use client'

import { motion } from 'framer-motion'
import { StaticShaderAvatar } from '@/components/ui/static-shader-avatar'

export function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="flex gap-3 px-4 py-3"
    >
      <style jsx>{`
        @keyframes typing-bounce {
          0%, 80%, 100% { transform: scale(1); opacity: 0.5; }
          40% { transform: scale(1.2); opacity: 1; }
        }
        .dot-pulse {
          animation: typing-bounce 1.4s infinite ease-in-out both;
        }
        .dot-pulse:nth-child(1) { animation-delay: -0.32s; }
        .dot-pulse:nth-child(2) { animation-delay: -0.16s; }
      `}</style>

      {/* Avatar - Consistente con MessageBubble */}
      <div className="w-9 h-9 flex-shrink-0 rounded-full overflow-hidden ring-2 ring-violet-500/20 ring-offset-2 ring-offset-background shadow-lg shadow-violet-500/10">
        <StaticShaderAvatar size={36} />
      </div>

      {/* Typing bubble - Estilo consistente con MessageBubble AI */}
      <div className="relative overflow-hidden flex items-center px-4 py-3.5 rounded-2xl rounded-tl-sm bg-gradient-to-br from-card via-card to-muted/50 border border-border/60 shadow-md shadow-black/5 dark:shadow-black/20 backdrop-blur-sm">
        {/* Glass effect overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />

        <div className="flex items-center gap-2 relative z-10" aria-label="La IA está escribiendo">
          <span className="text-xs font-medium text-muted-foreground">Pensando</span>
          <div className="flex gap-1.5">
            {[0, 1, 2].map((index) => (
              <div
                key={index}
                className="dot-pulse w-1.5 h-1.5 rounded-full bg-gradient-to-br from-primary to-primary/60 shadow-sm shadow-primary/30"
              />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
