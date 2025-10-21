import { Toaster } from "@/components/ui/sonner"
import { GlobalState } from "@/components/utility/global-state"
import { Providers } from "@/components/utility/providers"
import { ThemeFix } from "@/components/utility/theme-fix"
import TranslationsProvider from "@/components/utility/translations-provider"
import initTranslations from "@/lib/i18n"
import { Database } from "@/supabase/types"
import { createServerClient } from "@supabase/ssr"
import { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { cookies } from "next/headers"
import { ReactNode } from "react"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })
const APP_NAME = "ALI"
const APP_DEFAULT_TITLE = "ALI"
const APP_TITLE_TEMPLATE = "%s - ALI"
const APP_DESCRIPTION = "ALI, Inteligencia artificial con todas las de la ley"

interface RootLayoutProps {
  children: ReactNode
  params: {
    locale: string
  }
}

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: APP_DEFAULT_TITLE,
    template: APP_TITLE_TEMPLATE
  },
  description: APP_DESCRIPTION,
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black",
    title: APP_DEFAULT_TITLE
    // startUpImage: [],
  },
  formatDetection: {
    telephone: false
  },
  openGraph: {
    type: "website",
    siteName: APP_NAME,
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE
    },
    description: APP_DESCRIPTION,
    images: [
      {
        url: "/ali-og-image.svg",
        width: 1200,
        height: 630,
        alt: "ALI - Inteligencia artificial con todas las de la ley"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE
    },
    description: APP_DESCRIPTION,
    images: ["/ali-og-image.svg"]
  }
}

export const viewport: Viewport = {
  themeColor: "#000000"
}

const i18nNamespaces = ["translation"]

export default async function RootLayout({
  children,
  params: { locale }
}: RootLayoutProps) {
  const cookieStore = cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        }
      }
    }
  )
  const session = (await supabase.auth.getSession()).data.session

  const { t, resources } = await initTranslations(locale, i18nNamespaces)

  return (
    <html lang={locale} suppressHydrationWarning className="dark" style={{ colorScheme: 'dark' }}>
      <head>
        <link rel="icon" href="/favicon-ali.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <link rel="shortcut icon" href="/favicon-ali.svg" />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html {
                background-color: hsl(0, 0%, 3.9%) !important;
                color: hsl(0, 0%, 98%) !important;
                color-scheme: dark !important;
              }
              body {
                background-color: hsl(0, 0%, 3.9%) !important;
                color: hsl(0, 0%, 98%) !important;
                margin: 0 !important;
                padding: 0 !important;
                min-height: 100vh !important;
              }
            `,
          }}
        />
      </head>
      <body className={inter.className} style={{ backgroundColor: 'hsl(0, 0%, 3.9%)', color: 'hsl(0, 0%, 98%)' }}>
        <Providers attribute="class" defaultTheme="dark" enableSystem={false}>
          <TranslationsProvider
            namespaces={i18nNamespaces}
            locale={locale}
            resources={resources}
          >
            <Toaster richColors position="top-center" duration={3000} />
            <div className="bg-background text-foreground flex h-dvh flex-col items-center overflow-x-auto">
              {session ? <GlobalState>{children}</GlobalState> : children}
            </div>
          </TranslationsProvider>
        </Providers>
      </body>
    </html>
  )
}
