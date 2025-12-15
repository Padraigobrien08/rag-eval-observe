/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    // Fix for pdfjs-dist in Next.js
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        canvas: false,
      }

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
