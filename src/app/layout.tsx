import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource/barlow-condensed/600.css";
import "@fontsource/barlow-condensed/700.css";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { DataProvider } from "@/components/DataProvider";
import { Header } from "@/components/Header";
import { RegisterSW } from "@/components/RegisterSW";
import { SponsorBadge } from "@/components/sponsor/SponsorBadge";

export const metadata: Metadata = {
  title: "Tintin | My Table Tennis Journal",
  description: "Tintin's table tennis journal: daily sessions, drill scores, heart-rate trends and training videos.",
  applicationName: "Tintinopedia",
  appleWebApp: { capable: true, title: "Tintinopedia", statusBarStyle: "black-translucent" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
};
export const viewport: Viewport = { themeColor: "#080d17", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <RegisterSW />
        <AuthProvider>
          <DataProvider>
            <Header />
            <SponsorBadge />
            <main className="mx-auto max-w-6xl px-4 pb-[calc(110px+env(safe-area-inset-bottom))] sm:px-6 md:pb-20">{children}</main>
            <footer className="fixed inset-x-0 bottom-[calc(59px+env(safe-area-inset-bottom))] z-30 border-t border-line bg-paper/90 py-1 text-center text-[10px] text-muted backdrop-blur md:bottom-0 md:py-2 md:text-xs">
              © 2026 Tintin · My Table Tennis Journal. All rights reserved.
            </footer>
          </DataProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
