/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  experimental: {
    serverComponentsExternalPackages: ["bullmq", "ioredis", "bcryptjs"],
  },
  async redirects() {
    return [
      { source: "/favicon.ico", destination: "/icon.svg", permanent: false },
      // Consolidate overlapping industry intent onto /solutions/* (canonical).
      {
        source: "/email-marketing-for-restaurants",
        destination: "/solutions/restaurants",
        permanent: true,
      },
      {
        source: "/email-marketing-for-breweries",
        destination: "/solutions/breweries",
        permanent: true,
      },
      {
        source: "/email-marketing-for-retail",
        destination: "/solutions/retail",
        permanent: true,
      },
      {
        source: "/email-marketing-for-real-estate",
        destination: "/solutions/real-estate",
        permanent: true,
      },
      {
        source: "/email-marketing-for-nonprofits",
        destination: "/solutions/nonprofits",
        permanent: true,
      },
      {
        source: "/email-marketing-for-events",
        destination: "/solutions/local-events",
        permanent: true,
      },
      {
        source: "/email-marketing-for-local-business",
        destination: "/solutions/professional-services",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
