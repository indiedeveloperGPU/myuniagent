// pages/api/admin/fox-stats.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createServerClient } from "@supabase/ssr";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Metodo non consentito" });
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          const cookieHeader = req.headers.cookie;
          if (!cookieHeader) return [];
          return cookieHeader.split(";").map((cookie) => {
            const [name, ...rest] = cookie.trim().split("=");
            return {
              name,
              value: rest.join("="),
            };
          });
        },
        setAll(cookies) {
          const serialized = cookies.map(({ name, value, options }) => {
            const cookie = `${name}=${value}; Path=${options?.path || "/"}` +
              (options?.httpOnly ? "; HttpOnly" : "") +
              (options?.secure ? "; Secure" : "") +
              (options?.maxAge ? `; Max-Age=${options.maxAge}` : "") +
              (options?.expires ? `; Expires=${options.expires.toUTCString()}` : "") +
              (options?.sameSite ? `; SameSite=${options.sameSite}` : "");
            return cookie;
          });
          res.setHeader("Set-Cookie", serialized);
        },
      },
    }
  );

  const { data: userData, error: userError } = await supabase.auth.getUser();
  console.log("🧪 Utente:", userData?.user?.id);
  if (userError) {
    console.error("❌ Errore utente:", userError);
    return res.status(401).json({ error: "Utente non autenticato" });
  }

  try {
    const { data: tutte, error } = await supabase
      .from("agente_fox")
      .select("inviata_il, risposta_il, stato");

    if (error) {
      console.error("❌ Supabase error:", error);
      return res.status(500).json({ error: "Errore nella query Supabase" });
    }

    if (!tutte || tutte.length === 0) {
      return res.status(200).json({
        totale: 0,
        completate: 0,
        percentuale: "0%",
        tempo_medio: "-",
        ultima_risposta: "-",
      });
    }

    const totale = tutte.length;
    const completate = tutte.filter((r) => r.stato === "completato").length;
    const completateConDate = tutte.filter(
      (r) => r.stato === "completato" && r.risposta_il && r.inviata_il
    );

    const percentuale = `${((completate / totale) * 100).toFixed(1)}%`;

    const tempi = completateConDate.map((r) =>
      new Date(r.risposta_il!).getTime() - new Date(r.inviata_il!).getTime()
    );
    const mediaMs = tempi.length > 0 ? tempi.reduce((a, b) => a + b, 0) / tempi.length : null;
    const ore = mediaMs ? Math.floor(mediaMs / 3600000) : 0;
    const minuti = mediaMs ? Math.floor((mediaMs % 3600000) / 60000) : 0;
    const tempo_medio = mediaMs ? `${ore}h ${minuti}m` : "-";

    const ultimaRisposta = tutte
      .filter((r) => r.risposta_il)
      .map((r) => new Date(r.risposta_il!))
      .sort((a, b) => b.getTime() - a.getTime())[0];

    const ultima_risposta = ultimaRisposta
      ? ultimaRisposta.toLocaleString("it-IT", { dateStyle: "medium", timeStyle: "short" })
      : "-";

    return res.status(200).json({
      totale,
      completate,
      percentuale,
      tempo_medio,
      ultima_risposta,
    });
  } catch (e) {
    console.error("❌ Errore handler:", e);
    return res.status(500).json({ error: "Errore interno" });
  }
}
