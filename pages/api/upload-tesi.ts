import { supabase } from "@/lib/supabaseClient";
import { NextApiRequest, NextApiResponse } from "next";

// Middleware per gestire il parsing multipart/form-data
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
      console.error(err);
      return res.status(500).json({ error: "Errore nel parsing del form" });
    }

    const file = files.file?.[0];
    if (!file) {
      return res.status(400).json({ error: "Nessun file caricato" });
    }

    try {
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) {
        return res.status(401).json({ error: "Token mancante" });
      }

      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      if (userError || !user) {
        console.error(userError);
        return res.status(401).json({ error: "Utente non autenticato" });
      }

      const userId = user.id;

      const fileBuffer = fs.readFileSync(file.filepath);

      // ✅ CORRETTO: solo userId + file.name, senza duplicazioni
      const filePath = `${userId}/${file.originalFilename}`;

      const { data, error: uploadError } = await supabase.storage
        .from('tesi')
        .upload(filePath, fileBuffer, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        console.error(uploadError);
        return res.status(500).json({ error: "Errore durante l'upload" });
      }

      // ✅ Salva anche in uploaded_files (opzionale)
      await supabase.from("uploaded_files").insert({
        user_id: userId,
        filename: file.originalFilename,
      });

      return res.status(200).json({ message: "Upload completato" });

    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Errore interno" });
    }
  });
}



