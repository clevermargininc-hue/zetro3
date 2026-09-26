import type { Metadata } from "next";
import { Outfit, Syne, Unbounded } from "next/font/google";
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

const unbounded = Unbounded({
  variable: "--font-unbounded",
  subsets: ["latin"],
  weight: ["700"],
});

export const metadata: Metadata = {
  title: "Zetro — Score calls against your scorecard",
  description:
    "Zetro scores contact-center calls against the scorecard you already use. English, Kiswahili, or both — with notes coaches can take to the huddle.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${outfit.variable} ${syne.variable} ${unbounded.variable} h-full antialiased`}>
      <body className="min-h-full bg-white font-sans text-ink antialiased">{children}</body>
    </html>
  );
}
