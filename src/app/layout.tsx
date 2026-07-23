import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { appUrl, publicOrigin } from "@/lib/utils";

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

export const metadata: Metadata = {
  metadataBase: new URL(publicOrigin()),
  title: {
    default: "Sendfable — Simple Email Marketing for Small Businesses",
    template: "%s · Sendfable",
  },
  description:
    "Create beautiful emails, manage your audience and understand every campaign with a simpler email-marketing platform built for small businesses.",
  applicationName: "Sendfable",
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    siteName: "Sendfable",
    title: "Sendfable — Simple Email Marketing for Small Businesses",
    description:
      "Create beautiful emails, manage your audience and understand every campaign with a simpler email-marketing platform built for small businesses.",
    images: [{ url: "/brand/sendfable-social-card.svg", width: 1200, height: 630, alt: "sendfable" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sendfable — Simple Email Marketing for Small Businesses",
    description: "Every email tells your story.",
    images: ["/brand/sendfable-social-card.svg"],
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-icon.png" }],
  },
  alternates: {
    canonical: appUrl("/"),
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
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
