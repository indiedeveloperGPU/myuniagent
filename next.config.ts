import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  api: {
    bodyParser: false, // serve per Stripe Webhook, non per checkout
  },
};

export default nextConfig;
