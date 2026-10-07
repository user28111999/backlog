import type { NextConfig } from "next";
const config: NextConfig = {
  compiler: { styledComponents: true },
  experimental: { cpus: 2 },
};
export default config;
