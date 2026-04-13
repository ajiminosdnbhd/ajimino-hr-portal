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
};

export default nextConfig;
