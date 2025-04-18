import { NextApiRequest, NextApiResponse } from "next";
import { OpenAI } from "openai";
import { supabase } from "@/lib/supabaseClient";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metodo non consentito" });
  }

  const { certificazione, sezione, livello, risposte, user_id, scenario } = req.body;

  // STEP 1 – Generazione domande (iniziale)
  if (certificazione && sezione && !risposte) {
    const prompt = `
Genera una simulazione per la certificazione di inglese ${certificazione}.
Sezione: ${sezione}.
Fornisci 3 domande realistiche da presentare a uno studente.
Non includere le risposte, solo le domande in un elenco.
`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      });

      const output = completion.choices[0].message.content || "";
      const domande = output.split(/\n+/).filter((line) => line.trim() !== "");

      return res.status(200).json({ domande });
    } catch (error: any) {
      console.error("Errore nella generazione simulazione:", error);
      return res.status(500).json({ error: "Errore durante la generazione delle domande." });
    }
  }

  // STEP 2 – Valutazione finale e salvataggio
  if (risposte && livello && user_id) {
    const testoStudente = risposte.join("\n\n");

    const valutazionePrompt = `
Valuta la seguente produzione scritta in inglese per una simulazione di certificazione (livello ${livello}).
Assegna un punteggio da 0 a 100 basato su grammatica, lessico, coerenza e struttura.
Dai anche un breve feedback educativo per lo studente (max 4 righe).

TESTO:
${testoStudente}

Rispondi in JSON con questo formato:

{
  "punteggio": 84,
  "feedback": "La risposta è coerente e ben organizzata. Attenzione all'uso dei tempi verbali."
}
`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: valutazionePrompt }],
        temperature: 0.6,
      });

      const raw = completion.choices[0].message.content || "";
      const json = raw.match(/{[\s\S]*}/)?.[0];

      if (!json) {
        return res.status(500).json({ error: "Valutazione non valida" });
      }

      const parsed = JSON.parse(json);
      const { punteggio, feedback } = parsed;

      // Salvataggio su Supabase
      const { error } = await supabase.from("simulazioni_certificazioni").insert({
        user_id,
        livello,
        testo: testoStudente,
        punteggio,
        feedback_gpt: feedback,
        scenario,
      });

      if (error) {
        console.error("Errore salvataggio Supabase:", error);
        return res.status(500).json({ error: "Errore nel salvataggio del risultato." });
      }

      return res.status(200).json({ punteggio, feedback });
    } catch (e) {
      console.error("Errore GPT o JSON:", e);
      return res.status(500).json({ error: "Errore durante la valutazione." });
    }
  }

  return res.status(400).json({ error: "Richiesta non valida o parametri mancanti." });
}

