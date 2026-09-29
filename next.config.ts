import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse (via pdfjs-dist) tries to set up a worker file at runtime,
  // which breaks when Next bundles it into the server chunk. Requiring it
  // natively via Node instead avoids that.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
};

export default nextConfig;
