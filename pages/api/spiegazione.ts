import type { NextApiRequest, NextApiResponse } from "next";
import { OpenAI } from "openai";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export const config = {
  api: {
    bodyParser: true,
  },
};

const valutazionePrompt = (input: string) => {
  const paroleChiaveComplesse = [
    "epistemologia", "analisi", "quantistica", "neuroscienza", "deep learning",
    "paradosso", "equazione differenziale", "matrice", "sintassi computazionale",
  ];
  const lunghezza = input.length;
  const complesso =
    paroleChiaveComplesse.some((p) => input.toLowerCase().includes(p)) || lunghezza > 300;
  return complesso ? "gpt-4" : "gpt-3.5-turbo";
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metodo non consentito" });
  }

  const { concetto, followUp } = req.body;

  if (!concetto || typeof concetto !== "string") {
    return res.status(400).json({ error: "Concetto mancante o non valido" });
  }

  const modello = valutazionePrompt(concetto);

  const messaggi: any[] = [
    {
      role: "system",
      content:
        "Sei un assistente accademico esperto. Spiega in modo avanzato ma chiaro i concetti forniti, come se fossero destinati a studenti universitari o per un esame. Rispondi sempre in modo approfondito.",
    },
  ];

  if (Array.isArray(followUp) && followUp.length > 0) {
    messaggi.push(...followUp);
  } else {
    messaggi.push({
      role: "user",
      content: `Spiegami: ${concetto}`,
    });
  }

  try {
    const completamento = await openai.chat.completions.create({
      model: modello,
      messages: messaggi,
      temperature: 0.6,
    });

    const spiegazione =
      completamento.choices[0]?.message?.content ?? "Nessuna risposta disponibile.";

    const accessToken = req.cookies["sb-access-token"];
    if (!accessToken) {
      return res.status(200).json({ spiegazione, modelloUsato: modello });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      return res.status(200).json({ spiegazione, modelloUsato: modello });
    }

    const nuovoMessaggio = { role: "assistant", content: spiegazione };

    if (!followUp || followUp.length === 0) {
      // ✅ Nuova chat: creiamo una riga in chat_spiegazioni
      const messaggiIniziali = [
        { role: "user", content: concetto },
        nuovoMessaggio,
      ];

      await supabase.from("chat_spiegazioni").insert({
        user_id: user.id,
        titolo: concetto,
        messaggi: messaggiIniziali,
      });

      // Salviamo anche in attivita per la cronologia generica
      await supabase.from("attivita").insert({
        user_id: user.id,
        tipo: "spiegazione",
        input: concetto,
        output: spiegazione,
      });
    } else {
      // ✅ Follow-up: aggiorniamo la conversazione esistente (titolo = concetto)
      const { data: chatEsistente } = await supabase
        .from("chat_spiegazioni")
        .select("id, messaggi")
        .eq("user_id", user.id)
        .eq("titolo", concetto)
        .limit(1)
        .single();

      if (chatEsistente) {
        const messaggiAggiornati = [...followUp, nuovoMessaggio];

        await supabase.from("chat_spiegazioni")
          .update({
            messaggi: messaggiAggiornati,
            ultima_modifica: new Date().toISOString(),
          })
          .eq("id", chatEsistente.id);
      }
    }

    return res.status(200).json({ spiegazione, modelloUsato: modello });
  } catch (error: any) {
    console.error("Errore generazione spiegazione:", error);
    return res.status(500).json({ error: "Errore durante la generazione della spiegazione" });
  }
}










