"use client"

import { FC, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Copy, 
  ThumbsUp, 
  ThumbsDown, 
  Share2, 
  RefreshCw, 
  GitBranch, 
  Flag,
  Check
} from "lucide-react"
import { cn } from "@/lib/utils"
import { WithTooltip } from "../ui/with-tooltip"
import { ShareMessageModal } from "./share-message-modal"

interface MessageActionBarProps {
  messageContent: string
  isAssistant: boolean
  isLast: boolean
  isGenerating: boolean
  onCopy: () => void
  onRegenerate?: () => void
  onBranchChat?: () => void
  onReport?: () => void
  onLike?: () => void
  onDislike?: () => void
}

export const MessageActionBar: FC<MessageActionBarProps> = ({
  messageContent,
  isAssistant,
  isLast,
  isGenerating,
  onCopy,
  onRegenerate,
  onBranchChat,
  onReport,
  onLike,
  onDislike
}) => {
  const [copied, setCopied] = useState(false)
  const [liked, setLiked] = useState<boolean | null>(null)
  const [showShareModal, setShowShareModal] = useState(false)

  const handleCopy = () => {
    onCopy()
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleLike = () => {
    setLiked(liked === true ? null : true)
    onLike?.()
  }

  const handleDislike = () => {
    setLiked(liked === false ? null : false)
    onDislike?.()
  }

  // Don't show actions while generating
  if (isGenerating && isLast) return null

  // Only show for assistant messages
  if (!isAssistant) return null

  const buttonClass = cn(
    "p-2 rounded-lg transition-all duration-200",
    "hover:bg-muted/80 active:scale-95",
    "text-muted-foreground hover:text-foreground",
    "focus:outline-none focus:ring-2 focus:ring-primary/20"
  )

  const activeClass = "text-primary bg-primary/10"

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="flex items-center gap-0.5 mt-3 pt-3 border-t border-border/40"
      >
        {/* Copy */}
        <WithTooltip
          delayDuration={500}
          side="bottom"
          display={<div>Copiar</div>}
          trigger={
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleCopy}
              className={cn(buttonClass, copied && activeClass)}
              aria-label="Copiar mensaje"
            >
              <AnimatePresence mode="wait">
                {copied ? (
                  <motion.div
                    key="check"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                  >
                    <Check className="w-4 h-4 text-emerald-500" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="copy"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                  >
                    <Copy className="w-4 h-4" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          }
        />

        {/* Like */}
        <WithTooltip
          delayDuration={500}
          side="bottom"
          display={<div>Me gusta</div>}
          trigger={
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleLike}
              className={cn(buttonClass, liked === true && activeClass)}
              aria-label="Me gusta"
            >
              <ThumbsUp className={cn("w-4 h-4", liked === true && "fill-current")} />
            </motion.button>
          }
        />

        {/* Dislike */}
        <WithTooltip
          delayDuration={500}
          side="bottom"
          display={<div>No me gusta</div>}
          trigger={
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleDislike}
              className={cn(buttonClass, liked === false && "text-destructive bg-destructive/10")}
              aria-label="No me gusta"
            >
              <ThumbsDown className={cn("w-4 h-4", liked === false && "fill-current")} />
            </motion.button>
          }
        />

        {/* Share */}
        <WithTooltip
          delayDuration={500}
          side="bottom"
          display={<div>Compartir</div>}
          trigger={
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowShareModal(true)}
              className={buttonClass}
              aria-label="Compartir"
            >
              <Share2 className="w-4 h-4" />
            </motion.button>
          }
        />

        {/* Regenerate - only for last message */}
        {isLast && onRegenerate && (
          <WithTooltip
            delayDuration={500}
            side="bottom"
            display={<div>Regenerar</div>}
            trigger={
              <motion.button
                whileHover={{ scale: 1.05, rotate: 180 }}
                whileTap={{ scale: 0.95 }}
                transition={{ rotate: { duration: 0.3 } }}
                onClick={onRegenerate}
                className={buttonClass}
                aria-label="Regenerar respuesta"
              >
                <RefreshCw className="w-4 h-4" />
              </motion.button>
            }
          />
        )}

        {/* Branch in new chat */}
        <WithTooltip
          delayDuration={500}
          side="bottom"
          display={<div>Dividir en nuevo chat</div>}
          trigger={
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onBranchChat}
              className={buttonClass}
              aria-label="Dividir en nuevo chat"
            >
              <GitBranch className="w-4 h-4" />
            </motion.button>
          }
        />

        {/* Report */}
        <WithTooltip
          delayDuration={500}
          side="bottom"
          display={<div>Reportar mensaje</div>}
          trigger={
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onReport}
              className={cn(buttonClass, "hover:text-destructive")}
              aria-label="Reportar mensaje"
            >
              <Flag className="w-4 h-4" />
            </motion.button>
          }
        />

        {/* More options (three dots menu) */}
        <div className="ml-auto flex items-center">
          <span className="text-xs text-muted-foreground/60">ALI</span>
        </div>
      </motion.div>

      {/* Share Modal */}
      <ShareMessageModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        messageContent={messageContent}
      />
    </>
  )
}

