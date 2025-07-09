// File: pages/api/thesis-sessions/create.ts
// API per creare nuove sessioni di analisi tesi

import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metodo non consentito" });
  }

  // 🔐 AUTENTICAZIONE
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Token mancante" });

  const { data: userData, error } = await supabase.auth.getUser(token);
  if (error || !userData?.user) return res.status(401).json({ error: "Utente non autenticato" });

  // 📝 VALIDAZIONE INPUT
  const { project_title, faculty, thesis_topic, level, is_public } = req.body;

  if (!project_title?.trim()) {
    return res.status(400).json({ error: "Titolo progetto è obbligatorio" });
  }

  if (!faculty?.trim()) {
    return res.status(400).json({ error: "Facoltà è obbligatoria" });
  }

  if (!thesis_topic?.trim()) {
    return res.status(400).json({ error: "Argomento tesi è obbligatorio" });
  }

  if (!level?.trim() || !['triennale', 'magistrale', 'dottorato'].includes(level)) {
    return res.status(400).json({ error: "Livello tesi non valido (triennale, magistrale, dottorato)" });
  }

  // 🚧 CONTROLLO LIMITI SESSIONI ATTIVE
  const { count: activeSessionsCount, error: countError } = await supabase
    .from("thesis_analysis_sessions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userData.user.id)
    .eq("status", "active");

  if (countError) {
    console.error("Errore conteggio sessioni attive:", countError);
    return res.status(500).json({ error: "Errore controllo sessioni attive" });
  }

  const MAX_ACTIVE_SESSIONS = 5; // Limite enterprise per utente
  if ((activeSessionsCount ?? 0) >= MAX_ACTIVE_SESSIONS) {
    return res.status(429).json({
      error: `Hai raggiunto il limite di ${MAX_ACTIVE_SESSIONS} progetti di analisi tesi attivi. Completa o abbandona alcuni progetti prima di crearne di nuovi.`,
      active_sessions: activeSessionsCount
    });
  }

  try {
    // 🗄️ INSERIMENTO SESSIONE
    const { data: session, error: insertError } = await supabase
      .from("thesis_analysis_sessions")
      .insert({
        user_id: userData.user.id,
        project_title: project_title.trim(),
        faculty: faculty.trim(),
        thesis_topic: thesis_topic.trim(),
        level: level.trim(),
        is_public: Boolean(is_public), // Default false se non specificato
        processing_metadata: {
          created_via: "api",
          expected_analyses: getExpectedAnalysesCount(level),
          user_agent: req.headers['user-agent'] || 'unknown',
          ip_address: req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown'
        }
      })
      .select()
      .single();

    if (insertError) {
      console.error("Errore inserimento sessione tesi:", insertError);
      throw insertError;
    }

    console.log(`✅ Nuova sessione tesi creata: ${session.project_title} (${session.level}) - ID: ${session.id}`);
    
    // 📊 REGISTRA ATTIVITÀ (se tabella attivita esiste)
    try {
      await supabase.from("attivita").insert({
        user_id: userData.user.id,
        tipo: "analisi_tesi",
        dettagli: `Nuovo progetto di analisi tesi: ${session.project_title} (${session.level})`,
        creato_il: new Date().toISOString()
      });
    } catch (activityError) {
      // Non bloccante se tabella attivita non esiste
      console.warn("Impossibile registrare attività:", activityError);
    }
    
    res.status(201).json({
      ...session,
      message: "Sessione di analisi tesi creata con successo",
      expected_analyses: getExpectedAnalysesCount(level)
    });

  } catch (error: any) {
    console.error("Errore creazione sessione tesi:", error);
    res.status(500).json({ 
      error: "Errore interno del server", 
      details: error.message 
    });
  }
}

// 🎯 HELPER: Conteggio analisi attese per livello
function getExpectedAnalysesCount(level: string): number {
  switch (level) {
    case 'triennale': return 8;
    case 'magistrale': return 12;
    case 'dottorato': return 16;
    default: return 0;
  }
}
