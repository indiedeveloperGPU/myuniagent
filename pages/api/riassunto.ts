import type { NextApiRequest, NextApiResponse } from 'next';
import { OpenAI } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MAX_CHARS = 3500;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metodo non consentito' });

  const { testo, avanzato } = req.body;

  if (!testo || typeof testo !== 'string') {
    return res.status(400).json({ error: 'Testo mancante o non valido' });
  }

  if (testo.length > MAX_CHARS) {
    return res.status(400).json({
      error: `Il testo supera i ${MAX_CHARS} caratteri consentiti.`,
    });
  }

  try {
    // Prompt dinamico
    const systemPrompt = avanzato
      ? 'Sei un assistente accademico. Il tuo compito è riassumere testi complessi in modo chiaro, preciso e completo, mantenendo uno stile universitario e un linguaggio professionale.'
      : 'Sei un assistente che crea riassunti dettagliati e accademici.';

    const userPrompt = avanzato
      ? `Leggi attentamente il seguente testo e forniscine un riassunto accurato e accademico:\n\n${testo}`
      : `Fornisci un riassunto completo di questo testo:\n\n${testo}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.5,
    });

    const riassunto = response.choices[0]?.message?.content || 'Nessun riassunto disponibile';

    // ✅ Niente salvataggio lato DB in locale
    res.status(200).json({ riassunto, modello: 'gpt-3.5-turbo', avanzato });
  } catch (error: any) {
    console.error('Errore nel riassunto:', error);
    res.status(500).json({ error: 'Errore durante la generazione del riassunto' });
  }
}



