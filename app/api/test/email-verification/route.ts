// app/api/test/email-verification/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // Test sending verification email
    const { data, error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback?next=/auth/verify-email`
      }
    });

    if (error) {
      console.error('Error sending test verification email:', error);
      return NextResponse.json(
        { 
          success: false,
          error: error.message,
          details: error
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Test verification email sent successfully',
      data: data
    });

  } catch (error) {
    console.error('Error in test email verification endpoint:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}





