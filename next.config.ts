import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
};

module.exports = {
  api: {
    bodyParser: {
      sizeLimit: "1mb",
      // permette raw body per Stripe
      // Stripe gestisce la firma sull'intero payload
    },
  },
};

export default nextConfig;
