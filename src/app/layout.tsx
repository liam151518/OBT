import type { Metadata } from "next";
import { Inter, Libre_Baskerville } from "next/font/google";
import { ConvexClientProvider } from "@/components/convex-provider";
import { SiteShell } from "@/components/site/site-shell";
import "./globals.css";

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const display = Libre_Baskerville({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: {
    default: "One Body Temple",
    template: "%s — One Body Temple",
  },
  description:
    "Premium apparel for people who believe the body is a gift: not to be neglected, not to be worshipped, but to be stewarded.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable} h-full antialiased`}>
      <body className="min-h-full bg-white font-sans text-ink">
        <ConvexClientProvider>
          <SiteShell>{children}</SiteShell>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
