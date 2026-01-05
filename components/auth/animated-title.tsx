"use client"

import { motion, AnimatePresence } from "framer-motion"
import { useState, useEffect } from "react"

interface AnimatedTitleProps {
  size?: "sm" | "lg"
}

export function AnimatedTitle({ size = "lg" }: AnimatedTitleProps) {
  const textSize = size === "sm" ? "text-xl" : "text-4xl"
  const letterSize = size === "sm" ? "text-xl" : "text-4xl"
  const [showWords, setShowWords] = useState(false)
  const [showExpansion, setShowExpansion] = useState(false)
  const separationDistance = size === "sm" ? 30 : 60

  useEffect(() => {
    // Phase 1: Show ALI for 1.2 seconds
    const timer1 = setTimeout(() => {
      setShowWords(true)
    }, 1200)

    // Phase 2: Start expansion after separation completes (0.5s after separation starts)
    const timer2 = setTimeout(() => {
      setShowExpansion(true)
    }, 1700)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
    }
  }, [])

  return (
    <div className={`${size === "sm" ? "mt-2" : "mt-4"} ${textSize} font-semibold text-center whitespace-nowrap relative ${size === "sm" ? "h-10" : "h-16"} flex items-center justify-center overflow-visible`}>
      <AnimatePresence mode="wait">
        {/* Phase 1: ALI together */}
        {!showWords && (
          <motion.div
            key="ali"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="absolute"
          >
            <span className={`${letterSize} font-semibold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-purple-400 pb-1`}>
              ALI
            </span>
          </motion.div>
        )}

        {/* Phase 2 & 3: Continuous animation - letters separate then expand */}
        {showWords && (
          <motion.div
            key="words"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="absolute flex items-baseline"
            style={{ gap: "0.5rem" }}
          >
            {/* A -> Asistente */}
            <motion.span
              initial={{ x: 0 }}
              animate={{
                x: showExpansion ? 0 : -separationDistance
              }}
              transition={{
                duration: showExpansion ? 0.4 : 0.5,
                ease: [0.22, 1, 0.36, 1],
                delay: showExpansion ? 0 : 0
              }}
              className="inline-flex items-baseline"
            >
              <span className={`${letterSize} font-semibold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-purple-400 leading-normal pb-1`}>A</span>
              <motion.span
                initial={{ width: 0, opacity: 0 }}
                animate={{
                  width: showExpansion ? "auto" : 0,
                  opacity: showExpansion ? 1 : 0
                }}
                transition={{
                  delay: showExpansion ? 0.1 : 0,
                  duration: 0.4,
                  ease: [0.22, 1, 0.36, 1]
                }}
                className={`inline-block overflow-hidden ${textSize} font-semibold text-gray-600 dark:text-gray-300 leading-normal pb-1`}
              >
                sistente
              </motion.span>
            </motion.span>

            {/* L -> Legal */}
            <motion.span
              initial={{ x: 0 }}
              animate={{ x: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="inline-flex items-baseline"
            >
              <span className={`${letterSize} font-semibold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-purple-400 leading-normal pb-1`}>L</span>
              <motion.span
                initial={{ width: 0, opacity: 0 }}
                animate={{
                  width: showExpansion ? "auto" : 0,
                  opacity: showExpansion ? 1 : 0
                }}
                transition={{
                  delay: showExpansion ? 0.2 : 0,
                  duration: 0.4,
                  ease: [0.22, 1, 0.36, 1]
                }}
                className={`inline-block overflow-hidden ${textSize} font-semibold text-gray-600 dark:text-gray-300 leading-normal pb-1`}
              >
                egal
              </motion.span>
            </motion.span>

            {/* I -> Inteligente */}
            <motion.span
              initial={{ x: 0 }}
              animate={{
                x: showExpansion ? 0 : separationDistance
              }}
              transition={{
                duration: showExpansion ? 0.4 : 0.5,
                ease: [0.22, 1, 0.36, 1],
                delay: showExpansion ? 0 : 0
              }}
              className="inline-flex items-baseline"
            >
              <motion.span
                initial={{ width: 0, opacity: 0 }}
                animate={{
                  width: showExpansion ? "auto" : 0,
                  opacity: showExpansion ? 1 : 0
                }}
                transition={{
                  delay: showExpansion ? 0.3 : 0,
                  duration: 0.4,
                  ease: [0.22, 1, 0.36, 1]
                }}
                className={`inline-block overflow-hidden ${letterSize} font-semibold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-purple-400 leading-normal pb-1`}
              >
                Inteligente
              </motion.span>
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

