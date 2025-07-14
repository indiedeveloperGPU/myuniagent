// File: pages/api/thesis-chunks/[projectId].ts
// Questo endpoint recupera tutti i materiali grezzi per un dato progetto di analisi tesi.

import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

// Inizializza il client Supabase.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Gestisce la richiesta GET per recuperare i materiali di un progetto.
 * - Autentica l'utente.
 * - Autorizza l'utente, verificando che sia il proprietario del progetto.
 * - Recupera i dati del progetto e la lista dei suoi materiali grezzi.
 * - Calcola statistiche aggregate.
 * - Restituisce i dati completi.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 1. Controlla che il metodo HTTP sia GET.
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Metodo non consentito" });
  }

  // 2. Estrae l'ID del progetto dalla URL.
  const { projectId } = req.query;
  if (!projectId || typeof projectId !== "string") {
    return res.status(400).json({ error: "ID progetto mancante o non valido" });
  }

  // 3. Autenticazione dell'utente.
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Token mancante" });

  const { data: userData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !userData?.user) {
    return res.status(401).json({ error: "Utente non autenticato" });
  }
  const user = userData.user;

  try {
    // 4. Autorizzazione: verifica che il progetto esista e appartenga all'utente.
    const { data: projectData, error: projectError } = await supabase
      .from("thesis_analysis_sessions")
      .select("id, user_id, project_title, faculty, thesis_topic, level, status")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single();

    if (projectError || !projectData) {
      return res.status(404).json({ error: "Progetto di analisi non trovato o non autorizzato" });
    }

    // 5. Recupera tutti i materiali grezzi associati, ordinati per 'order_index'.
    const { data: chunks, error: chunksError } = await supabase
      .from("thesis_raw_chunks")
      .select("*") // Seleziona tutte le colonne
      .eq("project_id", projectId)
      .order("order_index", { ascending: true });

    if (chunksError) {
      console.error("Errore recupero materiali:", chunksError);
      return res.status(500).json({ error: "Errore nel recupero dei materiali" });
    }

    // 6. Calcola statistiche aggregate per la dashboard.
    const totalChunks = chunks?.length || 0;
    const totalChars = chunks?.reduce((sum, chunk) => sum + chunk.char_count, 0) || 0;
    const totalWords = chunks?.reduce((sum, chunk) => sum + chunk.word_count, 0) || 0;
    
    // Suddivisione per stato, utile per la UI.
    const statusCounts = chunks?.reduce((acc, chunk) => {
      acc[chunk.status] = (acc[chunk.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    // 7. Restituisce una risposta di successo con i dati completi.
    return res.status(200).json({
      project: projectData,
      chunks: chunks || [],
      stats: {
        total_chunks: totalChunks,
        total_chars: totalChars,
        total_words: totalWords,
        status_breakdown: statusCounts,
      }
    });

  } catch (err: any) {
    console.error(`Errore API /thesis-chunks/${projectId}:`, err);
    return res.status(500).json({
      error: "Errore interno del server",
      details: err.message
    });
  }
}
