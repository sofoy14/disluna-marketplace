import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CartProvider } from "@/context/CartContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "DISLUNA - Tu distribuidor de confianza",
  description: "Distribuidor de bebidas en Ibagué. Coca-Cola, Brisa, Powerade, Sprite y más. Entrega el mismo día.",
  keywords: ["distribuidor", "bebidas", "Ibagué", "Coca-Cola", "Brisa", "Powerade", "Sprite", "Postobón"],
  authors: [{ name: "DISLUNA" }],
  openGraph: {
    title: "DISLUNA - Tu distribuidor de confianza",
    description: "Distribuidor de bebidas en Ibagué. Coca-Cola, Brisa, Powerade, Sprite y más. Entrega el mismo día.",
    url: "https://www.disluna.store",
    siteName: "DISLUNA",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "DISLUNA - Distribuidor de bebidas",
      },
    ],
    locale: "es_CO",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DISLUNA - Tu distribuidor de confianza",
    description: "Distribuidor de bebidas en Ibagué. Entrega el mismo día.",
    images: ["/logo.png"],
  },
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <CartProvider>
          <Header />
          <main className="min-h-screen">
            {children}
          </main>
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}
