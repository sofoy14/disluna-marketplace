// lib/auth/email-verification-middleware.ts
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function requireEmailVerification() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login');
  }
  
  if (!user.email_confirmed_at) {
    redirect('/auth/verify-email');
  }
  
  return user;
}

export async function requireOnboardingCompletion() {
  const user = await requireEmailVerification();
  
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_completed, onboarding_step')
    .eq('user_id', user.id)
    .single();
  
  if (!profile?.onboarding_completed) {
    redirect('/onboarding');
  }
  
  return { user, profile };
}





