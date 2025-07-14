// File: pages/api/thesis-chunks/manage.ts
// Questo endpoint gestisce le operazioni di modifica (PUT) e cancellazione (DELETE)
// sui materiali grezzi di un progetto di analisi tesi.

import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

// Inizializza il client Supabase.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Gestisce le richieste PUT e DELETE per i materiali di un progetto.
 * - PUT: Aggiorna un singolo materiale (titolo, contenuto, etc.).
 * - DELETE: Cancella uno o più materiali.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 1. Autenticazione dell'utente.
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    return res.status(401).json({ error: "Token mancante" });
  }
  const { data: userData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !userData?.user) {
    return res.status(401).json({ error: "Utente non autenticato" });
  }
  const user = userData.user;

  // =================================================================
  // GESTIONE RICHIESTA PUT (Modifica singolo materiale)
  // =================================================================
  if (req.method === "PUT") {
    const { chunk_id, title, section, content } = req.body;

    if (!chunk_id || typeof chunk_id !== "string") {
      return res.status(400).json({ error: "chunk_id è obbligatorio" });
    }

    try {
      // 2. Autorizzazione: Verifica che il materiale appartenga all'utente.
      const { data: chunkData, error: chunkError } = await supabase
        .from("thesis_raw_chunks")
        .select("id, user_id, status")
        .eq("id", chunk_id)
        .eq("user_id", user.id)
        .single();

      if (chunkError || !chunkData) {
        return res.status(404).json({ error: "Materiale non trovato o non autorizzato" });
      }

      // Blocca modifiche se il materiale è in fase di elaborazione.
      if (['in_coda', 'elaborazione'].includes(chunkData.status)) {
        return res.status(400).json({
          error: `Impossibile modificare il contenuto: il materiale è in stato '${chunkData.status}'`
        });
      }

      // 3. Prepara l'oggetto con gli aggiornamenti.
      const updates: { [key: string]: any } = {};
      if (title !== undefined) {
        updates.title = title.trim();
      }
      if (section !== undefined) {
        updates.section = section?.trim() || null;
      }
      if (content !== undefined) {
        const cleanContent = content.trim();
        updates.content = cleanContent;
        updates.char_count = cleanContent.length;
        updates.word_count = cleanContent.split(/\s+/).filter(Boolean).length;
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: "Nessun campo da aggiornare fornito" });
      }
      updates.updated_at = new Date().toISOString();

      // 4. Esegui l'aggiornamento sul database.
      const { data: updatedChunk, error: updateError } = await supabase
        .from("thesis_raw_chunks")
        .update(updates)
        .eq("id", chunk_id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      return res.status(200).json({
        message: "Materiale aggiornato con successo",
        chunk: updatedChunk
      });

    } catch (err: any) {
      console.error("Errore API PUT /thesis-chunks/manage:", err);
      return res.status(500).json({ error: "Errore interno del server", details: err.message });
    }
  }

  // =================================================================
  // GESTIONE RICHIESTA DELETE (Cancellazione di uno o più materiali)
  // =================================================================
  if (req.method === "DELETE") {
    const { chunk_ids } = req.body;

    if (!Array.isArray(chunk_ids) || chunk_ids.length === 0) {
      return res.status(400).json({ error: "chunk_ids deve essere un array non vuoto" });
    }

    try {
      // 2. Autorizzazione: Verifica che tutti i materiali da eliminare appartengano all'utente.
      const { data: chunks, error: chunksError } = await supabase
        .from("thesis_raw_chunks")
        .select("id, status")
        .in("id", chunk_ids)
        .eq("user_id", user.id);

      if (chunksError) throw chunksError;
      if (!chunks || chunks.length !== chunk_ids.length) {
        return res.status(404).json({ error: "Uno o più materiali non trovati o non autorizzati" });
      }

      // Blocca l'eliminazione se alcuni materiali sono in fase di elaborazione.
      const processingChunks = chunks.filter(chunk => ['in_coda', 'elaborazione'].includes(chunk.status));
      if (processingChunks.length > 0) {
        return res.status(400).json({
          error: `Impossibile eliminare ${processingChunks.length} materiali perché sono in fase di elaborazione.`
        });
      }

      // 3. Esegui la cancellazione.
      const { error: deleteError } = await supabase
        .from("thesis_raw_chunks")
        .delete()
        .in("id", chunk_ids);

      if (deleteError) {
        throw deleteError;
      }

      return res.status(200).json({
        message: `${chunk_ids.length} materiali eliminati con successo`,
        deleted_count: chunk_ids.length
      });

    } catch (err: any) {
      console.error("Errore API DELETE /thesis-chunks/manage:", err);
      return res.status(500).json({ error: "Errore interno del server", details: err.message });
    }
  }

  // Se il metodo non è né PUT né DELETE.
  res.status(405).json({ error: "Metodo non consentito" });
}
