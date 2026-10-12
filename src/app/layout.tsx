import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";

export const metadata: Metadata = {
  title: { default: "Houston Civic Action", template: "%s · Houston Civic Action" },
  description:
    "One front door for cleanups, tree plantings and neighborhood projects across Houston, reviewed and approved by Keep Houston Beautiful.",
};

export const viewport: Viewport = {
  themeColor: "#1f6f4a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-full flex flex-col">
        <Nav />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-line mt-16">
          <div className="mx-auto max-w-5xl px-4 py-6 text-xs text-ink-soft flex flex-wrap gap-x-6 gap-y-2">
            <span>Prototype built for the UH Coogs for Energy Hackathon, Fall 2026 (Team UHnder Pressure).</span>
            <span>Sample data is synthetic. Not an official Keep Houston Beautiful or City of Houston site.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
