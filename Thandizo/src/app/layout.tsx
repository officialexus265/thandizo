import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import Providers from "@/components/Providers";
import DonationToaster from "@/components/DonationToaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://thandizo-ten.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "thandizo – Fund Projects That Matter",
    template: "%s | thandizo",
  },
  description: "Transparent project funding platform. Support community projects with full transparency.",
  openGraph: {
    title: "thandizo – Fund Projects That Matter",
    description: "Transparent project funding platform. Support community projects with full transparency.",
    siteName: "thandizo",
    url: siteUrl,
    type: "website",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "thandizo" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "thandizo – Fund Projects That Matter",
    description: "Transparent project funding platform. Support community projects with full transparency.",
    images: ["/og-image.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-stone-100 text-stone-900">
        <Providers>
          {children}
          <Toaster position="top-center" richColors closeButton />
          <DonationToaster />
        </Providers>
      </body>
    </html>
  );
}
