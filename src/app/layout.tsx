import type { Metadata } from "next";
import { Inter, Outfit, Space_Grotesk, Syne, Unbounded } from "next/font/google";
import "./globals.css";
import "./simple-app.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  display: "swap",
});

const unbounded = Unbounded({
  variable: "--font-unbounded",
  subsets: ["latin"],
  weight: ["700"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Zetro — Score calls against your scorecard",
  description:
    "Zetro scores contact-center calls against the scorecard you already use. English, Kiswahili, or both — with notes coaches can take to the huddle.",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.png", type: "image/png", sizes: "64x64" },
      { url: "/zetro-mark.png", type: "image/png", sizes: "192x192" },
    ],
    shortcut: "/favicon.png",
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${outfit.variable} ${syne.variable} ${unbounded.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-white font-sans text-ink antialiased">{children}</body>
    </html>
  );
}
