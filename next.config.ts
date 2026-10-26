import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Cloudflare Pages serves the static export from `out`. Local development and
  // the existing Playwright production-server checks keep the normal Next.js
  // server unless the Pages build explicitly enables this mode.
  ...(process.env.CLOUDFLARE_PAGES_BUILD === "1"
    ? { output: "export", images: { unoptimized: true } }
    : {}),
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
