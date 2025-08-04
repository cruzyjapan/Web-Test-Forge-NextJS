import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from './providers'
import { GlobalHeader } from '@/components/layouts/GlobalHeader'
import { GlobalFooter } from '@/components/layouts/GlobalFooter'
import { ScrollToTop } from '@/components/ui/scroll-to-top'

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Web Test Forge for Next.js",
  description: "Next.js専用Playwright自動テストツール",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <Providers>
          <div className="flex flex-col min-h-screen">
            <GlobalHeader />
            <main className="flex-1 bg-gray-50">
              {children}
            </main>
            <GlobalFooter />
            <ScrollToTop />
          </div>
        </Providers>
      </body>
    </html>
  );
}
