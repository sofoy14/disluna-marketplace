import { z } from "zod"

// Esquema Zod para validación y tipado
export const draftSchema = z.object({
    type: z.literal("draft"),
    doc_type: z.enum([
        "contrato",
        "minuta",
        "tutela",
        "derecho_de_peticion",
        "memorial",
        "comunicado",
        "correo",
        "otro"
    ]),
    title: z.string().describe("Título corto del documento"),
    jurisdiction: z.literal("CO").default("CO"),
    language: z.literal("es-CO").default("es-CO"),
    content_markdown: z.string().describe("Contenido en Markdown estructurado"),
    placeholders: z.array(z.object({
        key: z.string(),
        label: z.string(),
        example: z.string().optional()
    })).optional(),
    missing_info: z.array(z.string()).optional(),
    notes: z.array(z.string()).optional(),
    email: z.object({
        subject: z.string().optional(),
        to: z.string().optional(),
        cc: z.string().optional(),
        body: z.string().optional()
    }).optional()
})

export type LegalDraft = z.infer<typeof draftSchema>
