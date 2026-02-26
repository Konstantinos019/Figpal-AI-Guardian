import type { Metadata, Viewport } from "next";
import { SpeedInsights } from '@vercel/speed-insights/next';
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "DS AI Guardian",
  description: "Design System drift detector — Figma ↔ Code comparison agent2",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
