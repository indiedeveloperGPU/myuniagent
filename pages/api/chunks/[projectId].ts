import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { projectId } = req.query;

  if (!projectId || typeof projectId !== "string") {
    return res.status(400).json({ error: "projectId mancante o non valido" });
  }

  // 🔐 AUTENTICAZIONE
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Token mancante" });

  const { data: userData, error } = await supabase.auth.getUser(token);
  if (error || !userData?.user) return res.status(401).json({ error: "Utente non autenticato" });

  const user = userData.user;

  try {
    // 🔍 VERIFICA AUTORIZZAZIONE AL PROGETTO
    const { data: projectData, error: projectError } = await supabase
      .from("summary_sessions")
      .select("id, user_id, project_title, facolta, materia, status, created_at")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single();

    if (projectError || !projectData) {
      return res.status(404).json({ error: "Progetto non trovato o non autorizzato" });
    }

    if (req.method === "GET") {
      // 📋 GET: Lista chunks del progetto
      const { data: chunks, error: chunksError } = await supabase
        .from("raw_chunks")
        .select(`
          id,
          title,
          section,
          page_range,
          order_index,
          word_count,
          char_count,
          status,
          created_at,
          updated_at,
          processed_at,
          source_metadata
        `)
        .eq("project_id", projectId)
        .order("order_index", { ascending: true });

      if (chunksError) {
        console.error("Errore recupero chunks:", chunksError);
        return res.status(500).json({ error: "Errore nel recupero dei chunks" });
      }

      // 📊 STATISTICHE PROGETTO
      const totalChunks = chunks?.length || 0;
      const totalChars = chunks?.reduce((sum, chunk) => sum + chunk.char_count, 0) || 0;
      const totalWords = chunks?.reduce((sum, chunk) => sum + chunk.word_count, 0) || 0;
      
      const statusCounts = chunks?.reduce((acc, chunk) => {
        acc[chunk.status] = (acc[chunk.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      return res.status(200).json({
        project: projectData,
        chunks: chunks || [],
        stats: {
          total_chunks: totalChunks,
          total_chars: totalChars,
          total_words: totalWords,
          status_breakdown: statusCounts,
          ready_for_processing: statusCounts['pronto'] || 0
        }
      });

    } else if (req.method === "PUT") {
      // 🔄 PUT: Aggiorna ordine chunks
      const { chunk_ids } = req.body;

      if (!Array.isArray(chunk_ids)) {
        return res.status(400).json({ error: "chunk_ids deve essere un array" });
      }

      // Aggiorna l'ordine dei chunks
      const updatePromises = chunk_ids.map((chunkId, index) =>
        supabase
          .from("raw_chunks")
          .update({ order_index: index + 1 })
          .eq("id", chunkId)
          .eq("project_id", projectId)
          .eq("user_id", user.id)
      );

      const results = await Promise.all(updatePromises);
      const errors = results.filter(result => result.error);

      if (errors.length > 0) {
        console.error("Errori nell'aggiornamento ordine:", errors);
        return res.status(500).json({ error: "Errore nell'aggiornamento dell'ordine" });
      }

      // 📝 LOG ATTIVITÀ
      await supabase.from("attivita").insert({
        user_id: user.id,
        tipo: "chunks_reordered",
        dettagli: `Riordinati ${chunk_ids.length} chunks nel progetto "${projectData.project_title}"`,
        creato_il: new Date().toISOString()
      });

      return res.status(200).json({ 
        message: "Ordine chunks aggiornato con successo",
        updated_count: chunk_ids.length
      });

    } else if (req.method === "PATCH") {
      // 🎯 PATCH: Aggiorna status di chunks multipli
      const { chunk_ids, new_status } = req.body;

      if (!Array.isArray(chunk_ids) || chunk_ids.length === 0) {
        return res.status(400).json({ error: "chunk_ids deve essere un array non vuoto" });
      }

      const validStatuses = ['bozza', 'pronto', 'in_coda', 'elaborazione', 'completato', 'errore'];
      if (!validStatuses.includes(new_status)) {
        return res.status(400).json({ 
          error: `Status non valido. Valori accettati: ${validStatuses.join(', ')}` 
        });
      }

      const { data: updatedChunks, error: updateError } = await supabase
        .from("raw_chunks")
        .update({ status: new_status })
        .in("id", chunk_ids)
        .eq("project_id", projectId)
        .eq("user_id", user.id)
        .select("id, title, status");

      if (updateError) {
        console.error("Errore aggiornamento status chunks:", updateError);
        return res.status(500).json({ error: "Errore nell'aggiornamento dello status" });
      }

      // 📝 LOG ATTIVITÀ
      await supabase.from("attivita").insert({
        user_id: user.id,
        tipo: "chunks_status_updated",
        dettagli: `${updatedChunks?.length || 0} chunks impostati a '${new_status}' nel progetto "${projectData.project_title}"`,
        creato_il: new Date().toISOString()
      });

      return res.status(200).json({
        message: `Status aggiornato per ${updatedChunks?.length || 0} chunks`,
        updated_chunks: updatedChunks
      });

    } else {
      return res.status(405).json({ error: "Metodo non consentito" });
    }

  } catch (err: any) {
    console.error("Errore generale nella gestione chunks:", err);
    return res.status(500).json({ 
      error: "Errore interno del server",
      details: err.message 
    });
  }
}
