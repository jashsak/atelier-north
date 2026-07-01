import type { Metadata } from "next";
import { Gilda_Display, Inter } from "next/font/google";
import "./globals.css";

const gilda = Gilda_Display({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Material Evidence — Atelier North",
  description: "A trustworthy second opinion for specifying upholstery textiles.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${gilda.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
