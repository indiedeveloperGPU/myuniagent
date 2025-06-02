import { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import { buffer } from "micro";
import { createClient } from "@supabase/supabase-js";

// Configurazione per disabilitare il body parser di Next.js
export const config = {
  api: {
    bodyParser: false,
  },
};

// Validazione variabili d'ambiente all'avvio
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY mancante nel file .env');
}
if (!process.env.STRIPE_WEBHOOK_SECRET) {
  throw new Error('STRIPE_WEBHOOK_SECRET mancante nel file .env');
}
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL mancante nel file .env');
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY mancante nel file .env');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {});


const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  let event: Stripe.Event;

  try {
    const buf = await buffer(req);
    const sig = req.headers["stripe-signature"] as string;

    if (!sig) {
      console.error("❌ Firma webhook mancante");
      return res.status(400).json({ error: "Firma webhook mancante" });
    }

    // Costruzione e verifica dell'evento webhook
    event = stripe.webhooks.constructEvent(buf.toString(), sig, endpointSecret);
  } catch (err: any) {
    console.error("❌ Errore verifica firma webhook:", {
      error: err.message,
      timestamp: new Date().toISOString()
    });
    return res.status(400).json({ error: "Firma webhook non valida" });
  }

  console.log("📩 Evento ricevuto da Stripe:", {
    type: event.type,
    id: event.id,
    timestamp: new Date().toISOString()
  });

  try {
    // Gestione eventi Stripe
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case "customer.subscription.created":
        console.log("🆕 Nuova subscription creata:", event.data.object.id);
        break;

      case "customer.subscription.updated":
        console.log("🔄 Subscription aggiornata:", event.data.object.id);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case "invoice.payment_succeeded":
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`📝 Evento non gestito: ${event.type}`);
    }

    return res.status(200).json({ received: true });
  } catch (error: any) {
    console.error("❌ Errore gestione webhook:", {
      eventType: event.type,
      eventId: event.id,
      error: error.message,
      timestamp: new Date().toISOString()
    });
    return res.status(500).json({ error: "Errore interno" });
  }
}

// Gestione checkout completato
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log("✅ Sessione checkout completata:", {
    id: session.id,
    email: session.customer_email,
    amount_total: session.amount_total,
    currency: session.currency,
    subscription: session.subscription
  });

  if (!session.customer_email) {
    console.warn("⚠️ Email cliente non trovata nella sessione");
    return;
  }

  // Calcola scadenza abbonamento (1 anno)
  const scadenza = new Date();
  scadenza.setFullYear(scadenza.getFullYear() + 1);

  // Aggiorna profilo utente su Supabase
  const { error } = await supabase
    .from("profiles")
    .update({
      abbonamento_attivo: true,
      abbonamento_scadenza: scadenza.toISOString(),
      stripe_customer_id: session.customer,
      stripe_subscription_id: session.subscription,
      ultimo_pagamento: new Date().toISOString()
    })
    .eq("email", session.customer_email);

  if (error) {
    console.error("❌ Errore aggiornamento profilo Supabase:", error);
    throw new Error("Errore aggiornamento database");
  }

  console.log("🎉 Abbonamento attivato con successo per:", session.customer_email);
}

// Gestione subscription cancellata
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log("❌ Subscription cancellata:", subscription.id);

  if (!subscription.customer) return;

  // Recupera customer per ottenere email
  const customer = await stripe.customers.retrieve(subscription.customer as string);
  
  if (customer.deleted || !('email' in customer) || !customer.email) {
    console.warn("⚠️ Customer o email non trovata");
    return;
  }

  // Disattiva abbonamento su Supabase
  const { error } = await supabase
    .from("profiles")
    .update({
      abbonamento_attivo: false,
      abbonamento_scadenza: new Date().toISOString() // Scadenza immediata
    })
    .eq("email", customer.email);

  if (error) {
    console.error("❌ Errore disattivazione abbonamento:", error);
    throw new Error("Errore aggiornamento database");
  }

  console.log("🔴 Abbonamento disattivato per:", customer.email);
}

// Gestione pagamento riuscito (rinnovi)
async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
const subscriptionId = (invoice as Stripe.Invoice & { subscription: string }).subscription;
if (!subscriptionId) return;


  console.log("💰 Pagamento riuscito per subscription:", subscriptionId);

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const customer = await stripe.customers.retrieve(subscription.customer as string);

  if (customer.deleted || !('email' in customer) || !customer.email) {
    console.warn("⚠️ Customer o email non trovata");
    return;
  }

  // Estendi abbonamento per un altro anno
  const scadenza = new Date();
  scadenza.setFullYear(scadenza.getFullYear() + 1);

  const { error } = await supabase
    .from("profiles")
    .update({
      abbonamento_attivo: true,
      abbonamento_scadenza: scadenza.toISOString(),
      ultimo_pagamento: new Date().toISOString()
    })
    .eq("email", customer.email);

  if (error) {
    console.error("❌ Errore rinnovo abbonamento:", error);
    throw new Error("Errore aggiornamento database");
  }

  console.log("🔄 Abbonamento rinnovato per:", customer.email);
}

// Gestione pagamento fallito
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  console.log("💳 Pagamento fallito per invoice:", invoice.id);
  
  // Qui potresti implementare logica per:
  // - Inviare email di notifica all'utente
  // - Sospendere l'abbonamento dopo X tentativi falliti
  // - Log per monitoraggio
  
  console.warn("⚠️ Notifica pagamento fallito - implementare azioni necessarie");
}
