/**
 * Sistema de Verificación Continua Simplificado
 * Versión que soluciona los errores de parsing JSON
 */

import OpenAI from "openai"
import { AntiHallucinationSystem } from "@/lib/anti-hallucination/anti-hallucination-system"
import { CONTINUOUS_VERIFICATION_PROMPT, LEGAL_SOURCE_HIERARCHY_PROMPT, UNIFIED_LEGAL_RESEARCH_SYSTEM_PROMPT } from "@/lib/tongyi/unified-deep-research-prompts"

export interface VerificationContext {
  legalDomain: 'colombia'
  sources: Array<{ title: string; url: string; content: string; type?: string; authorityScore?: number }>
}

export interface VerificationResult {
  verificationPassed: boolean
  confidenceScore: number
  issuesFound: string[]
  suggestedActions: string[]
  reasoning: string
}

export class ContinuousVerificationSystem {
  private client: OpenAI
  private modelName: string = 'alibaba/tongyi-deepresearch-30b-a3b'
  private antiHallucinationSystem: AntiHallucinationSystem

  constructor(apiKey: string) {
    this.client = new OpenAI({
      apiKey,
      baseURL: "https://openrouter.ai/api/v1"
    })
    this.antiHallucinationSystem = new AntiHallucinationSystem(apiKey)
  }

  private async callModel(prompt: string, messages: any[], temperature: number = 0.3): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.modelName,
        messages: [{ role: "system", content: prompt }, ...messages],
        temperature: temperature,
        max_tokens: 2000,
        response_format: { type: "json_object" },
      })
      return response.choices[0].message?.content || ""
    } catch (error) {
      console.error('Error calling model for verification:', error)
      return '{"verificationPassed": false, "confidenceScore": 0.1, "issuesFound": ["Model call failed"], "suggestedActions": ["Retry verification"], "reasoning": "Error in model call"}'
    }
  }

  public async verifyAtStage(
    stage: 'pre_search' | 'during_search' | 'post_search' | 'pre_synthesis' | 'post_synthesis',
    data: any,
    context: VerificationContext
  ): Promise<VerificationResult> {
    console.log(`🔍 Executing continuous verification at stage: ${stage}`)
    
    try {
      let verificationPassed = true
      let confidenceScore = 1.0
      let issuesFound: string[] = []
      let suggestedActions: string[] = []
      let reasoning = `Verificación en etapa ${stage} completada.`

      // Stage-specific verification logic
      switch (stage) {
        case 'pre_search':
          if (!data.query || typeof data.query !== 'string' || data.query.length < 10) {
            issuesFound.push("Consulta demasiado corta o inválida.")
            suggestedActions.push("Pedir al usuario que reformule la consulta.")
            verificationPassed = false
            confidenceScore = 0.3
          }
          break

        case 'during_search':
          if (data.roundResults && data.roundResults.length > 0) {
            const evaluatedSources = await this.evaluateSourceHierarchy(context.sources)
            context.sources = evaluatedSources

            const lowQualitySources = evaluatedSources.filter(s => s.authorityScore < 5)
            if (lowQualitySources.length > 0) {
              issuesFound.push(`Se encontraron ${lowQualitySources.length} fuentes de baja autoridad.`)
              suggestedActions.push("Priorizar búsquedas en fuentes de mayor autoridad.")
              confidenceScore -= (0.1 * lowQualitySources.length)
              if (confidenceScore < 0.5) verificationPassed = false
            }
          }
          break

        case 'post_search':
          // Simple verification for post-search
          if (!data.currentSources || data.currentSources.length === 0) {
            issuesFound.push("No se encontraron fuentes suficientes.")
            suggestedActions.push("Realizar búsquedas adicionales.")
            verificationPassed = false
            confidenceScore = 0.3
          }
          break

        case 'pre_synthesis':
          // Check if information is sufficient for synthesis
          if (!data.collectedData || Object.keys(data.collectedData).length === 0) {
            issuesFound.push("Información insuficiente para síntesis.")
            suggestedActions.push("Recopilar más información antes de sintetizar.")
            verificationPassed = false
            confidenceScore = 0.4
          }
          break

        case 'post_synthesis':
          // Final check using anti-hallucination system
          try {
            const factCheckResult = await this.antiHallucinationSystem.factCheckResponse(
              data.query,
              data.response,
              context.sources,
              { confidenceThreshold: 0.7 }
            )
            if (!factCheckResult.factCheckPassed) {
              verificationPassed = false
              issuesFound.push(...factCheckResult.issuesFound.map(issue => issue.description))
              suggestedActions.push("Aplicar correcciones y regenerar respuesta.")
              confidenceScore = Math.min(confidenceScore, factCheckResult.overallConfidence)
            }
          } catch (error) {
            console.error('Error in anti-hallucination check:', error)
            issuesFound.push("Error en verificación anti-alucinación")
            suggestedActions.push("Revisar sistema de verificación")
            verificationPassed = false
            confidenceScore = 0.5
          }
          break
      }

      return {
        verificationPassed,
        confidenceScore: Math.max(0, Math.min(1, confidenceScore)),
        issuesFound,
        suggestedActions,
        reasoning,
      }

    } catch (error) {
      console.error(`Error during verification at stage ${stage}:`, error)
      return {
        verificationPassed: false,
        confidenceScore: 0.1,
        issuesFound: [`Error interno durante la verificación: ${error.message}`],
        suggestedActions: ["Revisar logs del sistema de verificación."],
        reasoning: `Error en verificación: ${error.message}`,
      }
    }
  }

  private async evaluateSourceHierarchy(sources: Array<{ title: string; url: string; content: string; type?: string; authorityScore?: number }>): Promise<Array<{ title: string; url: string; content: string; type: string; authorityScore: number }>> {
    if (sources.length === 0) return []

    try {
      const sourcesToEvaluate = sources.map(s => ({ title: s.title, url: s.url, content: s.content }))
      const evaluationPrompt = LEGAL_SOURCE_HIERARCHY_PROMPT.replace('{sourcesToEvaluate}', JSON.stringify(sourcesToEvaluate))
      const messages = [{ role: "user", content: evaluationPrompt }]
      const response = await this.callModel(UNIFIED_LEGAL_RESEARCH_SYSTEM_PROMPT, messages)
      
      const cleanResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const parsedResponse = JSON.parse(cleanResponse)
      
      if (parsedResponse.evaluatedSources) {
        return parsedResponse.evaluatedSources.map((evaluated: any) => {
          const originalSource = sources.find(s => s.url === evaluated.url)
          return {
            ...originalSource,
            type: evaluated.type,
            authorityScore: evaluated.authorityScore
          }
        })
      }
    } catch (e) {
      console.error("Error parsing source hierarchy evaluation:", e)
    }
    
    // Fallback: assign default scores if parsing fails
    return sources.map(s => ({
      ...s,
      type: s.type || 'general',
      authorityScore: s.authorityScore || 5
    }))
  }
}