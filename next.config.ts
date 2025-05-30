/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  api: {
    bodyParser: {
      sizeLimit: "1mb", // (facoltativo, utile per payload Stripe)
    },
    externalResolver: true, // consigliato quando usi `micro` per il raw body
  },
};

module.exports = nextConfig;
