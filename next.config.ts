import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // one address: the Vercel default address sends everything to matwhizzer.com (crawlers were reading
  // both copies of the site, 2026-11-09)
  async redirects() {
    return [{ source: '/:path*', has: [{ type: 'host', value: 'matwhizzer.vercel.app' }], destination: 'https://matwhizzer.com/:path*', permanent: true }]
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'vhffduvgcljvhtlyqgcd.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;
