const defaultRuntimeCaching = require("next-pwa/cache")
const webpack = require("webpack")
const { getSecurityHeaders } = require("./lib/security-headers-config")

const withPWA = require("next-pwa")({
  dest: "public",
  disable: process.env.NODE_ENV === "development" || process.env.DISABLE_PWA === "true",
  register: true,
  skipWaiting: true,
  clientsClaim: true,
  cleanupOutdatedCaches: true,
  runtimeCaching: [
    // Runtime-injected public env must never be cached.
    {
      urlPattern: /\/env\.js$/i,
      handler: "NetworkOnly",
      options: { cacheName: "runtime-env" }
    },
    // Never cache API calls.
    {
      urlPattern: /^https:\/\/.*\/api\/.*/i,
      handler: "NetworkOnly",
      options: { cacheName: "api-calls" }
    },
    ...defaultRuntimeCaching
  ],
  buildExcludes: [/middleware-manifest\\.json$/]
})

module.exports = withPWA({
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true
  },
  typescript: {
    ignoreBuildErrors: true
  },
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost" },
      { protocol: "http", hostname: "127.0.0.1" },
      { protocol: "https", hostname: "**" }
    ]
  },

  // Apply security headers to all routes
  async headers() {
    const securityHeaders = getSecurityHeaders();

    return [
      {
        source: '/:path*',
        headers: Object.entries(securityHeaders).map(([key, value]) => ({
          key,
          value,
        })),
      },
    ];
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
        tls: false
      }

      // Some client-side dependencies still reference the Node.js `process` global.
      // Next.js does not guarantee a `process` polyfill in the browser, so provide one.
      config.plugins = config.plugins || []
      config.plugins.push(
        new webpack.ProvidePlugin({
          process: "next/dist/compiled/process/browser",
          Buffer: ["next/dist/compiled/buffer", "Buffer"]
        })
      )
    }
    return config
  }
})
