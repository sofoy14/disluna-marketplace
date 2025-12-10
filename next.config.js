// Cargar variables de entorno desde .env explícitamente
require('dotenv').config({ path: '.env' })

const withPWA = require("next-pwa")({
  dest: "public",
  disable: process.env.NODE_ENV === 'development',
  // Exclude API routes from service worker caching
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/.*\/api\/.*/i,
      handler: 'NetworkOnly',
      options: {
        cacheName: 'api-calls',
      },
    },
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'images',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
        },
      },
    },
  ],
  // Exclude API routes completely from precaching
  buildExcludes: [/middleware-manifest\.json$/],
})

module.exports = withPWA({
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Exponer variables de entorno al cliente desde .env
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_BILLING_ENABLED: process.env.NEXT_PUBLIC_BILLING_ENABLED,
    NEXT_PUBLIC_WOMPI_PUBLIC_KEY: process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY,
    NEXT_PUBLIC_WOMPI_BASE_URL: process.env.NEXT_PUBLIC_WOMPI_BASE_URL,
  },
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost"
      },
      {
        protocol: "http",
        hostname: "127.0.0.1"
      },
      {
        protocol: "https",
        hostname: "**"
      }
    ]
  },
  experimental: {
    serverComponentsExternalPackages: ["sharp", "onnxruntime-node", "undici", "cheerio"]
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      }
    }
    return config
  }
})
