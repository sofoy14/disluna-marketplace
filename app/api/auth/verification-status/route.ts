// app/api/auth/verification-status/route.ts
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'No user session' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        user_id: user.id,
        email: user.email,
        email_confirmed_at: user.email_confirmed_at,
        is_verified: !!user.email_confirmed_at
      }
    });

  } catch (error) {
    console.error('Error checking verification status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
