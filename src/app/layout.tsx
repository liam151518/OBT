import type { Metadata } from "next";
import { LoadingScreen } from "@/components/landing/loading-screen";
import "./globals.css";

export const metadata: Metadata = {
  title: "One Body Temple",
  description: "Built for his glory.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-black text-white">
        <LoadingScreen />
        {children}
      </body>
    </html>
  );
}
