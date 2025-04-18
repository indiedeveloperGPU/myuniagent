import type { NextApiRequest, NextApiResponse } from "next";

const detectComplexity = (argomento: string): "gpt-3.5-turbo" | "gpt-4" => {
  const keywords = ["struttura", "neuroscienze", "quantistica", "teorema", "approfondimento"];
  return argomento.length > 280 || keywords.some(k => argomento.toLowerCase().includes(k))
    ? "gpt-4"
    : "gpt-3.5-turbo";
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { argomento } = req.body;
  if (!argomento) return res.status(400).json({ errore: "Argomento mancante" });

  const model = detectComplexity(argomento);

  const prompt = `Genera da 5 a 8 concetti chiave per creare una mappa concettuale sull'argomento: "${argomento}". Rispondi con un elenco semplice, senza numeri né simboli.`;

  const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.5,
    }),
  }).then((r) => r.json());

  const testo = openaiRes?.choices?.[0]?.message?.content || "";
  const nodi = testo
  .split("\n")
  .map((riga: string) => riga.replace(/^[\d\-\.\)]*\s*/, "").trim())
  .filter((riga: string) => riga.length > 0);


  res.status(200).json({ nodiGenerati: nodi, modello: model });
}
