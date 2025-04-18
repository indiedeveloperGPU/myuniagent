import { NextApiRequest, NextApiResponse } from "next";
import { IncomingForm, Fields, Files } from "formidable";
import fs from "fs";
import path from "path";
import os from "os";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import Tesseract from "tesseract.js";

export const config = {
  api: {
    bodyParser: false,
  },
};

const parseForm = (req: NextApiRequest): Promise<{ fields: Fields; files: Files }> => {
  const form = new IncomingForm({ uploadDir: os.tmpdir(), keepExtensions: true });

  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metodo non consentito" });
  }

  try {
    const { files } = await parseForm(req);

    const rawFile = files.file;
    if (!rawFile) return res.status(400).json({ error: "File non presente nella richiesta" });

    const file = Array.isArray(rawFile) ? rawFile[0] : rawFile;
    const filePath = (file as any).filepath || (file as any).path;
    const ext = path.extname(file.originalFilename || "").toLowerCase();

    let text = "";

    if (ext === ".pdf") {
      const buffer = fs.readFileSync(filePath);
      const data = await pdfParse(buffer);
      text = data.text;
    } else if (ext === ".docx") {
      const buffer = fs.readFileSync(filePath);
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else if (ext === ".txt") {
      text = fs.readFileSync(filePath, "utf8");
    } else if ([".png", ".jpg", ".jpeg"].includes(ext)) {
        const { data: { text: ocrText } } = await Tesseract.recognize(filePath, "eng");
      text = ocrText;
    } else {
      return res.status(400).json({ error: "Formato file non supportato." });
    }

    return res.status(200).json({ testo: text.trim() });
  } catch (error: any) {
    console.error("Errore durante l'estrazione:", error);
    return res.status(500).json({ error: "Errore nell'elaborazione del file" });
  }
}
