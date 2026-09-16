import type { Metadata } from "next";
import { Outfit, Syne } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Zetro — Contact center quality intelligence",
  description:
    "Enterprise call QA for bilingual contact centers. Transcribe, diarize, and audit agent performance in Kiswahili and English.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${outfit.variable} ${syne.variable} h-full antialiased`}>
      <body className="min-h-full bg-white font-sans text-ink antialiased">{children}</body>
    </html>
  );
}
