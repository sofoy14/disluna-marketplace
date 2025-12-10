// Cargar variables de entorno desde .env explícitamente
// Cargar primero .env.local si existe, luego .env
const fs = require('fs');
const path = require('path');
const logPath = path.join(__dirname, '.cursor', 'debug.log');

// #region agent log
try {
  const hasEnvLocal = fs.existsSync('.env.local');
  const hasEnv = fs.existsSync('.env');
  const urlBefore = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKeyBefore = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  require('dotenv').config({ path: '.env.local' });
  require('dotenv').config({ path: '.env' });
  const urlAfter = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKeyAfter = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const logEntry = JSON.stringify({
    location: 'next.config.js:dotenv-load',
    message: 'Environment variable loading',
    data: {
      hasEnvLocal,
      hasEnv,
      urlBefore: !!urlBefore,
      urlAfter: !!urlAfter,
      anonKeyBefore: !!anonKeyBefore,
      anonKeyAfter: !!anonKeyAfter,
      nodeEnv: process.env.NODE_ENV
    },
    timestamp: Date.now(),
    sessionId: 'debug-session',
    runId: 'run1',
    hypothesisId: 'B'
  }) + '\n';
  fs.appendFileSync(logPath, logEntry);
} catch (e) {
  // Ignore if log file doesn't exist yet
}
// #endregion

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
  // Exponer variables de entorno al cliente
  // IMPORTANTE: En producción (Dockploy/Vercel/etc.), estas variables deben estar
  // configuradas como variables de entorno del sistema ANTES del build.
  // NEXT_PUBLIC_* variables se incrustan en el bundle en tiempo de build.
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
