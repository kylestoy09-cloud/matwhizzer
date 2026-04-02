import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'vhffduvgcljvhtlyqgcd.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/boys/schools/:school',
        destination: '/schools/:school?gender=boys',
        permanent: true,
      },
      {
        source: '/girls/schools/:school',
        destination: '/schools/:school?gender=girls',
        permanent: true,
      },
    ]
  },
};

export default nextConfig;
