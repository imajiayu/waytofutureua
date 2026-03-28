const { withSentryConfig } = require('@sentry/nextjs')
const withNextIntl = require('next-intl/plugin')('./i18n.ts')

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // 添加 HTML 文件作为字符串导入的支持
    config.module.rules.push({
      test: /\.html$/,
      type: 'asset/source',
    })
    return config
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'nowpayments.io',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 604800, // P1 优化: 1周缓存 (生产环境)
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb', // 增加到 50MB 以支持文件上传
      allowedOrigins: [
        'waytofutureua.org.ua',
        'www.waytofutureua.org.ua',
        '*.waytofutureua.org.ua',
        'secure.wayforpay.com', // Allow WayForPay redirect
        'localhost:3000', // Development
      ],
    },
  },
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://secure.wayforpay.com",
              "style-src 'self' 'unsafe-inline' https://secure.wayforpay.com blob:",
              "img-src 'self' data: https: blob:",
              "font-src 'self' data:",
              "media-src 'self' https://*.supabase.co blob:",
              "connect-src 'self' https://secure.wayforpay.com https://*.supabase.co wss://*.supabase.co",
              "frame-src 'self' https://secure.wayforpay.com",
              "form-action 'self' https://secure.wayforpay.com",
              "worker-src 'self' blob:",
              "child-src 'self' blob: https://secure.wayforpay.com",
            ].join('; '),
          },
          {
            key: 'Permissions-Policy',
            value: 'payment=(self "https://secure.wayforpay.com")',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ]
  },
}

// Sentry configuration options
const sentryWebpackPluginOptions = {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // Disable source map upload in local development (speeds up build)
  disableSourceMapUpload: !process.env.CI && !process.env.VERCEL,

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  tunnelRoute: '/monitoring',

  // Hides source maps from generated client bundles
  hideSourceMaps: true,

  // New webpack-specific options (replaces deprecated top-level options)
  webpack: {
    // Automatically annotate React components to show their full name in breadcrumbs and session replay
    reactComponentAnnotation: {
      enabled: true,
    },

    // Automatically tree-shake Sentry logger statements to reduce bundle size
    treeshake: {
      removeDebugLogging: true,
    },

    // Enables automatic instrumentation of Vercel Cron Monitors
    automaticVercelMonitors: true,
  },
}

// Make sure adding Sentry options is the last code to run before exporting
module.exports = withSentryConfig(withNextIntl(nextConfig), sentryWebpackPluginOptions)
