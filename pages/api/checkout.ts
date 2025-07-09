// pages/api/checkout.ts
import { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

// Validazione variabili d'ambiente all'avvio
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY mancante nel file .env");
}
if (!process.env.STRIPE_PRICE_ID) {
  throw new Error("STRIPE_PRICE_ID mancante nel file .env");
}
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Supabase config mancante");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { userId } = req.body;


    if (!userId) {
      return res.status(400).json({ error: "ID utente mancante" });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .single();

    if (profileError || !profile?.email) {
      console.error("❌ Email non trovata per userId:", userId);
      return res.status(400).json({ error: "Email non trovata per l'utente" });
    }

    const email = profile.email;

    const customer = await stripe.customers.create({
  email,
  metadata: {
    supabase_id: userId,
  },
});

    // Verifica origine (opzionale ma consigliato)
    const origin = req.headers.origin;
    if (
      process.env.NODE_ENV === "production" &&
      origin &&
      !origin.replace("https://", "").startsWith(
        process.env.NEXT_PUBLIC_SITE_URL?.replace("https://", "") || ""
      )
    ) {
      return res.status(403).json({ error: "Origin non autorizzato" });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer: customer.id,
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      success_url: `${origin || req.headers.referer || "https://myuniagent.it"}/dashboard?success=true`,
      cancel_url: `${origin || req.headers.referer || "https://myuniagent.it"}/abbonati?canceled=true`,
      metadata: {
        supabase_id: userId,
        product: "MyUniAgent_Annual_Subscription",
      },
      billing_address_collection: "auto",
    });

    return res.status(200).json({ url: session.url });
  } catch (error: any) {
    console.error("Errore creazione sessione Stripe:", {
      error: error.message,
      type: error.type,
      code: error.code,
      timestamp: new Date().toISOString(),
    });

    if (error.type === "StripeCardError") {
      return res.status(402).json({ error: "Problema con la carta di credito" });
    } else if (error.type === "StripeRateLimitError") {
      return res.status(429).json({ error: "Troppe richieste, riprova tra poco" });
    } else if (error.type === "StripeInvalidRequestError") {
      return res.status(400).json({ error: "Richiesta non valida" });
    } else if (error.type === "StripeAPIError") {
      return res.status(500).json({ error: "Errore API Stripe" });
    } else if (error.type === "StripeConnectionError") {
      return res.status(500).json({ error: "Errore di connessione" });
    } else if (error.type === "StripeAuthenticationError") {
      return res.status(500).json({ error: "Errore autenticazione Stripe" });
    }

    return res.status(500).json({ error: "Errore interno del server" });
  }
}

