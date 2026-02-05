export type RiskLevel = "low" | "medium" | "high"

export interface ProcessInsights {
  facts: number | null
  evidence: number | null
  norms: number | null
  contradictions: number | null
  riskLevel: RiskLevel
  isEstimated: boolean
}
