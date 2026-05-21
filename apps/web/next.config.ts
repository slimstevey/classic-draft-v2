import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@repo/shared'],
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'axiecdn.axieinfinity.com' },
      { protocol: 'https', hostname: 'cdn.discordapp.com' },
    ],
  },
}

export default nextConfig
