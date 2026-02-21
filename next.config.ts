import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Transpile plotly.js and react-plotly.js for ESM compatibility
  transpilePackages: ["react-plotly.js", "plotly.js"],
  // Empty turbopack config silences the webpack-vs-turbopack warning
  turbopack: {},
};

export default nextConfig;
