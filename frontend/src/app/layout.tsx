import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "NexBank — Concurrent Banking System",
  description: "A high-performance real-time banking transaction engine with optimistic concurrency control.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full`} style={{ background: '#030712' }}>
      <body className="min-h-full flex flex-col antialiased" style={{ background: '#030712', color: 'white' }}>{children}</body>
    </html>
  );
}
