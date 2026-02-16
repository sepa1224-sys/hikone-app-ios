/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.NEXT_OUTPUT_EXPORT === '1' ? 'export' : undefined,
  images: {
    unoptimized: true,
    domains: ['192.168.178.46'],
  },
  allowedDevOrigins: ['192.168.178.46:3000'],
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
