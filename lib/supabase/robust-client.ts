import { Database } from "@/supabase/types"
import { createBrowserClient } from "@supabase/ssr"

// Función para obtener configuración robusta de Supabase
function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error(
      'Missing Supabase configuration. Please check your environment variables:\n' +
      '- NEXT_PUBLIC_SUPABASE_URL\n' +
      '- NEXT_PUBLIC_SUPABASE_ANON_KEY'
    )
  }

  // Verificar que la URL sea válida
  if (!url.startsWith('https://') || !url.includes('.supabase.co')) {
    throw new Error(
      `Invalid Supabase URL: ${url}\n` +
      'Expected format: https://your-project-id.supabase.co'
    )
  }

  return { url, anonKey }
}

// Variable para cachear el cliente
let _supabaseClient: ReturnType<typeof createBrowserClient<Database>> | null = null

// Cliente de Supabase robusto con lazy initialization
export const supabase = (() => {
  // Retornar proxy que crea el cliente solo cuando se necesita
  return new Proxy({} as ReturnType<typeof createBrowserClient<Database>>, {
    get(target, prop) {
      // Crear cliente solo cuando se accede por primera vez
      if (!_supabaseClient) {
        try {
          const { url, anonKey } = getSupabaseConfig()
          
          console.log('🔧 Configurando cliente de Supabase:', {
            url: url.substring(0, 30) + '...',
            hasAnonKey: !!anonKey
          })

          _supabaseClient = createBrowserClient<Database>(url, anonKey)
        } catch (error) {
          console.error('❌ Error configurando Supabase:', error)
          throw error
        }
      }
      
      const value = (_supabaseClient as any)[prop]
      return typeof value === 'function' ? value.bind(_supabaseClient) : value
    }
  })
})()

// Función para verificar la conexión
export async function verifySupabaseConnection() {
  try {
    const { data, error } = await supabase.from('profiles').select('count').limit(1)
    
    if (error) {
      throw new Error(`Supabase connection failed: ${error.message}`)
    }

    console.log('✅ Conexión con Supabase verificada exitosamente')
    return true
  } catch (error) {
    console.error('❌ Error verificando conexión con Supabase:', error)
    throw error
  }
}

// Función para obtener configuración de Supabase para el servidor
export function getServerSupabaseConfig() {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/1d59dc66-8b75-476c-bd1d-2b247f5ce997',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/supabase/robust-client.ts:77',message:'getServerSupabaseConfig entry',data:{nodeEnv:process.env.NODE_ENV,allEnvKeys:Object.keys(process.env).filter(k=>k.includes('SUPABASE')).join(','),hasUrl:!!process.env.NEXT_PUBLIC_SUPABASE_URL,hasServiceKey:!!process.env.SUPABASE_SERVICE_ROLE_KEY,urlType:typeof process.env.NEXT_PUBLIC_SUPABASE_URL,serviceKeyType:typeof process.env.SUPABASE_SERVICE_ROLE_KEY,urlLength:process.env.NEXT_PUBLIC_SUPABASE_URL?.length||0,serviceKeyLength:process.env.SUPABASE_SERVICE_ROLE_KEY?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B,C'})}).catch(()=>{});
  // #endregion
  
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/1d59dc66-8b75-476c-bd1d-2b247f5ce997',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/supabase/robust-client.ts:82',message:'After reading env vars',data:{urlValue:url?url.substring(0,20)+'...':'undefined',urlTruthy:!!url,serviceKeyValue:serviceKey?serviceKey.substring(0,20)+'...':'undefined',serviceKeyTruthy:!!serviceRoleKey,willThrow:!url||!serviceRoleKey},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B,C'})}).catch(()=>{});
  // #endregion

  if (!url || !serviceRoleKey) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/1d59dc66-8b75-476c-bd1d-2b247f5ce997',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/supabase/robust-client.ts:87',message:'Throwing error - missing env vars',data:{missingUrl:!url,missingServiceKey:!serviceRoleKey,urlExists:url!==undefined,serviceKeyExists:serviceRoleKey!==undefined},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B,C'})}).catch(()=>{});
    // #endregion
    
    throw new Error(
      'Missing Supabase server configuration. Please check your environment variables:\n' +
      '- NEXT_PUBLIC_SUPABASE_URL\n' +
      '- SUPABASE_SERVICE_ROLE_KEY'
    )
  }

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/1d59dc66-8b75-476c-bd1d-2b247f5ce997',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/supabase/robust-client.ts:95',message:'Returning config successfully',data:{urlLength:url.length,serviceKeyLength:serviceRoleKey.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B,C'})}).catch(()=>{});
  // #endregion

  return { url, serviceRoleKey }
}



