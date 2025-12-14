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

    // Ensure URL is properly formatted and doesn't contain internal hostnames
    let cleanUrl = supabaseUrl.trim().replace(/\/$/, '');
    
    // Validate URL format - must be a valid HTTP/HTTPS URL
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      throw new Error(`Invalid Supabase URL format: ${cleanUrl}. Must start with http:// or https://`);
    }
    
    // Ensure it's a cloud Supabase URL (not local/internal)
    if (cleanUrl.includes('supabase_kong') || cleanUrl.includes('localhost') || cleanUrl.includes('127.0.0.1')) {
      console.warn(`Warning: Supabase URL appears to be local/internal: ${cleanUrl}`);
    }

    _supabaseServer = createClient<Database>(cleanUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      db: {
        schema: 'public'
      },
      global: {
        headers: {
          'x-client-info': 'supabase-js-server'
        }
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




