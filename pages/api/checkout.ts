// pages/api/checkout.ts
import { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";

// Validazione variabili d'ambiente all'avvio
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY mancante nel file .env');
}
if (!process.env.STRIPE_PRICE_ID) {
  throw new Error('STRIPE_PRICE_ID mancante nel file .env');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-05-28.basil", // ✅ Versione API corretta
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

    // Validazione formato email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Formato email non valido" });
    }

    // Verifica origine per sicurezza (opzionale ma consigliato)
    const origin = req.headers.origin;
    if (process.env.NODE_ENV === 'production' && !origin?.includes(process.env.NEXT_PUBLIC_SITE_URL || '')) {
      return res.status(403).json({ error: "Origin non autorizzato" });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: email,
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      success_url: `${origin || req.headers.referer || 'https://myuniagent.it'}/dashboard?success=true`,
      cancel_url: `${origin || req.headers.referer || 'https://myuniagent.it'}/abbonati?canceled=true`,
      // Metadati utili per il webhook
      metadata: {
        user_email: email,
        product: 'MyUniAgent_Annual_Subscription'
      },
      // Configurazioni aggiuntive per UX migliore
      billing_address_collection: 'auto',
      customer_creation: 'always',
    });

    return res.status(200).json({ url: session.url });
  } catch (error: any) {
    console.error("Errore creazione sessione Stripe:", {
      error: error.message,
      type: error.type,
      code: error.code,
      timestamp: new Date().toISOString()
    });

    // Gestione errori specifici Stripe
    if (error.type === 'StripeCardError') {
      return res.status(402).json({ error: "Problema con la carta di credito" });
    } else if (error.type === 'StripeRateLimitError') {
      return res.status(429).json({ error: "Troppo richieste, riprova tra poco" });
    } else if (error.type === 'StripeInvalidRequestError') {
      return res.status(400).json({ error: "Richiesta non valida" });
    } else if (error.type === 'StripeAPIError') {
      return res.status(500).json({ error: "Errore API Stripe" });
    } else if (error.type === 'StripeConnectionError') {
      return res.status(500).json({ error: "Errore di connessione" });
    } else if (error.type === 'StripeAuthenticationError') {
      return res.status(500).json({ error: "Errore autenticazione Stripe" });
    }

    return res.status(500).json({ error: "Errore interno del server" });
  }
}
