// app/(auth)/login/page.tsx
// Redirects /login to /es/login (with locale)
// This prevents /login from being matched as [locale]='login'

import { redirect } from 'next/navigation'

export default function LoginRedirect() {
  // Redirect to the Spanish login page
  redirect('/es/login')
}

