import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import { runDynamicSearchWorkflow } from "@/lib/tools/dynamic-search-orchestrator"

// Force dynamic rendering to prevent build-time execution
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  // Initialize OpenAI client inside the handler
  const apiKey = process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY or OPENROUTER_API_KEY environment variable is required" },
      { status: 500 }
    );
  }

  const openai = new OpenAI({
    apiKey,
    baseURL: process.env.OPENROUTER_API_KEY 
      ? "https://openrouter.ai/api/v1"
      : undefined
  });
  try {
    const { query, model = "gpt-4o", options = {} } = await request.json()

    if (!query) {
      return NextResponse.json(
        { error: "Query es requerida" },
        { status: 400 }
      )
    }

    console.log(`\n🧠 INICIANDO BÚSQUEDA DINÁMICA INTELIGENTE`)
    console.log(`📝 Query: "${query}"`)
    console.log(`🤖 Modelo: ${model}`)

    // Ejecutar búsqueda dinámica
    const searchResult = await runDynamicSearchWorkflow(query, {
      client: openai,
      model,
      maxSearchRounds: options.maxSearchRounds || 10,
      maxSearchesPerRound: options.maxSearchesPerRound || 8,
      searchTimeoutMs: options.searchTimeoutMs || 45000,
      enableModelDecision: options.enableModelDecision !== false
    })

    // Generar respuesta final usando el contexto enriquecido
    const finalResponse = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: `Eres un asistente legal experto en derecho colombiano. Utiliza EXCLUSIVAMENTE la información proporcionada en el contexto para responder la consulta del usuario. 

INSTRUCCIONES CRÍTICAS:
- Usa SOLO la información de las fuentes verificadas proporcionadas
- Cita exactamente las fuentes con enlaces
- Verifica la vigencia de las normas mencionadas
- Si hay contradicciones, explícalas claramente
- Admite cuando la información sea insuficiente
- Proporciona una respuesta completa y bien estructurada

FORMATO DE RESPUESTA:
1. Respuesta directa a la consulta
2. Marco normativo aplicable
3. Jurisprudencia relevante
4. Análisis integrado
5. Conclusiones
6. Fuentes verificadas con enlaces`
        },
        {
          role: "user",
          content: `${searchResult.finalContext}\n\nConsulta del usuario: "${query}"`
        }
      ],
      temperature: 0.1,
      max_tokens: 2000,
      stream: false
    })

    const response = finalResponse.choices?.[0]?.message?.content || "Error generando respuesta"

    return NextResponse.json({
      success: true,
      query,
      response,
      metadata: {
        searchRounds: searchResult.metadata.totalRounds,
        totalSearches: searchResult.metadata.totalSearches,
        totalResults: searchResult.metadata.totalResults,
        finalQuality: searchResult.metadata.finalQuality,
        modelDecisions: searchResult.metadata.modelDecisions,
        searchStrategy: searchResult.metadata.searchStrategy,
        durationMs: searchResult.metadata.totalDurationMs
      },
      sources: searchResult.allResults.map(result => ({
        title: result.title,
        url: result.url,
        type: result.type,
        quality: result.quality,
        authority: result.authority
      }))
    })

  } catch (error) {
    console.error("Error en búsqueda dinámica:", error)
    
    return NextResponse.json(
      { 
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido"
      },
      { status: 500 }
    )
  }
}












