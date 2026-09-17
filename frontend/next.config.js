const createNextIntlPlugin = require('next-intl/plugin')

const withNextIntl = createNextIntlPlugin()

const backendOrigin = process.env.NEXT_PUBLIC_BACKEND_ORIGIN 
  ? process.env.NEXT_PUBLIC_BACKEND_ORIGIN.replace(/\/api\/?$/, '').replace(/\/+$/, '')
  : '';

const nextConfig = {
  output: 'standalone',
  experimental: {
    optimizePackageImports: ['@nextui-org/react', 'lucide-react'],
  },
  rewrites: async () => {
    if (!backendOrigin) return [];
    return [
      {
        source: '/api/:path*',
        destination: `${backendOrigin}/api/:path*`,
      },
    ];
  },
}

module.exports = withNextIntl(nextConfig)
