import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Inter } from "next/font/google";
import "../shared/styles/globals.css";
import { ThemeProvider } from "../components/theme-provider";
import { Header } from "../components/header";
import { ScrollToTopButton } from "../components/scroll-to-top";
import { AuthProvider } from "../components/auth/auth-context";
import { SocketProvider } from "../components/providers/socket-provider";
import { AuthModal } from "../components/auth/auth-modal";
import { RestModeOverlay } from "../components/rest-mode-overlay";
import { ConfirmProvider } from "../hooks/use-confirm";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

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
    icon: "/ios/iTunesArtwork@1x.png",
    shortcut: "/ios/iTunesArtwork@1x.png",
    apple: "/ios/iTunesArtwork@1x.png",
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
    <html lang="en" className={`${jakarta.variable} ${inter.variable}`} data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/ios/iTunesArtwork@1x.png" />
        <link rel="apple-touch-icon" href="/ios/iTunesArtwork@1x.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased font-sans" suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <AuthProvider>
            <SocketProvider>
              <ConfirmProvider>
                <main>{children}</main>
                <ScrollToTopButton />
                <AuthModal />
                <RestModeOverlay />
              </ConfirmProvider>
            </SocketProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
