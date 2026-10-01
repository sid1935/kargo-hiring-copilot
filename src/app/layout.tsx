import type { Metadata } from "next";
import { Big_Shoulders, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const display = Big_Shoulders({
  variable: "--font-display",
  weight: ["600", "700", "800"],
  subsets: ["latin"],
});

const body = IBM_Plex_Sans({
  variable: "--font-body",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-mono",
  weight: ["400", "500"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kargo Hiring Copilot",
  description: "The system recommends. Arjun decides.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-bg text-ink">
        <nav className="border-b border-line px-6 py-3 flex gap-6 text-sm">
          <a href="/" className="font-medium text-ink hover:text-accent transition-colors">
            Dashboard
          </a>
          <a href="/ingest" className="text-ink-soft hover:text-accent transition-colors">
            Ingest &amp; Score
          </a>
          <a href="/audit" className="text-ink-soft hover:text-accent transition-colors">
            Audit Log
          </a>
        </nav>
        {children}
      </body>
    </html>
  );
}
