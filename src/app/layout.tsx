import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import { Toaster } from "sonner";
import { AnalyticsScripts } from "@/components/analytics/analytics-scripts";
import "./globals.css";
import { publicOrigin } from "@/lib/utils";
import { PLANS } from "@/lib/plans";

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const googleVerification = process.env.GOOGLE_SITE_VERIFICATION?.trim();
const bingVerification = process.env.BING_SITE_VERIFICATION?.trim();

export const metadata: Metadata = {
  metadataBase: new URL(publicOrigin()),
  title: {
    default: "Sendfable — Simple Email Marketing for Small Businesses",
    template: "%s · Sendfable",
  },
  description: `Simple email marketing for small businesses. Start free with ${PLANS.FREE.contactCap} contacts — no credit card required.`,
  applicationName: "Sendfable",
  manifest: "/manifest.webmanifest",
  verification: {
    ...(googleVerification ? { google: googleVerification } : {}),
    ...(bingVerification
      ? { other: { "msvalidate.01": bingVerification } }
      : {}),
  },
  openGraph: {
    type: "website",
    siteName: "Sendfable",
    title: "Sendfable — Simple Email Marketing for Small Businesses",
    description: `Create and send email campaigns without the complexity. Free plan includes ${PLANS.FREE.contactCap} contacts — no credit card.`,
    images: [
      {
        url: "/brand/sendfable-social-card.jpg",
        width: 1200,
        height: 630,
        alt: "SendFable — Simple email marketing for small businesses. Start free.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sendfable — Simple Email Marketing for Small Businesses",
    description: `Simple email marketing for small businesses. Start free — ${PLANS.FREE.contactCap} contacts, no credit card.`,
    images: ["/brand/sendfable-social-card.jpg"],
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-icon.png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#17213B",
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable}`}>
      <body className="min-h-screen font-sans">
        {children}
        <AnalyticsScripts />
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
