// /pages/api/correggi-test.ts
import { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/lib/supabaseClient";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Metodo non consentito" });

  const { testId, risposteStudente, studenteId } = req.body;
  if (!testId || !risposteStudente || !studenteId)
    return res.status(400).json({ error: "Dati mancanti" });

  const { data: domande, error } = await supabase
    .from("test_domande")
    .select("id, domanda, risposta")
    .eq("test_id", testId);

  if (error || !domande) return res.status(500).json({ error: "Errore nel recupero domande" });

  const risultati = await Promise.all(
    domande.map(async (d, index) => {
      const rispostaStudente = risposteStudente[index] || "";

      const prompt = `
Sei un professore. Valuta la risposta dello studente.
Domanda: ${d.domanda}
Risposta corretta: ${d.risposta}
Risposta dello studente: ${rispostaStudente}

Fornisci una valutazione sintetica (max 2 righe), indicando se è corretta o sbagliata e perché. Assegna anche un punteggio da 0 a 100.
Rispondi in JSON con: valutazione, punteggio.
`;

      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4",
          messages: [{ role: "user", content: prompt }],
        });

        const content = completion.choices[0].message.content;
        const parsed = JSON.parse(content || "{}");

        // Salva in Supabase
        await supabase.from("test_risultati").insert({
          test_id: testId,
          studente_id: studenteId,
          domanda_id: d.id,
          risposta_studente: rispostaStudente,
          valutazione_gpt: parsed.valutazione || "Valutazione non disponibile",
          punteggio: parsed.punteggio || 0,
          corretta: parsed.punteggio >= 60,
        });

        return {
          domanda: d.domanda,
          rispostaCorretta: d.risposta,
          rispostaStudente,
          valutazioneGPT: parsed.valutazione,
          punteggioSingolo: parsed.punteggio,
        };
      } catch (err) {
        console.error("Errore GPT:", err);
        return {
          domanda: d.domanda,
          rispostaCorretta: d.risposta,
          rispostaStudente,
          valutazioneGPT: "Errore nella valutazione",
          punteggioSingolo: 0,
        };
      }
    })
  );

  return res.status(200).json({ risultati });
}

