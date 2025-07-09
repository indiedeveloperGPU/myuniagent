import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 🔐 AUTENTICAZIONE
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Token mancante" });

  const { data: userData, error } = await supabase.auth.getUser(token);
  if (error || !userData?.user) return res.status(401).json({ error: "Utente non autenticato" });

  const user = userData.user;

  try {
    if (req.method === "PUT") {
      // 🔄 PUT: Aggiorna singolo chunk
      const { chunk_id, title, section, content, status } = req.body;

      if (!chunk_id || typeof chunk_id !== "string") {
        return res.status(400).json({ error: "chunk_id è obbligatorio" });
      }

      // Verifica autorizzazione al chunk
      const { data: chunkData, error: chunkError } = await supabase
        .from("raw_chunks")
        .select("id, user_id, project_id, status")
        .eq("id", chunk_id)
        .eq("user_id", user.id)
        .single();

      if (chunkError || !chunkData) {
        return res.status(404).json({ error: "Chunk non trovato o non autorizzato" });
      }

      // Validazione status se viene aggiornato
      if (status && !['bozza', 'pronto', 'in_coda', 'elaborazione', 'completato', 'errore'].includes(status)) {
        return res.status(400).json({ error: "Status non valido" });
      }

      // Blocca modifiche se chunk è in elaborazione
      if (['in_coda', 'elaborazione'].includes(chunkData.status) && (title || section || content)) {
        return res.status(400).json({ 
          error: `Impossibile modificare contenuto: chunk in stato '${chunkData.status}'` 
        });
      }

      // Prepara aggiornamenti
      const updates: any = {};
      
      if (title !== undefined) {
        if (typeof title !== "string" || title.trim().length < 3) {
          return res.status(400).json({ error: "Titolo deve essere almeno 3 caratteri" });
        }
        updates.title = title.trim().slice(0, 200);
      }

      if (section !== undefined) {
        updates.section = section?.trim() || null;
      }

      if (content !== undefined) {
        if (typeof content !== "string" || content.trim().length < 10) {
          return res.status(400).json({ error: "Contenuto deve essere almeno 10 caratteri" });
        }
        const cleanContent = content.trim();
        if (cleanContent.length > 50000) {
          return res.status(400).json({ 
            error: `Contenuto troppo lungo: ${cleanContent.length} caratteri. Massimo 50.000.`
          });
        }
        updates.content = cleanContent;
        updates.char_count = cleanContent.length;
        updates.word_count = cleanContent.split(/\s+/).length;
      }

      if (status !== undefined) {
        updates.status = status;
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: "Nessun campo da aggiornare fornito" });
      }

      // Esegui aggiornamento
      const { data: updatedChunk, error: updateError } = await supabase
        .from("raw_chunks")
        .update(updates)
        .eq("id", chunk_id)
        .select(`
          id,
          title,
          section,
          page_range,
          order_index,
          word_count,
          char_count,
          status,
          updated_at
        `)
        .single();

      if (updateError) {
        console.error("Errore aggiornamento chunk:", updateError);
        return res.status(500).json({ error: "Errore nell'aggiornamento del chunk" });
      }

      // 📝 LOG ATTIVITÀ
      await supabase.from("attivita").insert({
        user_id: user.id,
        tipo: "chunk_updated",
        dettagli: `Chunk "${updates.title || updatedChunk.title}" aggiornato`,
        creato_il: new Date().toISOString()
      });

      return res.status(200).json({
        chunk: updatedChunk,
        message: "Chunk aggiornato con successo"
      });

    } else if (req.method === "DELETE") {
      // 🗑️ DELETE: Elimina chunks multipli
      const { chunk_ids } = req.body;

      if (!Array.isArray(chunk_ids) || chunk_ids.length === 0) {
        return res.status(400).json({ error: "chunk_ids deve essere un array non vuoto" });
      }

      // Verifica autorizzazione e status
      const { data: chunks, error: chunksError } = await supabase
        .from("raw_chunks")
        .select("id, user_id, title, status")
        .in("id", chunk_ids)
        .eq("user_id", user.id);

      if (chunksError || !chunks || chunks.length === 0) {
        return res.status(404).json({ error: "Chunks non trovati o non autorizzati" });
      }

      if (chunks.length !== chunk_ids.length) {
        return res.status(400).json({ 
          error: `Alcuni chunks non trovati. Trovati ${chunks.length}/${chunk_ids.length}` 
        });
      }

      // Blocca eliminazione di chunks in elaborazione
      const processingChunks = chunks.filter(chunk => 
        ['in_coda', 'elaborazione'].includes(chunk.status)
      );

      if (processingChunks.length > 0) {
        return res.status(400).json({ 
          error: `Impossibile eliminare ${processingChunks.length} chunks in elaborazione`,
          processing_chunks: processingChunks.map(c => ({ id: c.id, title: c.title, status: c.status }))
        });
      }

      // Elimina chunks (CASCADE eliminerà anche batch_results)
      const { error: deleteError } = await supabase
        .from("raw_chunks")
        .delete()
        .in("id", chunk_ids);

      if (deleteError) {
        console.error("Errore eliminazione chunks:", deleteError);
        return res.status(500).json({ error: "Errore nell'eliminazione dei chunks" });
      }

      // 📝 LOG ATTIVITÀ
      await supabase.from("attivita").insert({
        user_id: user.id,
        tipo: "chunks_deleted",
        dettagli: `${chunk_ids.length} chunks eliminati`,
        creato_il: new Date().toISOString()
      });

      return res.status(200).json({
        message: `${chunk_ids.length} chunks eliminati con successo`,
        deleted_count: chunk_ids.length
      });

    } else if (req.method === "POST") {
      // 📋 POST: Operazioni bulk (duplicate, merge, etc.)
      const { action, chunk_ids, target_project_id, merge_config } = req.body;

      if (!action || typeof action !== "string") {
        return res.status(400).json({ error: "Action richiesta" });
      }

      if (!Array.isArray(chunk_ids) || chunk_ids.length === 0) {
        return res.status(400).json({ error: "chunk_ids richiesti" });
      }

      // Verifica autorizzazione ai chunks
      const { data: chunks, error: chunksError } = await supabase
        .from("raw_chunks")
        .select("*")
        .in("id", chunk_ids)
        .eq("user_id", user.id);

      if (chunksError || !chunks || chunks.length === 0) {
        return res.status(404).json({ error: "Chunks non trovati o non autorizzati" });
      }

      switch (action) {
        case "duplicate":
          // Duplica chunks con nuovo titolo
          const duplicatedChunks = chunks.map(chunk => ({
            project_id: chunk.project_id,
            user_id: user.id,
            title: `${chunk.title} (Copia)`,
            section: chunk.section,
            page_range: chunk.page_range,
            order_index: chunk.order_index + 1000, // Metti in fondo
            content: chunk.content,
            word_count: chunk.word_count,
            char_count: chunk.char_count,
            status: 'bozza',
            source_metadata: {
              ...chunk.source_metadata,
              duplicated_from: chunk.id,
              duplicated_at: new Date().toISOString()
            }
          }));

          const { data: newChunks, error: duplicateError } = await supabase
            .from("raw_chunks")
            .insert(duplicatedChunks)
            .select("id, title");

          if (duplicateError) {
            return res.status(500).json({ error: "Errore nella duplicazione" });
          }

          return res.status(201).json({
            message: `${newChunks.length} chunks duplicati`,
            duplicated_chunks: newChunks
          });

        case "move":
          // Sposta chunks a altro progetto
          if (!target_project_id) {
            return res.status(400).json({ error: "target_project_id richiesto per move" });
          }

          // Verifica autorizzazione al progetto target
          const { data: targetProject, error: targetError } = await supabase
            .from("summary_sessions")
            .select("id, user_id, status")
            .eq("id", target_project_id)
            .eq("user_id", user.id)
            .single();

          if (targetError || !targetProject) {
            return res.status(404).json({ error: "Progetto target non trovato o non autorizzato" });
          }

          if (targetProject.status !== 'attivo') {
            return res.status(400).json({ error: "Progetto target non attivo" });
          }

          const { error: moveError } = await supabase
            .from("raw_chunks")
            .update({ project_id: target_project_id })
            .in("id", chunk_ids);

          if (moveError) {
            return res.status(500).json({ error: "Errore nello spostamento" });
          }

          return res.status(200).json({
            message: `${chunk_ids.length} chunks spostati al progetto ${target_project_id}`
          });

        case "merge":
          // Unisce chunks in uno solo
          if (chunks.length < 2) {
            return res.status(400).json({ error: "Servono almeno 2 chunks per il merge" });
          }

          const sortedChunks = chunks.sort((a, b) => a.order_index - b.order_index);
          const mergedContent = sortedChunks.map(chunk => chunk.content).join('\n\n');
          const mergedTitle = merge_config?.title || `${sortedChunks[0].title} (Merged)`;

          if (mergedContent.length > 50000) {
            return res.status(400).json({ 
              error: `Contenuto merged troppo lungo: ${mergedContent.length} caratteri` 
            });
          }

          // Crea nuovo chunk merged
          const { data: mergedChunk, error: mergeError } = await supabase
            .from("raw_chunks")
            .insert({
              project_id: sortedChunks[0].project_id,
              user_id: user.id,
              title: mergedTitle,
              section: merge_config?.section || sortedChunks[0].section,
              page_range: `${sortedChunks[0].page_range || ''}-${sortedChunks[sortedChunks.length - 1].page_range || ''}`,
              order_index: sortedChunks[0].order_index,
              content: mergedContent,
              word_count: mergedContent.split(/\s+/).length,
              char_count: mergedContent.length,
              status: 'bozza',
              source_metadata: {
                merged_from: chunk_ids,
                merged_at: new Date().toISOString(),
                original_chunks_count: chunks.length
              }
            })
            .select("id, title, char_count")
            .single();

          if (mergeError) {
            return res.status(500).json({ error: "Errore nel merge" });
          }

          // Elimina chunks originali se richiesto
          if (merge_config?.delete_originals) {
            await supabase
              .from("raw_chunks")
              .delete()
              .in("id", chunk_ids);
          }

          return res.status(201).json({
            message: `${chunks.length} chunks uniti in uno`,
            merged_chunk: mergedChunk
          });

        default:
          return res.status(400).json({ 
            error: `Action '${action}' non riconosciuta. Azioni disponibili: duplicate, move, merge` 
          });
      }

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
