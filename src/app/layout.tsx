import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource/barlow-condensed/600.css";
import "@fontsource/barlow-condensed/700.css";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "Ahaan Basu Mojumdar | The Table Tennis Journal",
  description: "Ahaan's table tennis training journey: daily sessions, drill scores and progress toward the May 2027 tournament.",
};
export const viewport: Viewport = { themeColor: "#123c73", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <AuthProvider>
          <Header />
          <main className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">{children}</main>
          <footer className="mx-auto max-w-6xl px-4 pb-10 text-xs text-muted sm:px-6">
            The Table Tennis Journal · tintinopedia.com · Plan based on The Systematic Player by Bozhidar Hadzhistefanu
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
