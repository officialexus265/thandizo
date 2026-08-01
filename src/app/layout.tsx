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

export const metadata: Metadata = {
  title: {
    default: "thandizo – Fund Projects That Matter",
    template: "%s | thandizo",
  },
  description: "Transparent project funding platform. Support community projects with full transparency.",
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
