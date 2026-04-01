import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
