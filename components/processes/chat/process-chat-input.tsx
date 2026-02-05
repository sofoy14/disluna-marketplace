import { Button } from "@/components/ui/button"
import { chipVariants } from "@/components/ui/chip"
import { MessageSquare, Loader2 } from "lucide-react"
import { ChatRequestOptions } from "ai"
import { cn } from "@/lib/utils"
import { es } from "@/lib/i18n/es"

interface ProcessChatInputProps {
    input: string
    handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
    handleSubmit: (e: React.FormEvent<HTMLFormElement>, chatRequestOptions?: ChatRequestOptions) => void
    isLoading: boolean
    isReady: boolean
    suggestionChips?: string[]
    onChipClick?: (chip: string) => void
}

export function ProcessChatInput({
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    isReady,
    suggestionChips,
    onChipClick
}: ProcessChatInputProps) {
    return (
        <div className="border-t bg-card/50 p-4">
            {suggestionChips && onChipClick && suggestionChips.length > 0 && (
                <div className="suggestion-chips-container mb-3">
                    {suggestionChips.map((chip, index) => (
                        <button
                            key={index}
                            onClick={() => onChipClick(chip)}
                            className={cn(
                                chipVariants({ variant: "suggestion", size: "sm" }),
                                "flex-shrink-0 text-xs"
                            )}
                        >
                            {chip}
                        </button>
                    ))}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-2">
                <div className="flex gap-2">
                    <textarea
                        value={input}
                        onChange={handleInputChange}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault()
                                handleSubmit(e as any)
                            }
                        }}
                        placeholder={
                            isReady
                                ? es.chat.input.readyPlaceholder
                                : es.chat.input.waitingPlaceholder
                        }
                        disabled={!isReady || isLoading}
                        className="flex-1 min-h-[52px] rounded-xl border bg-background px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
                        rows={1}
                    />
                    <Button
                        type="submit"
                        disabled={!isReady || isLoading || !input.trim()}
                        size="icon"
                        className="h-[52px] w-[52px] rounded-xl"
                    >
                        {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <MessageSquare className="w-4 h-4" />
                        )}
                    </Button>
                </div>
            </form>
        </div>
    )
}
