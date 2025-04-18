import { NextApiRequest, NextApiResponse } from "next";
import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metodo non consentito" });
  }

  const { input, livello, mode, messages, scenario, valuta, lingua } = req.body;

  if (!mode) {
    return res.status(400).json({ error: "Parametro 'mode' mancante" });
  }

  // Seleziona automaticamente GPT-4 per C1/C2, altrimenti usa GPT-3.5
  let model = (livello === "C1" || livello === "C2") ? "gpt-4" : "gpt-3.5-turbo";
  let prompt = "";

  if (mode === "theory") {
    prompt = `
Spiega in modo chiaro e adatto a uno studente di livello ${livello} l'argomento grammaticale: "${input}" nella lingua: ${lingua}.
Fornisci:
- definizione
- regole grammaticali
- esempi
- eccezioni (se esistono)
- riassunto finale

Alla fine genera 3 domande a scelta multipla (quiz), in formato JSON:

\`\`\`json
{
  "quiz": [
    {
      "domanda": "Domanda...",
      "opzioni": ["A", "B", "C", "D"],
      "corretta": "Risposta corretta"
    }
  ]
}
\`\`\`
    `;
  }

  if (mode === "vocabulary") {
    prompt = `
Genera un elenco di 8-10 vocaboli legati al tema: "${input}", adatti a livello ${livello} nella lingua: ${lingua}.
Per ogni parola:
- fornisci una frase d'esempio.

Poi genera 3 domande a scelta multipla in formato JSON come segue:

\`\`\`json
{
  "quiz": [
    {
      "domanda": "Domanda...",
      "opzioni": ["A", "B", "C", "D"],
      "corretta": "Risposta corretta"
    }
  ]
}
\`\`\`
    `;
  }

  if (mode === "conversation" && messages && !valuta) {
    const systemPrompt = `Stai conversando con uno studente in ${lingua === "fr" ? "francese" : lingua === "es" ? "spagnolo" : "inglese"} nel contesto: "${scenario}". Rispondi in modo realistico, come un essere umano.`;
    model = "gpt-4"; // Conversazione sempre con GPT-4

    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      temperature: 0.9,
    });

    return res.status(200).json({ result: completion.choices[0].message.content });
  }

  if (mode === "conversation" && valuta && messages) {
    model = "gpt-4"; // valutazione sempre GPT-4

    const formattedConversation = messages
      .map((m: { role: string; content: string }) =>
        `${m.role === "user" ? "Studente" : "AI"}: ${m.content}`
      )
      .join("\n");

    const valutazionePrompt = `
In base alla seguente conversazione tra studente e AI, assegna due punteggi (da 0 a 100):
- punteggio_scrittura: grammatica, vocabolario, costruzione frasi
- punteggio_pronuncia: fluenza, pronuncia (simulata)

CONVERSAZIONE:
${formattedConversation}

Rispondi solo con JSON come segue:

{
  "punteggio_scrittura": 85,
  "punteggio_pronuncia": 78
}
    `;

    const completion = await openai.chat.completions.create({
      model,
      messages: [{ role: "user", content: valutazionePrompt }],
      temperature: 0.5,
    });

    const text = completion.choices[0].message.content || "";
    let punteggi = { punteggio_scrittura: null, punteggio_pronuncia: null };

    try {
      const match = text.match(/{[\s\S]*}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        punteggi = {
          punteggio_scrittura: parsed.punteggio_scrittura || 0,
          punteggio_pronuncia: parsed.punteggio_pronuncia || 0,
        };
      }
    } catch (e) {
      console.error("Errore parsing valutazione GPT:", e);
    }

    return res.status(200).json({ result: punteggi });
  }

  if (mode === "correction") {
    model = (livello === "C1" || livello === "C2") ? "gpt-4" : "gpt-3.5-turbo";

    const promptCorrezione = `
Correggi il seguente testo scritto da uno studente di livello ${livello} in lingua ${lingua}.
Fornisci un JSON così strutturato:

{
  "corretto": "testo corretto",
  "feedback": "spiegazioni su errori e suggerimenti",
  "punteggio": 0-100
}

Testo da correggere:
${input}
    `;

    try {
      const completion = await openai.chat.completions.create({
        model,
        messages: [{ role: "user", content: promptCorrezione }],
        temperature: 0.7,
      });

      const raw = completion.choices[0].message.content || "";
      let result = { corretto: "", feedback: "", punteggio: null };

      const match = raw.match(/{[\s\S]*}/);
      if (match) {
        result = JSON.parse(match[0]);
      }

      return res.status(200).json({ result });
    } catch (error: any) {
      console.error("Errore GPT - correzione:", error);
      return res.status(500).json({ error: "Errore durante la correzione" });
    }
  }

  // fallback per theory o vocabulary
  try {
    const completion = await openai.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const result = completion.choices[0].message.content;
    return res.status(200).json({ result });
  } catch (error: any) {
    console.error("Errore API GPT:", error);
    return res.status(500).json({ error: "Errore durante la generazione del contenuto" });
  }
}



