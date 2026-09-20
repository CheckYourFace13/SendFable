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
      // Content hub lives at /resources — do not 404 /blog.
      { source: "/blog", destination: "/resources", permanent: true },
      { source: "/blog/:path*", destination: "/resources", permanent: true },
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
      // Mailchimp SEO cluster → canonical trio + alternative hub
      { source: "/vs/mailchimp", destination: "/compare/mailchimp", permanent: true },
      { source: "/alternatives/mailchimp", destination: "/mailchimp-alternative", permanent: true },
      { source: "/switch-from-mailchimp", destination: "/migrate/mailchimp", permanent: true },
      {
        source: "/guides/how-to-switch-from-mailchimp",
        destination: "/migrate/mailchimp",
        permanent: true,
      },
      {
        source: "/guides/mailchimp-vs-sendfable-pricing",
        destination: "/mailchimp-pricing-alternative",
        permanent: true,
      },
      {
        source: "/guides/best-mailchimp-alternative-for-small-businesses",
        destination: "/mailchimp-alternative",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
