import type { Process, ProcessInsights, RiskLevel } from "@/lib/types"

const resolveNumber = (value: any): number | null => {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

export const hasInsightValues = (insights: ProcessInsights) => {
  return [insights.facts, insights.evidence, insights.norms, insights.contradictions].some(
    (value) => typeof value === "number"
  )
}

export const deriveRiskLevel = (
  contradictions: number | null,
  isReady: boolean
): { level: RiskLevel; isEstimated: boolean } => {
  if (typeof contradictions === "number") {
    if (contradictions >= 3) return { level: "high", isEstimated: false }
    if (contradictions >= 1) return { level: "medium", isEstimated: false }
    return { level: "low", isEstimated: false }
  }

  return { level: isReady ? "medium" : "medium", isEstimated: true }
}

export const getProcessInsights = (
  process: Process,
  overrides: Partial<ProcessInsights> = {}
): ProcessInsights => {
  const facts =
    typeof overrides.facts === "number" ? overrides.facts : resolveNumber(process.fact_count)
  const evidence =
    typeof overrides.evidence === "number"
      ? overrides.evidence
      : resolveNumber(process.evidence_count)
  const norms =
    typeof overrides.norms === "number" ? overrides.norms : resolveNumber(process.norm_count)
  const contradictions =
    typeof overrides.contradictions === "number"
      ? overrides.contradictions
      : resolveNumber(process.contradiction_count)

  const { level, isEstimated } = deriveRiskLevel(
    contradictions,
    process.indexing_status === "ready"
  )

  return {
    facts,
    evidence,
    norms,
    contradictions,
    riskLevel: overrides.riskLevel || level,
    isEstimated: overrides.isEstimated ?? isEstimated
  }
}
