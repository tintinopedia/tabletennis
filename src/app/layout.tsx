import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource/barlow-condensed/600.css";
import "@fontsource/barlow-condensed/700.css";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { DataProvider } from "@/components/DataProvider";
import { Header } from "@/components/Header";
import { RegisterSW } from "@/components/RegisterSW";

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
            <main className="mx-auto max-w-6xl px-4 pb-10 sm:px-6 md:pb-16">{children}</main>
            <footer className="mx-auto max-w-6xl px-4 pb-[calc(88px+env(safe-area-inset-bottom))] text-xs text-muted sm:px-6 md:pb-10">
              © 2026 Tintin · My Table Tennis Journal. All rights reserved.
            </footer>
          </DataProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
