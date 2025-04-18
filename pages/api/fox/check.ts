import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metodo non consentito" });
  }

  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    return res.status(401).json({ error: "Token mancante" });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    }
  );

  const { concetto } = req.body;
  if (!concetto) {
    return res.status(400).json({ error: "Concetto mancante" });
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user?.id) {
    return res.status(401).json({ error: "Utente non autenticato" });
  }

  const { data, error } = await supabase
    .from("agente_fox")
    .select("risposta")
    .eq("user_id", userData.user.id)
    .eq("domanda", concetto)
    .eq("stato", "completato")
    .order("risposta_il", { ascending: false })
    .limit(1)
    .single();

  if (error || !data?.risposta) {
    return res.status(200).json({ risposta: null });
  }

  return res.status(200).json({ risposta: data.risposta });
}
