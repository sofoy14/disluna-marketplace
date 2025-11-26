import { IconBrain, IconChevronDown, IconChevronUp } from "@tabler/icons-react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

interface ThinkingProcessProps {
  content: string
  isStreaming?: boolean
}

export const ThinkingProcess = ({ content, isStreaming = false }: ThinkingProcessProps) => {
  const [isOpen, setIsOpen] = useState(true)

  if (!content) return null

  return (
    <div className="my-2 rounded-md border border-border/50 bg-secondary/20 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center w-full px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-secondary/40 transition-colors"
      >
        <IconBrain size={14} className="mr-2" />
        <span>Proceso de Pensamiento</span>
        {isStreaming && (
           <span className="ml-2 flex h-2 w-2 relative">
             <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
             <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
           </span>
        )}
        <div className="ml-auto">
          {isOpen ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
        </div>
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-3 py-2 text-xs text-muted-foreground/80 whitespace-pre-wrap border-t border-border/50 bg-background/30 font-mono max-h-[300px] overflow-y-auto">
              {content}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}




