"use client"

import { useContext, useEffect, useState } from "react"
import { ChatbotUIContext } from "@/context/context"
import { useChatHandler } from "@/components/chat/chat-hooks/use-chat-handler"
import { ChatUI } from "@/components/chat/chat-ui"
import { WelcomeScreen } from "@/components/chat/welcome-screen"
import { LegalWritingScreen } from "@/components/chat/legal-writing-screen"
import useHotkey from "@/lib/hooks/use-hotkey"

const CHAT_MODE_EVENT = "chat-mode-changed"

type ChatMode = "default" | "legal-writing"

export default function ChatPage() {
  const { chatMessages } = useContext(ChatbotUIContext)
  const { handleNewChat, handleFocusChatInput } = useChatHandler()

  const [chatMode, setChatMode] = useState<ChatMode>("default")

  useHotkey("o", () => handleNewChat())
  useHotkey("l", () => handleFocusChatInput())

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const updateChatMode = () => {
      const stored = localStorage.getItem("chatMode")
      setChatMode(stored === "legal-writing" ? "legal-writing" : "default")
    }

    updateChatMode()
    window.addEventListener(CHAT_MODE_EVENT, updateChatMode)

    return () => {
      window.removeEventListener(CHAT_MODE_EVENT, updateChatMode)
    }
  }, [])

  const isEmpty = chatMessages.length === 0

  if (!isEmpty) {
    return <ChatUI />
  }

  return chatMode === "legal-writing" ? <LegalWritingScreen /> : <WelcomeScreen />
}
