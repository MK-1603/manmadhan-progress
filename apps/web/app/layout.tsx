import type { Metadata, Viewport } from "next";
import { Inter, Geist } from "next/font/google";
import "../shared/styles/globals.css";
import { ThemeProvider } from "../components/theme-provider";
import { Header } from "../components/header";
import { ScrollToTopButton } from "../components/scroll-to-top";
import { AuthProvider } from "../components/auth/auth-context";
import { SocketProvider } from "../components/providers/socket-provider";
import { AuthModal } from "../components/auth/auth-modal";
import { RestModeOverlay } from "../components/rest-mode-overlay";
import { ConfirmProvider } from "../hooks/use-confirm";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});

import { OfflineProvider } from "../components/providers/offline-provider";

export const metadata: Metadata = {
  title: "ManMadhan Progress",
  description: "Plan Better. Focus Deeper. Achieve Greater.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ManMadhan Progress",
  },
  icons: {
    icon: "https://res.cloudinary.com/fmiadecb/image/upload/v1786817328/ic_launcher-web_bq8zjj.png",
    shortcut: "https://res.cloudinary.com/fmiadecb/image/upload/v1786817328/ic_launcher-web_bq8zjj.png",
    apple: "https://res.cloudinary.com/fmiadecb/image/upload/v1786817328/ic_launcher-web_bq8zjj.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#07090E",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${geist.variable}`} data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="https://res.cloudinary.com/fmiadecb/image/upload/v1786817328/ic_launcher-web_bq8zjj.png" />
        <link rel="apple-touch-icon" href="https://res.cloudinary.com/fmiadecb/image/upload/v1786817328/ic_launcher-web_bq8zjj.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="min-h-screen w-full bg-[#0B0E12] dark:bg-[#0B0E12] text-foreground antialiased font-sans overflow-x-hidden" suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
          <AuthProvider>
            <SocketProvider>
              <OfflineProvider>
                <ConfirmProvider>
                  <div className="min-h-screen w-full overflow-x-hidden bg-[#0B0E12]">{children}</div>
                  <ScrollToTopButton />
                  <AuthModal />
                  <RestModeOverlay />
                </ConfirmProvider>
              </OfflineProvider>
            </SocketProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
