/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  experimental: {
    serverComponentsExternalPackages: ["bullmq", "ioredis", "bcryptjs"],
  },
};

export default nextConfig;
