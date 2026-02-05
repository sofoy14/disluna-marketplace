import ReactMarkdown from "react-markdown"
import { Message } from "ai"
import { Loader2, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface ProcessChatMessagesProps {
    messages: Message[]
    isLoading: boolean
    error: Error | undefined
    messagesEndRef: React.RefObject<HTMLDivElement>
}

export function ProcessChatMessages({ messages, isLoading, error, messagesEndRef }: ProcessChatMessagesProps) {
    return (
        <div className="p-4 space-y-4">
            {messages.map((message) => (
                <div
                    key={message.id}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                    <div
                        className={`max-w-[80%] rounded-2xl p-4 ${message.role === "user"
                            ? "bg-primary/15 text-foreground"
                            : "bg-card border border-border/50 text-foreground"
                            }`}
                    >
                        {message.role === "assistant" ? (
                            <div className="text-sm prose prose-invert prose-sm max-w-none">
                                <ReactMarkdown>{message.content}</ReactMarkdown>
                            </div>
                        ) : (
                            <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                        )}
                    </div>
                </div>
            ))}

            {isLoading && (
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Analizando...</span>
                </div>
            )}

            {error && (
                <div className="p-2">
                    <Alert variant="destructive">
                        <AlertCircle className="w-4 h-4" />
                        <AlertDescription>
                            {error.message || "Error al procesar la consulta"}
                        </AlertDescription>
                    </Alert>
                </div>
            )}

            <div ref={messagesEndRef} />
        </div>
    )
}
