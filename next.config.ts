import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // pdfkit loads its standard-font metrics from files relative to its own package directory at
  // runtime; keeping it external (unbundled) so those file reads resolve normally instead of
  // being rewritten by webpack.
  serverExternalPackages: ["pdfkit"],
};

export default nextConfig;
