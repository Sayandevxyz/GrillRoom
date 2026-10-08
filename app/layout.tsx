import type { Metadata } from "next";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/newsreader/400.css";
import "@fontsource/newsreader/500.css";
import "@fontsource/newsreader/600.css";
import "@fontsource/newsreader/700.css";
import "@fontsource/newsreader/400-italic.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "GrillRoom | AI Investor Readiness Simulator",
  description:
    "Face an AI investor panel that challenges your numbers, flags weak claims, and prepares you for real fundraising conversations.",
  keywords: [
    "startup pitch",
    "pitch deck review",
    "venture capital",
    "investor simulator",
    "due diligence",
    "AI pitch practice",
  ],
  authors: [{ name: "GrillRoom Team" }],
  openGraph: {
    title: "GrillRoom | AI Investor Readiness Simulator",
    description:
      "Face an AI investor panel that challenges your numbers, flags weak claims, and prepares you for real fundraising conversations.",
    siteName: "GrillRoom",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "GrillRoom | AI Investor Readiness Simulator",
    description:
      "Face an AI investor panel that challenges your numbers, flags weak claims, and prepares you for real fundraising conversations.",
  },
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased selection:bg-orange-100 selection:text-cta font-sans">
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
