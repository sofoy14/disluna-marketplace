// app/(auth)/layout.tsx
// Layout for authentication routes (login, onboarding, etc.)
// These routes do NOT use locale prefix

import { Inter } from 'next/font/google'
import '../[locale]/globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Asistente Legal Inteligente',
  description: 'Tu asistente de inteligencia artificial para el derecho colombiano',
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className={`${inter.className} dark`}>
        {children}
      </body>
    </html>
  )
}

