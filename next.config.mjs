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
      'images.unsplash.com', // Common image source
      'via.placeholder.com',  // Placeholder images
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
    // Optimize for performance
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 3600,
    
  },

  // Compiler optimizations
  compiler: {
    // Remove console.log in production
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Experimental features - more stable options
  experimental: {
    esmExternals: true,
  },

  // Output configuration for deploymen  
  // Environment variables
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },

  // Webpack configuration
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Client-side fallbacks
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        util: false,
        buffer: false,
        events: false,
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

  // Redirects if needed
  async redirects() {
    return [
      // Add any permanent redirects here
      // {
      //   source: '/old-page',
      //   destination: '/new-page',
      //   permanent: true,
      // },
    ];
  },

  // Rewrites for API routes or proxying
  async rewrites() {
    return [
      // Add any URL rewrites here
      // {
      //   source: '/api/external/:path*',
      //   destination: 'https://external-api.com/:path*',
      // },
    ];
  },

  // Performance optimizations
  swcMinify: true, // Use SWC for minification (faster than Terser)
  
  // TypeScript configuration
  typescript: {
    // Dangerously allow production builds to successfully complete even if your project has type errors
    ignoreBuildErrors: false, // Set to true only if absolutely necessary
  },

  // ESLint configuration
  eslint: {
    // Disable ESLint during builds (not recommended for production)
    ignoreDuringBuilds: false, // Set to true only if absolutely necessary
  },

  // Trailing slash configuration
  trailingSlash: false,

  // Power-ups for production
  poweredByHeader: false, // Remove X-Powered-By header
  
  // Compression
  compress: true,
};

export default nextConfig;