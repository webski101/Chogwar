import type { Metadata } from "next";
import { Fraunces, Outfit, Geist_Mono } from "next/font/google";
import "./globals.css";

const heading = Fraunces({
  variable: "--font-heading",
  subsets: ["latin"],
});

const sans = Outfit({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://chogwarr.vercel.app"),
  title: "Chog Rivalry — Your NFT is the fighter",
  description:
    "Daily turn-based duels where your Chog Genesis traits decide the fight. Built for Chogathon 2026 on Monad.",
  openGraph: {
    title: "Chog Rivalry — Your NFT is the fighter",
    description:
      "Daily turn-based duels where your Chog Genesis traits decide the fight. Built for Chogathon 2026 on Monad.",
    url: "https://chogwarr.vercel.app",
    siteName: "Chog Rivalry",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Chog Rivalry — Your NFT is the fighter",
    description:
      "Daily turn-based duels where your Chog Genesis traits decide the fight.",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${heading.variable} ${sans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
