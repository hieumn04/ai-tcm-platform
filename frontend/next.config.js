const createNextIntlPlugin = require('next-intl/plugin')

const withNextIntl = createNextIntlPlugin()

const nextConfig = {
  output: 'standalone',
  experimental: {
    optimizePackageImports: ['@nextui-org/react', 'lucide-react'],
  },
  rewrites: async () => [
    {
      source: '/api/:path*',
      destination: process.env.NEXT_PUBLIC_BACKEND_ORIGIN
        ? `${process.env.NEXT_PUBLIC_BACKEND_ORIGIN}/:path*`
        : '/:path*',
    },
  ],
}

module.exports = withNextIntl(nextConfig)
