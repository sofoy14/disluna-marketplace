import { z } from "zod"

type EnvKey = keyof NodeJS.ProcessEnv

function readEnv(key: EnvKey): string | undefined {
  const proc = (globalThis as any)?.process as NodeJS.Process | undefined
  const raw = proc?.env?.[key]
  if (typeof raw !== "string") return undefined
  const trimmed = raw.trim()
  return trimmed.length ? trimmed : undefined
}

function pickEnv<TKeys extends readonly EnvKey[]>(
  keys: TKeys
): Record<TKeys[number], string | undefined> {
  const out = {} as Record<TKeys[number], string | undefined>
  for (const key of keys) {
    out[key] = readEnv(key)
  }
  return out
}

const BaseEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).optional(),

  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),

  NEXT_PUBLIC_BILLING_ENABLED: z.enum(["true", "false"]).optional(),

  NEXT_PUBLIC_WOMPI_PUBLIC_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_WOMPI_BASE_URL: z.string().url().optional(),
  WOMPI_ENVIRONMENT: z.enum(["sandbox", "production"]).optional(),
  WOMPI_PRIVATE_KEY: z.string().min(1).optional(),
  WOMPI_INTEGRITY_SECRET: z.string().min(1).optional(),
  WOMPI_WEBHOOK_SECRET: z.string().min(1).optional(),
  WOMPI_CRON_SECRET: z.string().min(1).optional(),

  DOCLING_BASE_URL: z.string().min(1).optional(),

  ADMIN_EMAILS: z.string().min(1).optional(),

  RESEND_API_KEY: z.string().min(1).optional(),

  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENROUTER_API_KEY: z.string().min(1).optional(),
  SERPER_API_KEY: z.string().min(1).optional(),
  FIRECRAWL_API_KEY: z.string().min(1).optional(),

  NEXT_PUBLIC_OLLAMA_URL: z.string().url().optional(),

  DISABLE_PWA: z.enum(["true", "false"]).optional()
})

export type BaseEnv = z.infer<typeof BaseEnvSchema>

function formatZodIssues(issues: z.ZodIssue[]) {
  const lines = issues.map(issue => {
    const path = issue.path.join(".") || "(root)"
    return `- ${path}: ${issue.message}`
  })
  return lines.join("\n")
}

function enforceConditionalRequirements(env: BaseEnv) {
  const missing: string[] = []

  const billingEnabled = env.NEXT_PUBLIC_BILLING_ENABLED === "true"

  if (billingEnabled) {
    const requiredForBilling: (keyof BaseEnv)[] = [
      "NEXT_PUBLIC_WOMPI_PUBLIC_KEY",
      "WOMPI_PRIVATE_KEY",
      "WOMPI_INTEGRITY_SECRET",
      "WOMPI_WEBHOOK_SECRET"
    ]

    for (const key of requiredForBilling) {
      if (!env[key]) missing.push(String(key))
    }
  }

  if (missing.length) {
    const prefix = billingEnabled
      ? "Missing required environment variables (billing enabled):"
      : "Missing required environment variables:"
    throw new Error(`${prefix}\n- ${missing.join("\n- ")}`)
  }
}

let _cached: BaseEnv | null = null

export function getEnv(): BaseEnv {
  if (_cached) return _cached
  return (_cached = validateEnv())
}

export function validateEnv(): BaseEnv {
  const raw = pickEnv([
    "NODE_ENV",

    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",

    "NEXT_PUBLIC_APP_URL",
    "NEXT_PUBLIC_SITE_URL",
    "NEXT_PUBLIC_BILLING_ENABLED",

    "NEXT_PUBLIC_WOMPI_PUBLIC_KEY",
    "NEXT_PUBLIC_WOMPI_BASE_URL",
    "WOMPI_ENVIRONMENT",
    "WOMPI_PRIVATE_KEY",
    "WOMPI_INTEGRITY_SECRET",
    "WOMPI_WEBHOOK_SECRET",
    "WOMPI_CRON_SECRET",

    "DOCLING_BASE_URL",

    "ADMIN_EMAILS",

    "RESEND_API_KEY",

    "OPENAI_API_KEY",
    "OPENROUTER_API_KEY",
    "SERPER_API_KEY",
    "FIRECRAWL_API_KEY",

    "NEXT_PUBLIC_OLLAMA_URL",

    "DISABLE_PWA"
  ] as const)

  const parsed = BaseEnvSchema.safeParse(raw)
  if (!parsed.success) {
    throw new Error(
      `Invalid environment configuration:\n${formatZodIssues(parsed.error.issues)}`
    )
  }

  enforceConditionalRequirements(parsed.data)
  return parsed.data
}

export function assertRuntimeEnv(): void {
  _cached = validateEnv()
}

