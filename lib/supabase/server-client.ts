// lib/supabase/server-client.ts
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/supabase/types';

let _supabaseServer: ReturnType<typeof createClient<Database>> | null = null;

/**
 * Get or create Supabase server client with lazy initialization
 * This prevents errors during build time when env vars might not be available
 */
export function getSupabaseServer(): ReturnType<typeof createClient<Database>> {
  if (!_supabaseServer) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    _supabaseServer = createClient<Database>(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }

  return _supabaseServer;
}

// Export for backward compatibility (but will throw during build if env vars are missing)
export const supabaseServer = new Proxy({} as ReturnType<typeof createClient<Database>>, {
  get(target, prop) {
    const client = getSupabaseServer();
    const value = (client as any)[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  }
});




