import { useContext, useState } from "react"
import { ChatbotUIContext } from "@/context/context"
import { cn } from "@/lib/utils"
import { ChatSettings, OpenRouterLLMID } from "@/types"
import { IconBrain, IconCpu, IconChevronDown, IconBolt } from "@tabler/icons-react"

// Internal model IDs - not exposed to users
const M1_SMALL_MODEL = "liquid/lfm-2.2-6b"
const M1_MODEL = "alibaba/tongyi-deepresearch-30b-a3b"
const M1_PRO_MODEL = "moonshotai/kimi-k2-thinking"

const MODELS = [
  { 
    id: M1_SMALL_MODEL, 
    name: "M1 Small", 
    description: "Ligero y veloz",
    icon: IconBolt,
    iconColor: "text-emerald-500",
    bgColor: "from-emerald-500/15 to-emerald-600/10"
  },
  { 
    id: M1_MODEL, 
    name: "M1", 
    description: "Rápido y eficiente",
    icon: IconCpu,
    iconColor: "text-primary",
    bgColor: "from-primary/15 to-primary/10"
  },
  { 
    id: M1_PRO_MODEL, 
    name: "M1 Pro", 
    description: "Razonamiento avanzado",
    icon: IconBrain,
    iconColor: "text-violet-500",
    bgColor: "from-violet-500/15 to-violet-600/10"
  },
]

export const ModelSelectorToggle = () => {
  const { chatSettings, setChatSettings, profile } = useContext(ChatbotUIContext)

  // Use M1 as default if chatSettings is null
  const currentModel = chatSettings?.model || M1_MODEL
  const selectedModel = MODELS.find(m => m.id === currentModel) || MODELS[0]
  const [isOpen, setIsOpen] = useState(false)

  const handleModelChange = (modelId: string) => {
    if (chatSettings) {
      setChatSettings({
        ...chatSettings,
        model: modelId as OpenRouterLLMID
      })
    } else {
      const defaultSettings: ChatSettings = {
        model: modelId as OpenRouterLLMID,
        prompt: profile?.default_prompt || "Eres un asistente legal inteligente especializado en derecho colombiano.",
        temperature: profile?.default_temperature || 0.5,
        contextLength: profile?.default_context_length || 4096,
        includeProfileContext: true,
        includeWorkspaceInstructions: true,
        embeddingsProvider: "openai"
      }
      setChatSettings(defaultSettings)
    }
    setIsOpen(false)
  }

  const SelectedIcon = selectedModel.icon

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 h-9 px-3",
          "bg-secondary/30 backdrop-blur-sm rounded-lg",
          "border border-border/50 hover:border-border",
          "shadow-sm hover:shadow",
          "transition-all duration-200"
        )}
      >
        <SelectedIcon size={14} className={selectedModel.iconColor} />
        <span className="text-xs font-semibold">{selectedModel.name}</span>
        <IconChevronDown 
          size={14} 
          className={cn(
            "text-muted-foreground/60 transition-transform duration-200",
            isOpen && "rotate-180"
          )} 
        />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)} 
          />
          
          {/* Dropdown */}
          <div className={cn(
            "absolute right-0 top-full mt-2 z-50",
            "min-w-[200px] p-1.5",
            "bg-background/95 backdrop-blur-md rounded-xl",
            "border border-border/60 shadow-lg",
            "animate-in fade-in-0 zoom-in-95 duration-150"
          )}>
            {MODELS.map((model) => {
              const Icon = model.icon
              const isSelected = model.id === currentModel
              
              return (
                <button
                  key={model.id}
                  onClick={() => handleModelChange(model.id)}
                  className={cn(
                    "w-full flex items-center gap-3 p-2.5 rounded-lg",
                    "transition-colors duration-150",
                    "hover:bg-muted/50",
                    isSelected && "bg-muted/30"
                  )}
                >
                  <div className={cn(
                    "flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0",
                    "bg-gradient-to-br",
                    model.bgColor
                  )}>
                    <Icon size={18} className={model.iconColor} />
                  </div>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-sm font-semibold whitespace-nowrap w-16 text-left">{model.name}</span>
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                      {model.description}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
