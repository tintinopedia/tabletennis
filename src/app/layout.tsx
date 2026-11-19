import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource/barlow-condensed/600.css";
import "@fontsource/barlow-condensed/700.css";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { DataProvider } from "@/components/DataProvider";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "Tintin | My Table Tennis Journal",
  description: "Tintin's table tennis journal: daily sessions, drill scores, heart-rate trends and training videos.",
};
export const viewport: Viewport = { themeColor: "#080d17", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <AuthProvider>
          <DataProvider>
            <Header />
            <main className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">{children}</main>
            <footer className="mx-auto max-w-6xl px-4 pb-10 text-xs text-muted sm:px-6">
              © 2026 Tintin · My Table Tennis Journal. All rights reserved.
            </footer>
          </DataProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
