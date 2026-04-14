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
  async headers() {
    return [
      {
        // Don't cache HTML pages — always fetch fresh
        source: '/((?!_next/static|_next/image|favicon\\.ico).*)',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
        ],
      },
    ]
  },
};

export default nextConfig;
