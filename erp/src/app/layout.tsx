import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = {
  title: { default: "MUDANZAS METEPEC | ERP", template: "%s · MUDANZAS METEPEC | ERP" },
  description: "Sistema administrativo y operativo de Mudanzas Metepec",
  robots: { index: false, follow: false },
  icons: { icon: "/logo.jpeg" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#cf1f1f" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-MX" className={inter.variable}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
