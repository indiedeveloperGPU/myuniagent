import type { NextApiRequest, NextApiResponse } from "next";
import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metodo non consentito" });
  }

  const { domanda, risposta } = req.body;

  if (!domanda || !risposta) {
    return res.status(400).json({ error: "Domanda o risposta mancante" });
  }

  try {
    const prompt = `
Hai generato il seguente esame simulato:

DOMANDE:
${domanda}

Uno studente ha fornito queste risposte:

RISPOSTE:
${risposta}

Fornisci una correzione dettagliata per ogni risposta, indica se è corretta o meno, e suggerisci eventuali miglioramenti.
    `.trim();

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const output = completion.choices[0].message.content;
    res.status(200).json({ output });
  } catch (error) {
    console.error("Errore correzione GPT:", error);
    res.status(500).json({ error: "Errore durante la correzione" });
  }
}
