import { createBrowserClient } from "@supabase/ssr"
import { Database } from "@/supabase/types"

// Validar que las variables de entorno estén disponibles
function getSupabaseEnv() {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/1d59dc66-8b75-476c-bd1d-2b247f5ce997',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/supabase/browser-client.ts:getSupabaseEnv',message:'Checking environment variables',data:{hasUrl:!!process.env.NEXT_PUBLIC_SUPABASE_URL,hasAnonKey:!!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,urlLength:process.env.NEXT_PUBLIC_SUPABASE_URL?.length||0,anonKeyLength:process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length||0,nodeEnv:process.env.NODE_ENV},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    const missing = []
    if (!url) missing.push('NEXT_PUBLIC_SUPABASE_URL')
    if (!anonKey) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/1d59dc66-8b75-476c-bd1d-2b247f5ce997',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/supabase/browser-client.ts:getSupabaseEnv',message:'Environment variables missing',data:{missing,urlValue:url||'undefined',anonKeyValue:anonKey?'present':'undefined',nodeEnv:process.env.NODE_ENV},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    const isProduction = process.env.NODE_ENV === 'production'
    const envFileHint = isProduction 
      ? `Please set these as environment variables in your deployment platform (Dockploy/Vercel/etc.):\n` +
        `NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co\n` +
        `NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key\n\n` +
        `Note: In production, use system environment variables, not .env.local files.`
      : `Please add these to your .env.local file:\n` +
        `NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co\n` +
        `NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key\n\n`
    
    const errorMessage = `Missing required environment variables: ${missing.join(', ')}\n\n` +
      envFileHint +
      `Get these values from: https://supabase.com/dashboard/project/_/settings/api`
    
    console.error('❌ Supabase Configuration Error:', errorMessage)
    throw new Error(errorMessage)
  }

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/1d59dc66-8b75-476c-bd1d-2b247f5ce997',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/supabase/browser-client.ts:getSupabaseEnv',message:'Environment variables found',data:{urlPrefix:url.substring(0,30),hasAnonKey:!!anonKey},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion

  return { url, anonKey }
}

export const createClient = () => {
  const { url, anonKey } = getSupabaseEnv()
  return createBrowserClient<Database>(url, anonKey)
}

// Exportar también una instancia por defecto para compatibilidad
// Usar lazy initialization para evitar errores en tiempo de importación
let _supabaseInstance: ReturnType<typeof createBrowserClient<Database>> | null = null

export const supabase = new Proxy({} as ReturnType<typeof createBrowserClient<Database>>, {
  get(target, prop) {
    if (!_supabaseInstance) {
      _supabaseInstance = createClient()
    }
    const value = (_supabaseInstance as any)[prop]
    return typeof value === 'function' ? value.bind(_supabaseInstance) : value
  }
})
