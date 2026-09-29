import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <nav className="border-b border-neutral-200 px-6 py-3 flex gap-6 text-sm">
          <a href="/" className="font-medium">Dashboard</a>
          <a href="/ingest" className="text-neutral-500">Ingest &amp; Score</a>
          <a href="/audit" className="text-neutral-500">Audit Log</a>
        </nav>
        {children}
      </body>
    </html>
  );
}
