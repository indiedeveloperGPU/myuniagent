import { NextApiRequest, NextApiResponse } from "next";
import { OpenAI } from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metodo non consentito" });
  }

  const { certificazione, sezione, rispostaUnica } = req.body;

  if (!certificazione || !sezione || !rispostaUnica) {
    return res.status(400).json({ error: "Parametri mancanti" });
  }

  const prompt = `
Hai ricevuto una simulazione di certificazione inglese (${certificazione}) per la sezione: ${sezione}.

Analizza il testo fornito dallo studente in base ai seguenti criteri:
- grammatica e sintassi
- vocabolario usato
- coerenza e chiarezza
- pertinenza delle risposte

TESTO DELLO STUDENTE:
${rispostaUnica}

Assegna un punteggio complessivo da 0 a 100 e scrivi anche un breve feedback per aiutare lo studente a migliorare.

Rispondi solo nel seguente formato JSON:

{
  "punteggio": 85,
  "feedback": "Hai risposto in modo chiaro e con buon vocabolario. Cerca di migliorare l’accuratezza grammaticale e includere più dettagli concreti."
}
  `;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.5,
    });

    const text = completion.choices[0].message.content || "";

    const match = text.match(/\{[\s\S]*?\}/);
    const parsed = match ? JSON.parse(match[0]) : { punteggio: 0, feedback: "Nessun feedback disponibile." };

    return res.status(200).json({
      punteggio: parsed.punteggio || 0,
      feedback: parsed.feedback || "Nessun feedback disponibile.",
    });
  } catch (error) {
    console.error("Errore valutazione GPT:", error);
    return res.status(500).json({ error: "Errore durante la valutazione" });
  }
}
