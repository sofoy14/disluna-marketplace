"use client"

import { FC, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { Sparkles, ArrowRight, MessageCircle } from "lucide-react"

interface SuggestedQuestionsProps {
  questions: string[]
  onQuestionClick: (question: string) => void
  isVisible: boolean
}

export const SuggestedQuestions: FC<SuggestedQuestionsProps> = ({
  questions,
  onQuestionClick,
  isVisible
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  if (!isVisible || questions.length === 0) {
    return null
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.1,
      }
    },
    exit: {
      opacity: 0,
      y: -10,
      transition: { duration: 0.2 }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 15, scale: 0.9 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 350,
        damping: 25,
      }
    }
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="mt-6 px-4 ml-12"
        >
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.05 }}
            className="flex items-center gap-2 mb-4"
          >
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-amber-400/20 to-orange-500/20 dark:from-amber-400/10 dark:to-orange-500/10">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
            </div>
            <span className="text-sm font-semibold text-foreground/80">
              Continúa explorando
            </span>
            <div className="flex-1 h-px bg-gradient-to-r from-border/60 to-transparent ml-2" />
          </motion.div>

          {/* Questions Grid */}
          <div className="flex flex-col gap-2.5">
            {questions.map((question, index) => (
              <motion.button
                key={index}
                variants={itemVariants}
                whileHover={{ 
                  x: 4,
                  transition: { duration: 0.15 }
                }}
                whileTap={{ scale: 0.98 }}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                onClick={() => onQuestionClick(question)}
                className={cn(
                  "group relative flex items-center gap-3 w-full text-left",
                  "px-4 py-3 rounded-xl",
                  "text-sm font-medium",
                  "transition-all duration-200 ease-out cursor-pointer",
                  "bg-gradient-to-r from-muted/50 to-muted/30",
                  "hover:from-muted/80 hover:to-muted/50",
                  "dark:from-muted/30 dark:to-muted/10",
                  "dark:hover:from-muted/50 dark:hover:to-muted/30",
                  "border border-border/40 hover:border-border/60",
                  "shadow-sm hover:shadow-md",
                  hoveredIndex === index && "border-primary/40 shadow-primary/5"
                )}
              >
                {/* Icon */}
                <div className={cn(
                  "flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg",
                  "bg-gradient-to-br from-primary/10 to-primary/5",
                  "group-hover:from-primary/20 group-hover:to-primary/10",
                  "transition-all duration-200"
                )}>
                  <MessageCircle className={cn(
                    "w-4 h-4 text-primary/70",
                    "group-hover:text-primary transition-colors"
                  )} />
                </div>

                {/* Question text */}
                <span className={cn(
                  "flex-1 text-foreground/80 group-hover:text-foreground",
                  "line-clamp-2 transition-colors duration-200"
                )}>
                  {question}
                </span>

                {/* Arrow indicator */}
                <ArrowRight className={cn(
                  "w-4 h-4 text-muted-foreground/50",
                  "opacity-0 -translate-x-2",
                  "group-hover:opacity-100 group-hover:translate-x-0",
                  "transition-all duration-200"
                )} />

                {/* Hover glow effect */}
                <div className={cn(
                  "absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100",
                  "bg-gradient-to-r from-primary/5 to-transparent",
                  "transition-opacity duration-200 pointer-events-none"
                )} />
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
