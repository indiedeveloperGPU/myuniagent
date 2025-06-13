import type { NextApiRequest, NextApiResponse } from "next";
import { OpenAI } from "openai";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({
  apiKey: process.env.TOGETHER_API_KEY!,
  baseURL: "https://api.together.xyz/v1",
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const config = {
  api: {
    bodyParser: true,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metodo non consentito" });
  }

  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Token mancante" });

  const { data: userData, error } = await supabase.auth.getUser(token);
  if (error || !userData?.user) return res.status(401).json({ error: "Utente non autenticato" });

  const user = userData.user;

  const oggiInizio = new Date();
  oggiInizio.setHours(0, 0, 0, 0);

const { count, error: countError } = await supabase
  .from("attivita")
  .select("*", { count: "exact", head: true })
  .eq("user_id", user.id)
  .eq("tipo", "riassunto")
  .gte("creato_il", oggiInizio.toISOString());

if (countError) {
  console.error("Errore conteggio riassunti:", countError);
  return res.status(500).json({ error: "Errore controllo limite giornaliero" });
}

const LIMITE_GIORNALIERO = 3;

if ((count ?? 0) >= LIMITE_GIORNALIERO) {
  return res.status(429).json({
    error: `Hai raggiunto il limite di ${LIMITE_GIORNALIERO} riassunti al giorno. Riprova domani o contatta Agente Fox.`,
  });
}


  const origin = req.headers.origin || "";
  const dominiAutorizzati = ["https://myuniagent.it", "http://localhost:3000"];
  if (!dominiAutorizzati.includes(origin)) {
    return res.status(403).json({ error: "Accesso non consentito da questa origine." });
  }

  const { testo } = req.body;


  if (!testo || typeof testo !== "string") {
    return res.status(400).json({ error: "Testo mancante o non valido" });
  }

  if (testo.length > 60000) {
    return res.status(400).json({ error: "Testo troppo lungo (max 60.000 caratteri)" });
  }

  const promptScout = `
Agisci come MyUniAgent "Agente Speciale Fox", un'assistente accademico super intelligente che è di supporto agli studenti universitari. Devi eseguire un riassunto avanzato e completo partendo dal testo originale che ricevi.
Utilizza sempre questa formula: Sempre il totale del testo totale diviso tre ( 1/3 del testo originale ).
L'output non è un riassunto breve ma un vero sostituto del testo originale, deve permettere allo studente di prepararsi ad un'esame scritto o orale all'università. Leggi l'intero input per mapparne la struttura (Indice, Capitoli, Sezioni, Paragrafi). Identifica la tesi centrale, le argomentazioni secondarie e le relazioni causali tra i concetti. Massima attenzione all'aspetto critico, basati sempre sulle informazioni che sono nel testo input che leggi.
Estrazione Esaustiva: Per ogni capitolo, estrai e cataloga internamente OGNI definizione, formula, principio, teoria, classificazione, data, nome, normativa ed esempio. Non omettere nulla che possa essere oggetto di domanda d'esame.
Per ogni capitolo o sezione principale, genera l'output seguendo rigorosamente la seguente struttura:
Header del Capitolo: Scrivi l'header con l'ID anchor (es. ## Capitolo 1 – Titolo {#titolo}).
L'obiettivo è spiegare l'intera argomentazione del capitolo come farebbe un ottimo professore. Deve connettere le idee, spiegare le cause e le conseguenze e guidare lo studente attraverso il "perché" dei concetti, non solo il "cosa".
Identifica 2-3 punti del capitolo che sono particolarmente complessi, controintuitivi, o cruciali per l'esame. Spiegane l'importanza e avvisa lo studente.
Analizzando il testo, cita sempre esempi che possono essere pertinenti all'apprendimento.:

"""${testo}"""
  `;

  try {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Transfer-Encoding", "chunked");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    const stream = await openai.chat.completions.create({
      model: "meta-llama/Llama-4-Scout-17B-16E-Instruct",
      messages: [
        { role: "system", content: promptScout },
        { role: "user", content: "Procedi con il riassunto del testo fornito." }
      ],
      temperature: 0.15,
      stream: true,
    });

    let riassuntoCompleto = "";

    for await (const chunk of stream) {
      const content = (chunk as any).choices?.[0]?.delta?.content || "";
      if (content) {
        riassuntoCompleto += content;
        res.write(content);
      }
    }

    res.end();

    // 🔒 SALVATAGGIO ASINCRONO
setImmediate(async () => {
  try {
    const supabaseAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    const {
      data: { user: authUser },
      error: userError,
    } = await supabaseAuth.auth.getUser();

    if (userError || !authUser?.id) {
      console.error("Errore nel recupero utente per salvataggio:", userError);
      return;
    }

    const { error: insertError } = await supabaseAuth.from("riassunti_generati").insert({
  user_id: authUser.id,
  titolo: testo.slice(0, 100), // opzionale: anteprima titolo
  input: testo.slice(0, 60000),
  output: riassuntoCompleto,
});


    if (insertError) {
      console.error("Errore salvataggio attivita riassunto:", insertError);
    } else {
      console.log("✅ Riassunto salvato su Supabase");
    }
  } catch (err) {
    console.error("Errore nel salvataggio asincrono:", err);
  }
});


  } catch (err: any) {
    console.error("Errore durante la generazione del riassunto:", err);
    const errorMessage = err.response?.data?.error?.message || err.message || "Errore sconosciuto";
    res.status(500).json({ error: "Errore generazione riassunto", details: errorMessage });
  }
}
