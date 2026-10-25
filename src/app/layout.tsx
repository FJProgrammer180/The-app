import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Toaster } from "sonner";

import { SITE_URL } from "@/lib/env";
import { getSiteSettings } from "@/lib/settings";

import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const name = settings.brand.name;
  const tagline = settings.brand.tagline || "Personal portfolio and blog";

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: `${name} — ${tagline}`,
      template: `%s — ${name}`,
    },
    description: settings.home.intro || tagline,
    applicationName: name,
    openGraph: {
      type: "website",
      siteName: name,
      title: `${name} — ${tagline}`,
      description: settings.home.intro,
      url: SITE_URL,
    },
    twitter: { card: "summary_large_image" },
    robots: { index: true, follow: true },
  };
}

export const viewport: Viewport = {
  themeColor: "#080A0F",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} dark`}>
      <body className="min-h-dvh bg-background font-sans antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-background"
        >
          Skip to content
        </a>
        {children}
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#0e131b",
              border: "1px solid #29323f",
              color: "#eef2f8",
            },
          }}
        />
      </body>
    </html>
  );
}
