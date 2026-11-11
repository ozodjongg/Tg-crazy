import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // To'liq statik eksport: ilova faqat brauzerda ishlaydi, hech qanday serverimiz yo'q.
  // `out/` papkasini Tauri / Capacitor / PWA ichiga o'rash mumkin.
  output: "export",
  images: { unoptimized: true },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
