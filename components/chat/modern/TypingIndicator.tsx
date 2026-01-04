'use client'

import { motion } from 'framer-motion'
import { StaticShaderAvatar } from '@/components/ui/static-shader-avatar'

export function TypingIndicator() {
  const dotVariants = {
    initial: { scale: 1, opacity: 0.5 },
    animate: {
      scale: [1, 1.2, 1],
      opacity: [0.5, 1, 0.5],
    },
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="flex gap-3 px-4 py-3"
    >
      {/* Avatar - Consistente con MessageBubble */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 400, damping: 20 }}
        className="w-9 h-9 flex-shrink-0 rounded-full overflow-hidden ring-2 ring-violet-500/20 ring-offset-2 ring-offset-background shadow-lg shadow-violet-500/10"
      >
        <StaticShaderAvatar size={36} />
      </motion.div>

      {/* Typing bubble - Estilo consistente con MessageBubble AI */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.15, type: 'spring', stiffness: 350, damping: 28 }}
        className="relative overflow-hidden flex items-center px-4 py-3.5 rounded-2xl rounded-tl-sm bg-gradient-to-br from-card via-card to-muted/50 border border-border/60 shadow-md shadow-black/5 dark:shadow-black/20 backdrop-blur-sm"
      >
        {/* Glass effect overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />

        <div className="flex items-center gap-2 relative z-10" aria-label="La IA está escribiendo">
          <span className="text-xs font-medium text-muted-foreground">Pensando</span>
          <div className="flex gap-1">
            {[0, 1, 2].map((index) => (
              <motion.div
                key={index}
                variants={dotVariants}
                initial="initial"
                animate="animate"
                transition={{
                  duration: 1.4,
                  repeat: Infinity,
                  delay: index * 0.2,
                  ease: 'easeInOut',
                }}
                className="w-1.5 h-1.5 rounded-full bg-gradient-to-br from-primary to-primary/60 shadow-sm shadow-primary/30"
              />
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
