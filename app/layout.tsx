import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GrillRoom | AI Investor Panel Interrogation",
  description:
    "Pitch your startup to an adversarial panel of 4 distinct AI investors and a neutral Chair in the GrillRoom. Face rigorous claim extraction, live conviction meters, and unsparing debriefs.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background text-slate-100 min-h-screen antialiased selection:bg-orange-500/30 selection:text-orange-200">
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
