import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metodo non consentito" });
  }

  const token = req.headers.authorization?.replace("Bearer ", "");
if (!token) {
  return res.status(401).json({ error: "Token mancante" });
}

const { data: user, error } = await supabase.auth.getUser(token);
if (error || !user) {
  return res.status(401).json({ error: "Utente non autenticato" });
}


  const { testo } = req.body;
  if (!testo || typeof testo !== "string") {
    return res.status(400).json({ error: "Testo mancante o non valido" });
  }

  if (testo.length > 10000) {
    return res.status(400).json({ error: "Testo troppo lungo (max 10.000 caratteri)" });
  }

  const prompt = `
Sei MyUniAgent, un assistente AI accademico di nuova generazione, esperto nella comprensione e sintesi di testi scolastici e universitari.

Il tuo compito è riassumere il testo fornito in modo **chiaro, preciso, completo e dettagliato**, mantenendo uno **stile universitario e un linguaggio professionale.**

Assicurati di:
- Mantenere la **coerenza logica** del testo originale.
- Includere tutti i **concetti chiave, le argomentazioni principali e i dettagli rilevanti** necessari per una comprensione approfondita del testo. Non tralasciare informazioni importanti.
- Utilizzare uno **stile accademico, preciso e professionale**, adatto a un contesto universitario. Il linguaggio deve essere formale e ben strutturato.
- Strutturare il riassunto in **paragrafi logici**, se necessario, per migliorare la leggibilità e l'organizzazione delle idee.
- Non inventare contenuti o fare deduzioni che non siano esplicitamente supportate dal testo originale.
- Se il testo contiene termini tecnici specifici, assicurati che siano usati correttamente nel contesto del riassunto.

Ora, leggi attentamente il seguente testo e fornisci un riassunto **accurato, completo, dettagliato e accademico**:

"""
${testo}
"""
  `;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", 
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3, 
    });

    const riassunto = completion.choices[0]?.message?.content?.trim();

    if (!riassunto) {
      throw new Error("Risposta vuota da OpenAI");
    }

    return res.status(200).json({ riassunto });
  } catch (err: any) {
    console.error("Errore API GPT:", err);
    return res.status(500).json({ error: "Errore durante la generazione del riassunto" });
  }
}


