import { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import { buffer } from "micro";
import { createClient } from "@supabase/supabase-js";

export const config = {
  api: {
    bodyParser: false,
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-05-28.basil", // o la tua versione
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // usa una chiave server-side con accesso update
);

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");

  const buf = await buffer(req);
  const sig = req.headers["stripe-signature"] as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(buf.toString(), sig, endpointSecret);
  } catch (err) {
    console.error("Errore firma webhook:", err);
    return res.status(400).send(`Webhook Error: ${err}`);
  }

  // Gestione evento
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const customerEmail = session.customer_email;

    if (customerEmail) {
      const scadenza = new Date();
      scadenza.setFullYear(scadenza.getFullYear() + 1);

      const { error } = await supabase
        .from("profiles")
        .update({
          abbonamento_attivo: true,
          abbonamento_scadenza: scadenza.toISOString(),
        })
        .eq("email", customerEmail);

      if (error) {
        console.error("Errore aggiornamento Supabase:", error);
        return res.status(500).send("Errore aggiornamento database");
      }
    }
  }

  res.status(200).json({ received: true });
}
