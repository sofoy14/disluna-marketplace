import { NextResponse } from 'next/server'
import { getEnvVar } from '@/lib/env/runtime-env'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabaseUrl = getEnvVar('NEXT_PUBLIC_SUPABASE_URL')
  const supabaseAnonKey = getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  
  // Mask the key for security (show first 20 and last 10 chars)
  const maskedKey = supabaseAnonKey 
    ? `${supabaseAnonKey.substring(0, 20)}...${supabaseAnonKey.substring(supabaseAnonKey.length - 10)}`
    : 'NOT SET'
  
  return NextResponse.json({
    supabaseUrl,
    anonKeyPreview: maskedKey,
    anonKeyLength: supabaseAnonKey?.length || 0,
    nodeEnv: process.env.NODE_ENV,
    rawEnvUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 40) + '...',
  })
}
