import type { NextApiRequest, NextApiResponse } from "next";
import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metodo non consentito" });
  }

  const { materia, argomento } = req.body;

  if (!materia || !argomento) {
    return res.status(400).json({ error: "Materia o argomento mancanti." });
  }

  try {
    const prompt = `
Simula un'interrogazione orale su "${argomento}" nella materia "${materia}".
Rispondi come se fossi uno studente universitario preparato, usando un linguaggio formale ma chiaro.
Sii completo nella risposta, come se stessi parlando davanti a un professore durante un esame orale.
    `.trim();

    const completion = await openai.chat.completions.create({
      model: "gpt-4", // GPT-4.5 se attivo nel tuo account
      messages: [
        {
          role: "system",
          content: "Sei uno studente universitario che sta rispondendo a un esame orale.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const output = completion.choices[0].message.content;
    res.status(200).json({ output });
  } catch (error) {
    console.error("Errore GPT:", error);
    res.status(500).json({ error: "Errore durante la simulazione orale." });
  }
}
