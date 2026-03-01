import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/app/components/ui/sonner";
import { Header } from "@/app/components/layout/Header";
import { Footer } from "@/app/components/layout/Footer";
import { StoreProvider } from "@/app/lib/store/StoreProvider";
import { getSession } from "@/app/lib/utils/session";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Pikes Calendar - Modern Event Management",
    template: "%s | Pikes Calendar",
  },
  description:
    "Stay organized with Pikes Calendar - a modern, intuitive calendar application for managing events, schedules, and appointments. Create, edit, and track your events effortlessly.",
  keywords: [
    "calendar",
    "event management",
    "schedule",
    "appointments",
    "planning",
    "organization",
    "productivity",
    "Pikes",
  ],
  authors: [{ name: "Pikes Calendar Team" }],
  creator: "Pikes Calendar",
  publisher: "Pikes Calendar",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "Pikes Calendar",
    title: "Pikes Calendar - Modern Event Management",
    description:
      "Stay organized with Pikes Calendar - a modern, intuitive calendar application for managing events and schedules.",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "Pikes Calendar",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Pikes Calendar - Modern Event Management",
    description:
      "Stay organized with Pikes Calendar - a modern, intuitive calendar application.",
    images: ["/og-image.svg"],
    creator: "@pikescalendar",
  },
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-touch-icon.svg", type: "image/svg+xml" }],
  },
  manifest: "/manifest.json",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const savedTheme = localStorage.getItem('theme');
                const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                const theme = savedTheme || systemTheme;
                if (theme === 'dark') {
                  document.documentElement.classList.add('dark');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen`}
      >
        <StoreProvider>
          <Header session={session} />
          <main className="flex-1">{children}</main>
          <Footer />
          <Toaster position="top-right" richColors closeButton />
        </StoreProvider>
      </body>
    </html>
  );
}
