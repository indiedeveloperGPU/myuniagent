import type { NextApiRequest, NextApiResponse } from "next";
import { OpenAI } from "openai";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({
  apiKey: process.env.TOGETHER_API_KEY!,
  baseURL: "https://api.together.xyz/v1",
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const config = {
  api: {
    bodyParser: true,
  },
};

const modelloScout = "meta-llama/Llama-4-Scout-17B-16E-Instruct";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metodo non consentito" });
  }

  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Token mancante" });

  const { data: user, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: "Utente non autenticato" });

  const origin = req.headers.origin || "";
const dominiAutorizzati = ["https://myuniagent.it", "http://localhost:3000"];
if (!dominiAutorizzati.includes(origin)) {
  return res.status(403).json({ error: "Accesso non consentito da questa origine." });
}


  const { domanda } = req.body as { domanda: string };

  if (!domanda || typeof domanda !== "string") {
    return res.status(400).json({ error: "Domanda mancante o non valida" });
  }

  const prompt = `Lo studente ha scritto la seguente domanda o richiesta:

"${domanda}"

Suggeriscigli 1–3 versioni alternative della stessa richiesta, riformulate in modo:
- più chiaro
- più specifico
- più adatto a un contesto scolastico o universitario

Rispondi con un elenco puntato, senza spiegazioni.`;

  try {
    const completion = await openai.chat.completions.create({
      model: modelloScout,
      messages: [
        {
          role: "system",
          content: "Sei un tutor accademico. Il tuo compito è migliorare la qualità delle domande poste dagli studenti in modo mirato e didattico.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.4,
      max_tokens: 300,
    });

    const raw = completion.choices?.[0]?.message?.content || "";
const suggeriti = raw
  .split(/\n|\r|\r\n|•|-|\*/g)
  .map((s: string) => s.trim())
  .filter((s: string) => s.length > 10)
  .slice(0, 3);

res.status(200).json({ suggestions: suggeriti });
  } catch (error: any) {
    console.error("Errore generazione suggerimenti:", error);
    const errorMessage = error.response?.data?.error?.message || error.message || "Errore sconosciuto";
    res.status(500).json({ error: "Errore durante la generazione dei suggerimenti", details: errorMessage });
  }
}