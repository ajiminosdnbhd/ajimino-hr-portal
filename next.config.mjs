/** @type {import('next').NextConfig} */
const nextConfig = {
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
