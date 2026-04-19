/** @type {import('next').NextConfig} */
const nextConfig = {
  // Unique ID stamped into every build — changes on every deployment.
  // AppGuard compares this against /api/version on tab focus to detect
  // new deployments and force a reload automatically.
  env: {
    NEXT_PUBLIC_BUILD_ID: process.env.VERCEL_GIT_COMMIT_SHA || Date.now().toString(),
  },
  // Suppress non-critical ESLint warnings during build
  eslint: {
    ignoreDuringBuilds: false,
  },
  // Image optimisation
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  // Compress responses
  compress: true,
  // Power by header removal (minor security + performance)
  poweredByHeader: false,
  // Tree-shake large packages — only import what's actually used
  experimental: {
    optimizePackageImports: ['jspdf', 'jspdf-autotable'],
  },
  async headers() {
    return [
      {
        // HTML pages — never cache, always revalidate with the server.
        // Covers mobile browsers (iOS Safari, Android Chrome) that aggressively
        // disk-cache pages even when closing/reopening the browser.
        source: '/((?!_next/static|_next/image|favicon\\.ico).*)',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate, max-age=0' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
          // Tells Vercel Edge not to serve from its own cache
          { key: 'CDN-Cache-Control', value: 'no-store' },
          { key: 'Vercel-CDN-Cache-Control', value: 'no-store' },
        ],
      },
    ]
  },
};

export default nextConfig;
