import type { NextConfig } from 'next';
import path from 'path';

const API_URL = process.env.API_URL ?? 'http://localhost:4100';

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../../'),
  transpilePackages: ['@mktengine/shared'],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${API_URL}/api/:path*`,
      },
      {
        source: '/p/:path*',
        destination: `${API_URL}/p/:path*`,
      },
    ];
  },
};

export default nextConfig;
