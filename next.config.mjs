/** @type {import('next').NextConfig} */
const nextConfig = {
  // Image optimization configuration
  reactStrictMode: false,
  images: {
    // Vercel-friendly domains
    domains: [
      'pngdownload.io',
      'picsum.photos',
      'localhost',
      'pocpoc.online',
      'api.pocpoc.online',
    ],
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '80',
        pathname: '/v1/files/**',
      },
      {
        protocol: 'https',
        hostname: 'api.pocpoc.online',
        pathname: '/v1/files/**',
      },
    ],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 3600,
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  // Webpack configuration - SIMPLIFIED to not interfere with middleware
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Client-side fallbacks
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        crypto: false,
      };
    }

    // Add any custom webpack rules here
    config.module.rules.push({
      test: /\.(png|jpe?g|gif|svg|eot|ttf|woff|woff2)$/i,
      type: 'asset',
    });

    return config;
  },
  // Headers for security and performance
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          }
        ]
      }
    ];
  },
  typescript: {
    ignoreBuildErrors: false, // Set to true only if absolutely necessary
  },
  eslint: {
    ignoreDuringBuilds: false, // Set to true only if absolutely necessary
  },
  trailingSlash: false,
  poweredByHeader: false, // Remove X-Powered-By header
  compress: true,
};

// Use ES module export
export default nextConfig;