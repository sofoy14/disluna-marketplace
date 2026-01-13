"use client"

import { FC } from "react"
import { motion } from "framer-motion"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select"
import { TextareaAutosize } from "@/components/ui/textarea-autosize"
import { LimitDisplay } from "@/components/ui/limit-display"
import { WORKSPACE_INSTRUCTIONS_MAX } from "@/db/limits"
import {
    MessageSquare,
    Quote,
    HelpCircle,
    FileText,
    Settings2
} from "lucide-react"

export type ToneType = "formal" | "neutral" | "conversational"
export type CitationsType = "always" | "when_applicable" | "never"

export interface AssistantPoliciesState {
    tone: ToneType
    citations: CitationsType
    askBeforeAssuming: boolean
    includeSummary: boolean
    additionalInstructions: string
}

interface AssistantPoliciesProps {
    policies: AssistantPoliciesState
    onChange: (policies: AssistantPoliciesState) => void
}

const toneLabels: Record<ToneType, string> = {
    formal: "Formal",
    neutral: "Neutro",
    conversational: "Conversacional"
}

const citationLabels: Record<CitationsType, string> = {
    always: "Siempre",
    when_applicable: "Cuando aplique",
    never: "Nunca"
}

export const AssistantPolicies: FC<AssistantPoliciesProps> = ({
    policies,
    onChange
}) => {
    const updatePolicy = <K extends keyof AssistantPoliciesState>(
        key: K,
        value: AssistantPoliciesState[K]
    ) => {
        onChange({ ...policies, [key]: value })
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
        >
            {/* Header */}
            <div className="flex items-center gap-3 pb-2 border-b border-border/50">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-purple-500/10">
                    <Settings2 className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                    <h3 className="font-semibold text-foreground">Políticas del Asistente</h3>
                    <p className="text-sm text-muted-foreground">
                        Configura cómo responde el asistente en este espacio
                    </p>
                </div>
            </div>

            {/* Structured Controls */}
            <div className="space-y-4">
                {/* Tone */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                            <MessageSquare className="w-4 h-4 text-blue-400" />
                        </div>
                        <div>
                            <Label className="font-medium">Tono de respuesta</Label>
                            <p className="text-xs text-muted-foreground">
                                Estilo de comunicación del asistente
                            </p>
                        </div>
                    </div>
                    <Select
                        value={policies.tone}
                        onValueChange={(v) => updatePolicy("tone", v as ToneType)}
                    >
                        <SelectTrigger className="w-[160px] bg-white/5 border-white/10">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {Object.entries(toneLabels).map(([key, label]) => (
                                <SelectItem key={key} value={key}>
                                    {label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Citations */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
                            <Quote className="w-4 h-4 text-amber-400" />
                        </div>
                        <div>
                            <Label className="font-medium">Incluir citas</Label>
                            <p className="text-xs text-muted-foreground">
                                Referencias a fuentes legales
                            </p>
                        </div>
                    </div>
                    <Select
                        value={policies.citations}
                        onValueChange={(v) => updatePolicy("citations", v as CitationsType)}
                    >
                        <SelectTrigger className="w-[160px] bg-white/5 border-white/10">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {Object.entries(citationLabels).map(([key, label]) => (
                                <SelectItem key={key} value={key}>
                                    {label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Ask before assuming */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center">
                            <HelpCircle className="w-4 h-4 text-green-400" />
                        </div>
                        <div>
                            <Label className="font-medium">Preguntar antes de asumir</Label>
                            <p className="text-xs text-muted-foreground">
                                Clarificar dudas antes de responder
                            </p>
                        </div>
                    </div>
                    <Switch
                        checked={policies.askBeforeAssuming}
                        onCheckedChange={(v) => updatePolicy("askBeforeAssuming", v)}
                    />
                </div>

                {/* Include summary */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center">
                            <FileText className="w-4 h-4 text-purple-400" />
                        </div>
                        <div>
                            <Label className="font-medium">Resumen al final</Label>
                            <p className="text-xs text-muted-foreground">
                                Incluir síntesis en respuestas largas
                            </p>
                        </div>
                    </div>
                    <Switch
                        checked={policies.includeSummary}
                        onCheckedChange={(v) => updatePolicy("includeSummary", v)}
                    />
                </div>
            </div>

            {/* Additional Instructions */}
            <div className="space-y-2">
                <Label className="text-sm font-medium">Reglas adicionales del equipo</Label>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <TextareaAutosize
                        placeholder="Instrucciones personalizadas para este espacio... (opcional)"
                        value={policies.additionalInstructions}
                        onValueChange={(v) => updatePolicy("additionalInstructions", v)}
                        minRows={4}
                        maxRows={8}
                        maxLength={WORKSPACE_INSTRUCTIONS_MAX}
                        className="w-full bg-transparent border-0 focus:ring-0 resize-none text-sm"
                    />
                    <LimitDisplay
                        used={policies.additionalInstructions.length}
                        limit={WORKSPACE_INSTRUCTIONS_MAX}
                    />
                </div>
            </div>
        </motion.div>
    )
}

// Helper to convert from old instructions format to new policies
export const instructionsToPolicies = (instructions: string): AssistantPoliciesState => {
    // Try to parse if it's JSON, otherwise use as additional instructions
    try {
        const parsed = JSON.parse(instructions)
        if (parsed.tone && parsed.citations !== undefined) {
            return parsed as AssistantPoliciesState
        }
    } catch {
        // Not JSON, use as additional instructions
    }

    return {
        tone: "formal",
        citations: "when_applicable",
        askBeforeAssuming: true,
        includeSummary: true,
        additionalInstructions: instructions || ""
    }
}

// Helper to convert policies back to instructions string for storage
export const policiesToInstructions = (policies: AssistantPoliciesState): string => {
    // If only using additional instructions with default settings, just return the text
    const isDefault =
        policies.tone === "formal" &&
        policies.citations === "when_applicable" &&
        policies.askBeforeAssuming === true &&
        policies.includeSummary === true

    if (isDefault && policies.additionalInstructions) {
        return policies.additionalInstructions
    }

    // Otherwise store as JSON
    return JSON.stringify(policies)
}
