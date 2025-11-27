import { searchWithSerperSimple } from './simple-serper-search'

export interface DeepLegalSearchResult {
  success: boolean
  results: LegalSearchResultItem[]
  context: string
  strategy: string
}

export interface LegalSearchResultItem {
  title: string
  url: string
  snippet: string
  sourceType: 'official' | 'academic' | 'jurisprudence' | 'general'
  date?: string
}

/**
 * Realiza una búsqueda legal profunda utilizando múltiples estrategias y filtrado de fuentes.
 */
export async function executeDeepLegalSearch(query: string): Promise<DeepLegalSearchResult> {
  console.log(`⚖️ Iniciando Búsqueda Legal Profunda para: "${query}"`)

  try {
    // 1. Definir estrategias de búsqueda paralela
    const strategies = [
      {
        type: 'official',
        query: `${query} site:gov.co -site:wikipedia.org`,
        num: 4
      },
      {
        type: 'jurisprudence',
        query: `${query} (site:corteconstitucional.gov.co OR site:consejodeestado.gov.co OR site:cortesuprema.gov.co) sentencia`,
        num: 3
      },
      {
        type: 'normative',
        query: `${query} site:suin-juriscol.gov.co ley decreto`,
        num: 3
      }
    ]

    // 2. Ejecutar búsquedas en paralelo
    const searchPromises = strategies.map(strategy => 
      searchWithSerperSimple(strategy.query, strategy.num)
        .then(result => ({ ...result, strategyType: strategy.type }))
        .catch(err => {
          console.error(`❌ Error en estrategia ${strategy.type}:`, err)
          return { success: false, results: [], strategyType: strategy.type }
        })
    )

    const results = await Promise.all(searchPromises)

    // 3. Procesar y unificar resultados
    let allItems: LegalSearchResultItem[] = []
    const seenUrls = new Set<string>()

    results.forEach(res => {
      if (res.success && res.results) {
        res.results.forEach((item: any) => {
          if (!seenUrls.has(item.url)) {
            seenUrls.add(item.url)
            
            // Clasificar fuente
            let sourceType: LegalSearchResultItem['sourceType'] = 'general'
            if (item.url.includes('.gov.co')) sourceType = 'official'
            if (item.url.includes('scielo') || item.url.includes('dialnet') || item.url.includes('redalyc')) sourceType = 'academic'
            if (res.strategyType === 'jurisprudence') sourceType = 'jurisprudence'

            allItems.push({
              title: item.title,
              url: item.url,
              snippet: item.snippet,
              sourceType,
              date: item.date
            })
          }
        })
      }
    })

    // 4. Ordenar por relevancia legal (Oficial > Jurisprudencia > General)
    allItems.sort((a, b) => {
      const score = (type: string) => {
        if (type === 'official') return 3
        if (type === 'jurisprudence') return 2
        if (type === 'academic') return 1
        return 0
      }
      return score(b.sourceType) - score(a.sourceType)
    })

    // 5. Generar contexto formateado
    const context = formatDeepLegalContext(allItems)

    console.log(`✅ Búsqueda Profunda completada: ${allItems.length} resultados únicos.`)

    return {
      success: allItems.length > 0,
      results: allItems,
      context,
      strategy: 'multi-source-parallel'
    }

  } catch (error) {
    console.error('❌ Error crítico en Deep Legal Search:', error)
    return {
      success: false,
      results: [],
      context: '',
      strategy: 'failed'
    }
  }
}

function formatDeepLegalContext(items: LegalSearchResultItem[]): string {
  if (items.length === 0) return "No se encontraron fuentes legales específicas."

  let context = "**FUENTES LEGALES ENCONTRADAS Y VERIFICADAS:**\n\n"

  // Agrupar por tipo para mejor lectura del modelo
  const official = items.filter(i => i.sourceType === 'official' || i.sourceType === 'jurisprudence')
  const others = items.filter(i => i.sourceType !== 'official' && i.sourceType !== 'jurisprudence')

  if (official.length > 0) {
    context += "🏛️ **FUENTES OFICIALES Y JURISPRUDENCIA:**\n"
    official.forEach((item, idx) => {
      context += `${idx + 1}. [${item.sourceType.toUpperCase()}] **${item.title}**\n`
      context += `   URL: ${item.url}\n`
      context += `   Resumen: ${item.snippet}\n\n`
    })
  }

  if (others.length > 0) {
    context += "📚 **FUENTES COMPLEMENTARIAS:**\n"
    others.forEach((item, idx) => {
      context += `${idx + 1}. **${item.title}**\n`
      context += `   URL: ${item.url}\n`
      context += `   Resumen: ${item.snippet}\n\n`
    })
  }

  context += `\n**INSTRUCCIONES DE USO DE FUENTES:**
1. Prioriza EXCLUSIVAMENTE la información de la sección "FUENTES OFICIALES".
2. Cita explícitamente la sentencia, ley o decreto mencionado en los resúmenes.
3. Si la información oficial contradice a las fuentes complementarias, ignora las complementarias.
4. NO inventes artículos o fechas que no estén en estos resúmenes.`

  return context
}




