import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs-extra";
import path from "path";
import mammoth from "mammoth";
import pdfParse from "pdf-parse";
import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metodo non consentito" });
  }

  const { filename, type } = req.body;

  if (!filename) {
    return res.status(400).json({ error: "Nessun file specificato" });
  }

  const filePath = path.join(process.cwd(), "uploads", filename);

  try {
    let text = "";

    if (filename.endsWith(".docx")) {
      const result = await mammoth.extractRawText({ path: filePath });
      text = result.value;
    } else if (filename.endsWith(".txt")) {
      text = await fs.readFile(filePath, "utf-8");
    } else if (filename.endsWith(".pdf")) {
      const buffer = await fs.readFile(filePath);
      const data = await pdfParse(buffer);
      text = data.text;
    } else {
      return res.status(400).json({ error: "Formato non supportato" });
    }

    const inputText = text.slice(0, 8000); // Taglio per sicurezza token

    let prompt = "";

    switch (type) {
      case "generale":
        prompt = "Analizza il seguente testo accademico. Fornisci un riassunto e un commento generale sulla struttura, chiarezza e completezza:\n\n" + inputText;
        break;
      case "struttura":
        prompt = "Analizza la struttura del seguente testo accademico. Identifica introduzione, obiettivi, metodologia, risultati, conclusioni:\n\n" + inputText;
        break;
      case "metodologia":
        prompt = "Analizza la metodologia descritta nel seguente testo accademico. È corretta, coerente e ben motivata?\n\n" + inputText;
        break;
      case "bibliografia":
        prompt = "Analizza la bibliografia del seguente testo. È aggiornata? Rilevante? Cita fonti autorevoli?\n\n" + inputText;
        break;
      case "completa":
        prompt = "Fornisci un'analisi approfondita del seguente testo accademico, includendo riassunto, struttura, metodologia, bibliografia e criticità:\n\n" + inputText;
        break;
      default:
        prompt = "Analizza il seguente testo accademico:\n\n" + inputText;
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4", // ✅ Usiamo GPT-4 ora
      messages: [{ role: "user", content: prompt }],
    });

    const result = completion.choices[0].message.content;
    return res.status(200).json({ result });

  } catch (err) {
    console.error("Errore analisi tesi:", err);
    return res.status(500).json({ error: "Errore interno del server" });
  }
}

