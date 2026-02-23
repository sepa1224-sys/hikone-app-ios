/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.NEXT_OUTPUT_EXPORT === '1' ? 'export' : undefined,
  assetPrefix: '',
  trailingSlash: false,
  images: {
    unoptimized: true,
    domains: ['192.168.178.46', '172.20.10.5'],
  },
  async headers() {
    const isDev = process.env.NODE_ENV !== 'production'
    if (!isDev) return []
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ]
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
