// pages/api/checkout.ts
import { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-05-28.basil", // usa versione stabile
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email obbligatoria" });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: email,
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID!,
          quantity: 1,
        },
      ],
      success_url: `${req.headers.origin}/dashboard?success=true`,
      cancel_url: `${req.headers.origin}/abbonati?canceled=true`,
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error("Errore creazione sessione:", error);
    return res.status(500).json({ error: "Errore Stripe" });
  }
}
