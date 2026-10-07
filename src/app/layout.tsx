import type { Metadata } from "next";
import { Outfit, Syne, Unbounded } from "next/font/google";
import { config } from "@fortawesome/fontawesome-svg-core";
import "@fortawesome/fontawesome-svg-core/styles.css";
import "./globals.css";

config.autoAddCss = false;

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
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className={`${outfit.variable} ${syne.variable} ${unbounded.variable} h-full antialiased`}>
      <body suppressHydrationWarning className="min-h-full font-sans text-ink antialiased">{children}</body>
    </html>
  );
}
