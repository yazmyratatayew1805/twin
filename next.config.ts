import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // В C:\laragon\www лежит чужой package-lock.json — фиксируем корень проекта.
  turbopack: { root: __dirname },
};

export default nextConfig;
