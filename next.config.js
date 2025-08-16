const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optimize compilation
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
    // Remove React DevTools in production
    reactRemoveProperties: process.env.NODE_ENV === 'production',
    // Enable SWC minification for better performance
    styledComponents: true,
  },
  
  // Optimized experimental features for stable navigation
  experimental: {
    // Minimal experimental features to avoid navigation issues
    optimizeServerReact: false, // Disable to prevent SSR/client mismatches
    // Disable Turbopack in production to ensure stability
    turbo: process.env.NODE_ENV === 'development' ? {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    } : undefined,
    // Conservative package optimization
    optimizePackageImports: ['lucide-react'],
  },
  
  // Image optimization - dynamic based on deployment target
  images: {
    domains: [],
    formats: ['image/webp', 'image/avif'],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    unoptimized: process.env.EXPORT_MODE === 'true', // 静态导出时禁用优化
  },
  
  // Output optimizations - force static export for Cloudflare Pages
  output: process.env.EXPORT_MODE === 'true' ? 'export' : undefined,
  trailingSlash: process.env.EXPORT_MODE === 'true', // Required for static export
  distDir: '.next',
  
  // Static export configuration
  ...(process.env.EXPORT_MODE === 'true' && {
    assetPrefix: undefined,
    basePath: '',
    generateBuildId: () => 'build',
  }),
  
  // External packages configuration (moved from experimental)
  serverExternalPackages: ['ethers', 'viem', 'pino', 'pino-pretty'],
  
  // Webpack optimizations
  webpack: (config, { dev, isServer, webpack }) => {
    // Fix pino-pretty dependency issue for Vercel deployment (only for browser)
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
        'pino-pretty': false,
      }
      
      config.resolve.alias = {
        ...config.resolve.alias,
        'pino-pretty': false,
      }
    }
    // Optimized caching for stable navigation
    if (dev) {
      // Conservative webpack caching to prevent navigation issues
      config.cache = {
        type: 'memory', // Use memory cache instead of filesystem for stability
        maxGenerations: 1, // Minimal cache to prevent stale state issues
      }
      
      // Optimize for faster rebuilds without causing connection issues
      config.optimization = {
        ...config.optimization,
        removeAvailableModules: false,
        removeEmptyChunks: false,
        splitChunks: false, // Disable in development to prevent chunking issues
      }
    } else {
      // Production optimization with stable chunking
      config.cache = false
    }
    
    // Production optimizations
    if (!dev) {
      // Enhanced bundle splitting
      config.optimization = {
        ...config.optimization,
        moduleIds: 'deterministic',
        splitChunks: {
          chunks: 'all',
          minSize: 20000,
          maxSize: 244000,
          cacheGroups: {
            // Vendor libraries
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              priority: 10,
            },
            // Web3 related libraries (large)
            web3: {
              test: /[\\/]node_modules[\\/](wagmi|viem|ethers|@tanstack)[\\/]/,
              name: 'web3',
              chunks: 'all',
              priority: 20,
            },
            // UI libraries
            ui: {
              test: /[\\/]node_modules[\\/](@chakra-ui|framer-motion|react-hot-toast)[\\/]/,
              name: 'ui',
              chunks: 'all',
              priority: 15,
            },
            // Common code
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 5,
              enforce: true,
            },
          },
        },
        // Enable compression
        usedExports: true,
        sideEffects: false,
      }
      
      // Add compression plugin
      config.plugins.push(
        new webpack.DefinePlugin({
          'process.env.NODE_ENV': JSON.stringify('production'),
        })
      )
    }
    
    // Module resolution optimizations
    config.resolve = {
      ...config.resolve,
      // Faster module resolution
      modules: ['node_modules'],
      // Extension resolution order
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
      // Alias for faster imports
      alias: {
        ...config.resolve.alias,
        '@': require('path').resolve(__dirname, 'src'),
      },
    }
    
    return config
  },
  
  // Headers, redirects, and rewrites are disabled for static export
  // They will be handled by Cloudflare Pages via _redirects file
  ...(process.env.EXPORT_MODE !== 'true' && {
    async headers() {
      return [
        // Development: Minimal caching to prevent browser cache issues
        ...(process.env.NODE_ENV === 'development' ? [
          {
            source: '/_next/:path*',
            headers: [
              {
                key: 'Cache-Control',
                value: 'no-cache, no-store, must-revalidate',
              },
              {
                key: 'Pragma',
                value: 'no-cache',
              },
              {
                key: 'Expires',
                value: '0',
              },
            ],
          },
          // Prevent HTML caching in development
          {
            source: '/:path*',
            headers: [
              {
                key: 'Cache-Control',
                value: 'no-cache, no-store, must-revalidate',
              },
              {
                key: 'Pragma',
                value: 'no-cache',
              },
              {
                key: 'Expires',
                value: '0',
              },
            ],
          },
          // Prevent service worker caching issues
          {
            source: '/sw.js',
            headers: [
              {
                key: 'Cache-Control',
                value: 'no-cache, no-store, must-revalidate',
              },
            ],
          },
        ] : [
          // Production: Enable caching for static assets
          {
            source: '/_next/static/:path*',
            headers: [
              {
                key: 'Cache-Control',
                value: 'public, max-age=31536000, immutable',
              },
            ],
          },
          // API routes caching
          {
            source: '/api/:path*',
            headers: [
              {
                key: 'Cache-Control',
                value: 'public, s-maxage=86400, stale-while-revalidate=3600',
              },
            ],
          },
        ]),
      ]
    },
    
    // Redirects and rewrites for better SEO
    async redirects() {
      return []
    },
    
    async rewrites() {
      return []
    },
  }),
}

module.exports = withBundleAnalyzer(nextConfig)