import type { NextApiRequest, NextApiResponse } from "next";
import { IncomingForm, Files } from "formidable";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metodo non consentito" });
  }

  // ✅ Crea client Supabase con token JWT
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: req.headers.authorization || "",
        },
      },
    }
  );

  // ✅ Recupera utente
  const {
    data: userData,
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !userData?.user) {
    console.error("Errore autenticazione:", authError?.message);
    return res.status(401).json({ error: "Utente non autenticato" });
  }

  const userId = userData.user.id;

  // ✅ Parsing file
  const form = new IncomingForm({ keepExtensions: true });

  form.parse(req, async (err: any, fields: any, files: Files) => {
    if (err) {
      console.error("Errore parsing:", err);
      return res.status(500).json({ error: "Errore durante il parsing del file" });
    }

    const file = Array.isArray(files.file) ? files.file[0] : files.file;

if (!file || !file.filepath) {
  return res.status(400).json({ error: "File non valido o assente" });
}

const buffer = fs.readFileSync(file.filepath);
const originalName = file.originalFilename || "tesi.pdf";
const storagePath = `${userId}/${originalName}`;
const contentType = file.mimetype || undefined;

const { data: uploadData, error: uploadError } = await supabase.storage
  .from("tesi")
  .upload(storagePath, buffer, {
    contentType,
    upsert: true,
  });


    if (uploadError) {
      console.error("Errore upload:", uploadError.message);
      return res.status(500).json({ error: "Errore upload Supabase Storage" });
    }

    // ✅ Salvataggio metadati nel DB
    const { error: insertError } = await supabase.from("uploaded_files").insert([
      {
        user_id: userId,
        filename: storagePath,        // path completo nel bucket
        originalname: originalName,   // nome originale file utente
      },
    ]);

    if (insertError) {
      console.error("Errore DB:", insertError.message);
      return res.status(500).json({ error: "Errore salvataggio DB" });
    }

    return res.status(200).json({
      message: "Upload completato ✅",
      path: storagePath,
      originalname: originalName,
    });
  });
}

