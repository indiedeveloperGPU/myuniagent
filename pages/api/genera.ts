// pages/api/test/genera.ts
import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end("Metodo non consentito");

  const { titolo, tipo, argomento = "", livello = "intermedio" } = req.body;

  if (!titolo || !tipo) {
    return res.status(400).json({ error: "Titolo e tipo sono obbligatori." });
  }

  try {
    const prompt = `
Sei un docente. Genera 5 domande ${tipo === "orale" ? "orali" : "scritte"} con risposta corretta per un test dal titolo "${titolo}".
Contesto: ${argomento || "generale"}.
Livello di difficoltà: ${livello}.
Rispondi nel seguente formato JSON:
[
  {
    "domanda": "Domanda 1",
    "risposta": "Risposta corretta"
  },
  ...
]
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const output = completion.choices[0].message.content;

    const domande = JSON.parse(output || "[]");

    if (!Array.isArray(domande)) throw new Error("Output non valido");

    res.status(200).json({ success: true, domande });
  } catch (err: any) {
    console.error("Errore generazione test:", err.message);
    res.status(500).json({ success: false, error: "Errore durante la generazione." });
  }
}
