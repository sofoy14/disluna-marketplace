import { assertRuntimeEnv } from "@/src/config/env"

export function register() {
  if (process.env.NODE_ENV === "test") return
  if (process.env.NEXT_PHASE === "phase-production-build") return

  assertRuntimeEnv()
}

