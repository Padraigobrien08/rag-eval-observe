/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer, dev }) => {
    // Fix for pdfjs-dist in Next.js
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        canvas: false,
        pg: false,
        'pg-native': false,
      }

      // Exclude server-only packages from client bundle
      config.externals = config.externals || []
      config.externals.push('pg', 'pg-native')

      // Prevent pdfjs-dist from being processed as ES module
      config.module.rules.push({
        test: /node_modules\/pdfjs-dist/,
        type: 'javascript/auto',
      })
    }

    // Improve webpack runtime stability in development
    if (dev) {
      // Use consistent module/chunk IDs to prevent webpack runtime errors
      config.optimization = {
        ...config.optimization,
        moduleIds: 'named',
        chunkIds: 'named',
        // Disable aggressive chunking that can cause runtime issues
        splitChunks: {
          ...config.optimization.splitChunks,
          cacheGroups: {
            default: false,
            vendors: false,
          },
        },
      }

      // Ensure webpack runtime is properly configured
      if (!config.output) {
        config.output = {}
      }
      config.output.chunkLoadingGlobal = 'webpackChunkLoad'
    }

    return config
  },
}

module.exports = nextConfig
