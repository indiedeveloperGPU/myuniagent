import type { NextApiRequest, NextApiResponse } from "next";
import { OpenAI } from "openai";
import { createClient } from "@supabase/supabase-js";


// 1. Configurazione del client per puntare a Together.ai
// Assicurati che la variabile d'ambiente TOGETHER_API_KEY sia impostata.
const openai = new OpenAI({
  apiKey: process.env.TOGETHER_API_KEY!,
  baseURL: "https://api.groq.com/openai/v1",
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const modelloMappa = "meta-llama/llama-4-maverick-17b-128e-instruct";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metodo non consentito" });
  }

  // 1. Autenticazione Utente tramite token
const token = req.headers.authorization?.replace("Bearer ", "");
if (!token) {
  return res.status(401).json({ error: "Token di autorizzazione mancante" });
}

const { data: { user }, error: authError } = await supabase.auth.getUser(token);

if (authError || !user) {
  return res.status(401).json({ error: "Utente non autenticato o token non valido" });
}

// 2. Controllo Origine (CORS)
const origin = req.headers.origin || "";
const dominiAutorizzati = [
    "https://myuniagent.it", 
    "http://localhost:3000"
    // Aggiungi qui altri domini se necessario, es. per lo staging
];

if (!dominiAutorizzati.includes(origin)) {
  return res.status(403).json({ error: "Accesso non consentito da questa origine." });
}

  const { argomento } = req.body;
  if (!argomento || typeof argomento !== 'string') {
    return res.status(400).json({ errore: "Argomento mancante o non valido" });
  }

  // 3. Prompt ottimizzato per generare nodi di una mappa concettuale
  const prompt = `Genera una lista di 5-8 concetti chiave essenziali per creare una mappa concettuale sull'argomento: "${argomento}".
I concetti devono essere brevi, diretti e idealmente collegati logicamente tra loro.
Rispondi SOLO con un elenco. Non aggiungere introduzioni, spiegazioni o testo superfluo.

Esempio di output desiderato per "Cambiamento Climatico":
- Gas serra
- Riscaldamento globale
- Scioglimento dei ghiacciai
- Innalzamento del livello del mare
- Eventi meteorologici estremi
- Energie rinnovabili
`;

  try {
    const completion = await openai.chat.completions.create({
      model: modelloMappa,
      messages: [
        {
          role: "system",
          content: "Sei un esperto accademico specializzato nel sintetizzare argomenti complessi in concetti chiave per mappe mentali e concettuali. Fornisci solo la lista richiesta.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.5,
      max_tokens: 500,
    });

    const testoRisposta = completion.choices?.[0]?.message?.content || "";
    
    // 4. Logica di parsing robusta, adattata dal tuo esempio, per estrarre i nodi
    const nodiGenerati = testoRisposta
      .split(/\n|\r|\r\n|•|-|\*/g) // Divide per "a capo" o simboli di lista comuni
      .map((riga: string) => riga.replace(/^[\d\.]*\s*/, "").trim()) // Rimuove numeri/punti iniziali e spazi bianchi
      .filter((riga: string) => riga.length > 2); // Filtra righe vuote o irrilevanti

    // Controllo di sicurezza: se il parsing fallisce, logga l'output per il debug
    if (nodiGenerati.length === 0 && testoRisposta.length > 0) {
      console.warn("Il parsing potrebbe aver fallito. Output del modello:", testoRisposta);
      // Potresti voler gestire questo caso, magari restituendo la risposta grezza o un errore specifico
    }

    res.status(200).json({ nodiGenerati, modello: modelloMappa });

  } catch (error: any) {
    console.error("Errore durante la generazione della mappa:", error);
    const errorMessage =
      error.response?.data?.error?.message ||
      error.message ||
      "Errore sconosciuto";
    res.status(500).json({
      error: "Errore durante la generazione dei concetti della mappa",
      details: errorMessage,
    });
  }
}
