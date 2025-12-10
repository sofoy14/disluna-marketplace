import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { getServerSupabaseConfig } from "@/lib/supabase/robust-client"

export const createClient = (cookieStore: ReturnType<typeof cookies>) => {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/1d59dc66-8b75-476c-bd1d-2b247f5ce997',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/supabase/server.ts:5',message:'createClient called',data:{nodeEnv:process.env.NODE_ENV,hasCookieStore:!!cookieStore},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
  // #endregion
  
  const { url, serviceRoleKey } = getServerSupabaseConfig()
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/1d59dc66-8b75-476c-bd1d-2b247f5ce997',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/supabase/server.ts:9',message:'After getServerSupabaseConfig',data:{hasUrl:!!url,hasServiceKey:!!serviceRoleKey,urlLength:url?.length||0,serviceKeyLength:serviceRoleKey?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B,C'})}).catch(()=>{});
  // #endregion
  
  return createServerClient(url, serviceRoleKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch (error) {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
      removeAll(cookiesToRemove) {
        try {
          cookiesToRemove.forEach(({ name, options }) => {
            cookieStore.set(name, '', { ...options, maxAge: 0 })
          })
        } catch (error) {
          // The `removeAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      }
    }
  })
}
