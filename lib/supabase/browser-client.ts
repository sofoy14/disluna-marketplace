import { createBrowserClient } from "@supabase/ssr"
import { Database } from "@/supabase/types"

// Validar que las variables de entorno estén disponibles
function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    const missing = []
    if (!url) missing.push('NEXT_PUBLIC_SUPABASE_URL')
    if (!anonKey) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    
    const errorMessage = `Missing required environment variables: ${missing.join(', ')}\n\n` +
      `Please add these to your .env.local file:\n` +
      `NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co\n` +
      `NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key\n\n` +
      `Get these values from: https://supabase.com/dashboard/project/_/settings/api`
    
    console.error('❌ Supabase Configuration Error:', errorMessage)
    throw new Error(errorMessage)
  }

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
