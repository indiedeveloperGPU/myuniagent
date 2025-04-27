import { supabase } from "@/lib/supabaseClient";
import { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";
import fs from "fs";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metodo non consentito" });
  }

  const form = new formidable.IncomingForm();

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("Errore durante il parsing del form:", err);
      return res.status(500).json({ error: "Errore durante il parsing del file" });
    }

    const file = files.file?.[0];
    if (!file) {
      return res.status(400).json({ error: "File non trovato" });
    }

    try {
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) {
        return res.status(401).json({ error: "Token mancante" });
      }

      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      if (userError || !user) {
        console.error("Errore autenticazione Supabase:", userError);
        return res.status(401).json({ error: "Utente non autenticato" });
      }

      const userId = user.id;
      const fileBuffer = fs.readFileSync(file.filepath);
      const filePath = `${userId}/${file.originalFilename}`;

      const { data, error: uploadError } = await supabase.storage
        .from('tesi')
        .upload(filePath, fileBuffer, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        console.error("Errore upload Supabase:", uploadError);
        return res.status(500).json({ error: "Errore durante l'upload su Supabase" });
      }

      // Se vuoi salvare anche nel database (opzionale)
      await supabase.from("uploaded_files").insert({
        user_id: userId,
        filename: file.originalFilename,
      });

      // ✅ RISPOSTA CORRETTA JSON
      return res.status(200).json({ success: true, message: "Upload completato" });

    } catch (error) {
      console.error("Errore interno:", error);
      return res.status(500).json({ error: "Errore interno del server" });
    }
  });
}




