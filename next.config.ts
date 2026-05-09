import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  // Fix Next.js lockfile warning
  turbopack: {
    root: path.resolve(__dirname),
  },
  serverExternalPackages: [],
  allowedDevOrigins: ['*.dev.coze.site'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
