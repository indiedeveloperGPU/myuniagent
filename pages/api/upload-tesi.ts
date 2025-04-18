import type { NextApiRequest, NextApiResponse } from "next";
import { IncomingForm, Files } from "formidable";
import fs from "fs";
import path from "path";
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

  // ✅ Crea client Supabase lato server e passa token manualmente
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

  const {
    data: userData,
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !userData?.user) {
    console.error("Errore autenticazione:", authError?.message);
    return res.status(401).json({ error: "Utente non autenticato" });
  }

  const userId = userData.user.id;

  const form = new IncomingForm({
    uploadDir: path.join(process.cwd(), "/uploads"),
    keepExtensions: true,
  });

  form.parse(req, async (err: any, fields: any, files: Files) => {
    if (err) {
      console.error("Errore parsing:", err);
      return res.status(500).json({ error: "Errore durante il parsing del file" });
    }

    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    const filename = path.basename(file?.filepath || "");

    // ✅ Salvataggio nel DB Supabase
    const { error: insertError } = await supabase.from("uploaded_files").insert([
      {
        user_id: userId,
        filename,
      },
    ]);

    if (insertError) {
      console.error("Errore DB:", insertError.message);
      return res.status(500).json({ error: "Errore salvataggio DB" });
    }

    return res.status(200).json({ message: "Upload completato", filename });
  });
}

