import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Zetro — Contact center quality intelligence",
  description:
    "Enterprise call QA for bilingual contact centers. Transcribe, diarize, and audit agent performance in Kiswahili and English.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full bg-white font-sans text-ink antialiased">{children}</body>
    </html>
  );
}
