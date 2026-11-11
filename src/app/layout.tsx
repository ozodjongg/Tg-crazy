import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tg-crazy",
  description: "O'zbekiston uchun kuchaytirilgan norasmiy Telegram klienti",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#18181b" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="uz" className="h-full antialiased">
      <body className="h-full">{children}</body>
    </html>
  );
}
