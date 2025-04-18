import type { NextApiRequest, NextApiResponse } from "next";
import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metodo non consentito" });
  }

  const { materia, argomento, tipo } = req.body;

  if (!materia || !argomento || !tipo) {
    return res.status(400).json({ error: "Dati mancanti" });
  }

  let tipoDescrizione = "";

  switch (tipo) {
    case "aperte":
      tipoDescrizione = "3-5 domande aperte o esercizi";
      break;
    case "multipla":
      tipoDescrizione = "3-5 domande a risposta multipla, ciascuna con 4 opzioni e una sola corretta";
      break;
    case "misto":
    default:
      tipoDescrizione = "una combinazione di domande aperte ed esercizi a risposta multipla";
      break;
  }

  const prompt = `Sei un professore universitario. Crea una simulazione d'esame scritta per la materia "${materia}" sull’argomento "${argomento}". La simulazione deve includere ${tipoDescrizione}.`;

  try {
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
    console.error("Errore GPT:", error);
    res.status(500).json({ error: "Errore durante la generazione" });
  }
}
