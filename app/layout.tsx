import type { Metadata } from "next";
import {
  Geist,
  Geist_Mono,
} from "next/font/google";

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
    default:
      "HiddenAlpha — Trading Intelligence & Execution Desk",
    template:
      "%s | HiddenAlpha",
  },

  description:
    "Real-time trading intelligence, market context, signals, risk analysis and execution workflows.",

  applicationName:
    "HiddenAlpha",

  keywords: [
    "HiddenAlpha",
    "Trading Intelligence",
    "Trading Signals",
    "Market Intelligence",
    "Risk Management",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}