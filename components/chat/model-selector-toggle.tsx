import { useContext } from "react"
import { ChatbotUIContext } from "@/context/context"
import { cn } from "@/lib/utils"
import { ChatSettings, OpenRouterLLMID } from "@/types"
import { IconBrain, IconCpu } from "@tabler/icons-react"

export const ModelSelectorToggle = () => {
  const { chatSettings, setChatSettings, profile } = useContext(ChatbotUIContext)

  const M1_MODEL = "alibaba/tongyi-deepresearch-30b-a3b"
  const M1_PRO_MODEL = "moonshotai/kimi-k2-thinking"

  // Use M1 as default if chatSettings is null
  const currentModel = chatSettings?.model || M1_MODEL
  const isM1Pro = currentModel === M1_PRO_MODEL

  const handleToggle = (model: string) => {
    if (chatSettings) {
      setChatSettings({
        ...chatSettings,
        model: model as OpenRouterLLMID
      })
    } else {
      // Initialize chatSettings if null (e.g. on Welcome Screen)
      const defaultSettings: ChatSettings = {
        model: model as OpenRouterLLMID,
        prompt: profile?.default_prompt || "Eres un asistente legal inteligente especializado en derecho colombiano.",
        temperature: profile?.default_temperature || 0.5,
        contextLength: profile?.default_context_length || 4096,
        includeProfileContext: true,
        includeWorkspaceInstructions: true,
        embeddingsProvider: "openai"
      }
      setChatSettings(defaultSettings)
    }
  }

  return (
    <div className="flex items-center bg-secondary/30 p-1 rounded-lg border border-border/50 h-9 backdrop-blur-sm shadow-sm">
      <button
        onClick={() => handleToggle(M1_MODEL)}
        className={cn(
          "px-3 py-1 text-xs font-medium rounded-md transition-all duration-200 ease-in-out flex items-center gap-1.5",
          !isM1Pro 
            ? "bg-background text-foreground shadow-sm ring-1 ring-black/5 font-semibold" 
            : "text-muted-foreground hover:text-foreground hover:bg-background/50"
        )}
        title="Tongyi Deep Research 30B (M1)"
      >
        <IconCpu size={14} className={cn(!isM1Pro ? "text-primary" : "opacity-70")} />
        M1
      </button>
      <button
        onClick={() => handleToggle(M1_PRO_MODEL)}
        className={cn(
          "px-3 py-1 text-xs font-medium rounded-md transition-all duration-200 ease-in-out flex items-center gap-1.5",
          isM1Pro 
            ? "bg-background text-foreground shadow-sm ring-1 ring-black/5 font-semibold" 
            : "text-muted-foreground hover:text-foreground hover:bg-background/50"
        )}
        title="Kimi k2 Thinking (M1 Pro)"
      >
        <IconBrain size={14} className={cn(isM1Pro ? "text-violet-500" : "opacity-70")} />
        M1 Pro
        {isM1Pro && (
          <span className="relative flex h-1.5 w-1.5 ml-0.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-violet-500"></span>
          </span>
        )}
      </button>
    </div>
  )
}
