import type { NextApiRequest, NextApiResponse } from "next";
import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // assicurati che sia settata correttamente
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { titolo } = req.body;

  if (!titolo) {
    return res.status(400).json({ error: "Titolo mancante" });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content:
            "Sei un assistente didattico esperto. Genera una lezione strutturata per studenti universitari. Includi una breve introduzione, i concetti chiave e una conclusione. Scrivi in modo chiaro, sintetico e ben organizzato.",
        },
        {
          role: "user",
          content: `Crea una lezione dal titolo: "${titolo}"`,
        },
      ],
      temperature: 0.7,
    });

    const contenuto = completion.choices[0]?.message?.content || "";

    return res.status(200).json({ contenuto });
  } catch (error) {
    console.error("Errore OpenAI:", error);
    return res.status(500).json({ error: "Errore nella generazione AI" });
  }
}
