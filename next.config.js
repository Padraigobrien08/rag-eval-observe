/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [{ source: '/favicon.ico', destination: '/RAGEvalIcon.png' }]
  },
  webpack: (config, { isServer }) => {
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

    return config
  },
}

module.exports = nextConfig
