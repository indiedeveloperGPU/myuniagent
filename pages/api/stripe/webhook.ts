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
  apiVersion: "2025-05-28.basil",
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
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
    console.error("❌ Errore firma webhook:", err);
    return res.status(400).send(`Webhook Error: ${err}`);
  }

  console.log("📩 Evento ricevuto da Stripe:", event.type);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    console.log("✅ Sessione completata:", {
      id: session.id,
      email: session.customer_email,
      amount_total: session.amount_total,
    });

    if (session.customer_email) {
      const scadenza = new Date();
      scadenza.setFullYear(scadenza.getFullYear() + 1);

      const { error } = await supabase
        .from("profiles")
        .update({
          abbonamento_attivo: true,
          abbonamento_scadenza: scadenza.toISOString(),
        })
        .eq("email", session.customer_email);

      if (error) {
        console.error("❌ Errore aggiornamento profilo Supabase:", error);
        return res.status(500).send("Errore aggiornamento database");
      }

      console.log("🎉 Abbonamento attivato con successo per:", session.customer_email);
    }
  }

  res.status(200).json({ received: true });
}
