import type { NextConfig } from 'next'
import withPWAInit from 'next-pwa'
import { withSentryConfig } from '@sentry/nextjs'

const withPWA = withPWAInit({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    // Static Next.js assets — cache first, long TTL
    {
      urlPattern: /^\/_next\/static\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'next-static',
        expiration: { maxEntries: 200, maxAgeSeconds: 86400 },
      },
    },
    // Supabase Storage images — cache first, 24h TTL
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/v1\/object\/public\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'supabase-images',
        expiration: { maxEntries: 100, maxAgeSeconds: 86400 },
      },
    },
    // Kitchen & waiter pages — network only (must never show stale order state)
    {
      urlPattern: /^\/(kitchen|waiter)(\/|$)/i,
      handler: 'NetworkOnly',
    },
    // Menu & order status pages — network first with 10s timeout, fallback to cache
    {
      urlPattern: /^\/t\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'customer-pages',
        networkTimeoutSeconds: 10,
        expiration: { maxEntries: 50, maxAgeSeconds: 3600 },
      },
    },
    // Admin pages — network first, short cache window
    {
      urlPattern: /^\/admin\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'admin-pages',
        networkTimeoutSeconds: 10,
        expiration: { maxEntries: 30, maxAgeSeconds: 300 },
      },
    },
  ],
})

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // 'unsafe-eval' is only needed by the dev/HMR runtime — never ship it to prod.
              `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''}`,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://*.supabase.co https://images.unsplash.com",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
              "font-src 'self' https://fonts.gstatic.com",
              "media-src 'self' blob:",
              "frame-src 'self'",
              "frame-ancestors 'self'",
            ].join('; '),
          },
        ],
      },
    ]
  },
  turbopack: {},
}

const pwaConfig = withPWA(nextConfig as any)

// withSentryConfig uploads source maps at build time when SENTRY_AUTH_TOKEN is set.
// Skipped silently in dev/when token is absent.
export default withSentryConfig(pwaConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  sourcemaps: { deleteSourcemapsAfterUpload: true },
  disableLogger: true,
  automaticVercelMonitors: true,
})
