/**
 * Test rápido para verificar Deep Research TONGYI Colombia
 * Ejecutar con: npx tsx test-tongyi-colombia.ts
 */

import { UnifiedDeepResearchOrchestrator } from './lib/tongyi/unified-deep-research-orchestrator'

async function testColombiaResearch() {
  console.log('🧪 INICIANDO TEST TONGYI COLOMBIA DEEP RESEARCH')
  console.log('=' .repeat(60))
  
  // Configurar variables de entorno para test
  process.env.OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || 'sk-or-v1-test-key'
  process.env.SERPER_API_KEY = process.env.SERPER_API_KEY || 'test-serper-key'
  process.env.JINA_API_KEY = process.env.JINA_API_KEY || 'test-jina-key'
  
  console.log('✅ Variables de entorno configuradas para test')
  
  // Crear orquestador
  const orchestrator = new UnifiedDeepResearchOrchestrator({
    apiKey: process.env.OPENROUTER_API_KEY!,
    modelName: 'alibaba/tongyi-deepresearch-30b-a3b',
    enableContinuousVerification: true,
    enableIterativeRefinement: true,
    legalDomain: 'colombia',
    qualityThreshold: 0.85
  })
  
  console.log('✅ Orquestador creado')
  
  // Test con consulta constitucional
  const testQuery = "¿Qué dice el artículo 29 de la Constitución sobre el debido proceso?"
  
  console.log(`\n🔍 CONSULTA: "${testQuery}"`)
  console.log('🔄 Ejecutando modo iter_research...')
  
  try {
    const result = await orchestrator.orchestrate(
      testQuery,
      "test-chat",
      "test-user",
      { mode: 'iter_research' }
    )
    
    console.log('\n📊 RESULTADOS:')
    console.log('=' .repeat(60))
    console.log(`✅ Éxito: ${result.analysis.verificationPassed ? 'SÍ' : 'NO'}`)
    console.log(`📄 Fuentes encontradas: ${result.sources.length}`)
    console.log(`🎯 Calidad: ${result.analysis.qualityScore.toFixed(2)}/1.0`)
    console.log(`⏱️ Tiempo: ${(result.analysis.processingTime / 1000).toFixed(1)}s`)
    console.log(`🔍 Rondas: ${result.metadata.totalRounds}`)
    console.log(`🔎 Búsquedas: ${result.metadata.totalSearches}`)
    
    console.log('\n📝 RESPUESTA:')
    console.log('=' .repeat(60))
    console.log(result.finalAnswer.substring(0, 500) + '...')
    
    console.log('\n📚 FUENTES:')
    console.log('=' .repeat(60))
    result.sources.slice(0, 3).forEach((source, index) => {
      console.log(`${index + 1}. [${source.type?.toUpperCase()}] ${source.title}`)
      console.log(`   URL: ${source.url}`)
      console.log(`   Calidad: ${source.quality}/10`)
    })
    
    if (result.warnings && result.warnings.length > 0) {
      console.log('\n⚠️ ADVERTENCIAS:')
      console.log('=' .repeat(60))
      result.warnings.forEach(warning => console.log(`- ${warning}`))
    }
    
    console.log('\n✅ TEST COMPLETADO EXITOSAMENTE')
    
  } catch (error) {
    console.error('\n❌ ERROR EN TEST:', error)
  }
}

// Ejecutar test
testColombiaResearch().catch(console.error)
