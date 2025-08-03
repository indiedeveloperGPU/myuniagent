import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

// 🛡️ RATE LIMITING MAP
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minuto
const RATE_LIMIT_MAX_REQUESTS = 30; // 30 richieste per minuto

// 🛡️ RATE LIMITING FUNCTION
function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);
  
  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (userLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }
  
  userLimit.count++;
  return true;
}

// 📊 STRUCTURED LOGGING
function logError(userId: string, action: string, error: any, details?: any) {
  console.error(`[THESIS-CHUNKS] ${new Date().toISOString()} - User: ${userId} - Action: ${action}`, {
    error: error?.message || error,
    details,
    stack: error?.stack
  });
}

function logInfo(userId: string, action: string, details?: any) {
  console.log(`[THESIS-CHUNKS] ${new Date().toISOString()} - User: ${userId} - Action: ${action}`, details);
}

// 🚀 PERFORMANCE UTILITIES
function sanitizeSearchTerm(term: string): string {
  return term.replace(/[%_]/g, '\\$&').trim();
}

function buildSearchQuery(baseQuery: any, searchTerm?: string, statusFilter?: string) {
  let query = baseQuery;
  
  if (searchTerm && searchTerm.trim()) {
    const cleanTerm = sanitizeSearchTerm(searchTerm);
    query = query.or(`title.ilike.%${cleanTerm}%,content.ilike.%${cleanTerm}%,section.ilike.%${cleanTerm}%`);
  }
  
  if (statusFilter && statusFilter !== 'all') {
    query = query.eq('status', statusFilter);
  }
  
  return query;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 🚀 PERFORMANCE: Cache headers
  res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // 🔐 AUTENTICAZIONE
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Token mancante" });

  const { data: userData, error } = await supabase.auth.getUser(token);
  if (error || !userData?.user) return res.status(401).json({ error: "Utente non autenticato" });

  const user = userData.user;

  // 🛡️ RATE LIMITING CHECK
  if (!checkRateLimit(user.id)) {
    logError(user.id, 'rate_limit_exceeded', 'Too many requests');
    return res.status(429).json({ 
      error: "Troppe richieste. Riprova tra un minuto.",
      retry_after: 60 
    });
  }

  try {
    if (req.method === "POST") {
      // 📝 POST: Crea nuovo chunk di tesi
      const { 
        project_id, 
        title, 
        section, 
        page_range, 
        order_index, 
        content, 
        source_metadata 
      } = req.body;

      // Validazioni obbligatorie
      if (!project_id || typeof project_id !== "string") {
        return res.status(400).json({ error: "project_id è obbligatorio" });
      }

      if (!title || typeof title !== "string" || title.trim().length < 3) {
        return res.status(400).json({ error: "Titolo deve essere almeno 3 caratteri" });
      }

      if (!content || typeof content !== "string" || content.trim().length < 10) {
        return res.status(400).json({ error: "Contenuto deve essere almeno 10 caratteri" });
      }

      // Verifica autorizzazione al progetto
      const { data: projectData, error: projectError } = await supabase
        .from("thesis_analysis_sessions")
        .select("id, user_id, status")
        .eq("id", project_id)
        .eq("user_id", user.id)
        .single();

      if (projectError || !projectData) {
        return res.status(404).json({ error: "Progetto non trovato o non autorizzato" });
      }

      // Validazione lunghezza contenuto
      const cleanContent = content.trim();
      if (cleanContent.length > 50000) {
        return res.status(400).json({ 
          error: `Contenuto troppo lungo: ${cleanContent.length} caratteri. Massimo 50.000.`
        });
      }

      // Sanitizzazione e preparazione dati
      const cleanTitle = title.trim().slice(0, 200);
      const cleanSection = section?.trim() || null;
      const cleanPageRange = page_range?.trim() || null;
      const charCount = cleanContent.length;
      const wordCount = cleanContent.split(/\s+/).filter(word => word.length > 0).length;
      
      // Order index: se non fornito, usa il prossimo disponibile
      let finalOrderIndex = order_index || 0;
      if (!order_index) {
        const { data: lastChunk } = await supabase
          .from("thesis_raw_chunks")
          .select("order_index")
          .eq("project_id", project_id)
          .order("order_index", { ascending: false })
          .limit(1)
          .single();
        
        finalOrderIndex = (lastChunk?.order_index || 0) + 1;
      }

      // Validazione source_metadata
      let validSourceMetadata = null;
      if (source_metadata && typeof source_metadata === "object") {
        validSourceMetadata = {
          fileName: source_metadata.fileName || 'unknown',
          fileType: source_metadata.fileType || 'unknown',
          extractionDate: source_metadata.extractionDate || new Date().toISOString(),
          selectionsCount: Number(source_metadata.selectionsCount) || 1,
          hasOCR: Boolean(source_metadata.hasOCR),
          extractionPages: Array.isArray(source_metadata.extractionPages) 
            ? source_metadata.extractionPages.filter((p: any) => typeof p === 'number')
            : []
        };
      }

      // Inserimento nel database
      const { data: newChunk, error: insertError } = await supabase
        .from("thesis_raw_chunks")
        .insert({
          project_id: project_id,
          user_id: user.id,
          title: cleanTitle,
          section: cleanSection,
          page_range: cleanPageRange,
          order_index: finalOrderIndex,
          content: cleanContent,
          char_count: charCount,
          word_count: wordCount,
          status: 'bozza',
          source_metadata: validSourceMetadata
        })
        .select(`
          id,
          title,
          section,
          page_range,
          order_index,
          word_count,
          char_count,
          status,
          created_at
        `)
        .single();

      if (insertError) {
        logError(user.id, 'chunk_insert_failed', insertError, { project_id, title: cleanTitle });
        return res.status(500).json({ 
          error: "Errore nel salvataggio del chunk",
          details: insertError.message 
        });
      }

      // 📝 LOG ATTIVITÀ
      await supabase.from("attivita").insert({
        user_id: user.id,
        tipo: "thesis_chunk_created",
        dettagli: `Chunk "${cleanTitle}" creato nel progetto ${project_id}`,
        creato_il: new Date().toISOString()
      });

      logInfo(user.id, 'chunk_created_success', { 
        chunkId: newChunk.id, 
        title: cleanTitle, 
        charCount, 
        wordCount 
      });

      return res.status(201).json({
        chunk: newChunk,
        message: "💾 Chunk salvato con successo!",
        success: true,
        notification: {
          type: "success",
          title: "Chunk Salvato",
          message: `"${cleanTitle}" è stato salvato nella libreria`,
          duration: 5000
        }
      });

    } else if (req.method === "GET" && req.query.chunk_id) {
      // 🎯 GET SINGOLO CHUNK: Carica contenuto completo solo quando richiesto
      const { chunk_id } = req.query;

      if (!chunk_id || typeof chunk_id !== "string") {
        return res.status(400).json({ error: "chunk_id è obbligatorio" });
      }

      // Verifica autorizzazione al chunk
      const { data: chunk, error: chunkError } = await supabase
        .from("thesis_raw_chunks")
        .select(`
          id,
          title,
          section,
          page_range,
          order_index,
          word_count,
          char_count,
          status,
          content,
          created_at,
          updated_at,
          project_id,
          thesis_analysis_sessions!inner(user_id)
        `)
        .eq("id", chunk_id)
        .eq("thesis_analysis_sessions.user_id", user.id)
        .single();

      if (chunkError || !chunk) {
        return res.status(404).json({ error: "Chunk non trovato o non autorizzato" });
      }

      logInfo(user.id, 'chunk_detail_loaded', { chunkId: chunk_id });

      return res.status(200).json({ chunk });

    } else if (req.method === "GET") {
      // 📋 GET: Lista chunks per progetto CON OTTIMIZZAZIONI
      const { 
        project_id, 
        status, 
        limit = "20", 
        offset = "0", 
        search,
        need_count = "false",
        include_content = "false",
        sort_by = "created_at",
        sort_order = "desc"
      } = req.query;

      if (!project_id || typeof project_id !== "string") {
        return res.status(400).json({ error: "project_id è obbligatorio" });
      }

      // Verifica autorizzazione al progetto
      const { data: projectData, error: projectError } = await supabase
        .from("thesis_analysis_sessions")
        .select("id, user_id")
        .eq("id", project_id)
        .eq("user_id", user.id)
        .single();

      if (projectError || !projectData) {
        return res.status(404).json({ error: "Progetto non trovato o non autorizzato" });
      }

      // 🚀 OTTIMIZZAZIONE: Query differenziate per lista vs dettaglio
      const includeContent = include_content === 'true';
      const selectFields = includeContent 
        ? `id, title, section, page_range, order_index, word_count, char_count, status, created_at, updated_at, content`
        : `id, title, section, page_range, order_index, word_count, char_count, status, created_at, updated_at`;

      // 🚀 PAGINAZIONE INTELLIGENTE
      const limitNum = Math.min(parseInt(limit as string) || 20, 100);
      const offsetNum = Math.max(parseInt(offset as string) || 0, 0);
      const searchTerm = search as string;
      const statusFilter = status as string;

      // 🚀 SORTING OTTIMIZZATO
      const validSortFields = ['created_at', 'updated_at', 'title', 'order_index', 'word_count', 'char_count'];
      const sortField = validSortFields.includes(sort_by as string) ? sort_by as string : 'created_at';
      const sortDirection = sort_order === 'asc' ? true : false;

      // Query builder con filtri
      let query = supabase
        .from("thesis_raw_chunks")
        .select(selectFields)
        .eq("project_id", project_id)
        .eq("user_id", user.id);

      // Applica filtri di ricerca
      query = buildSearchQuery(query, searchTerm, statusFilter);

      // Applica ordinamento e paginazione
      query = query
        .order(sortField, { ascending: sortDirection })
        .range(offsetNum, offsetNum + limitNum - 1);

      const { data: chunks, error: chunksError } = await query;

      if (chunksError) {
        logError(user.id, 'chunks_fetch_failed', chunksError, { project_id });
        return res.status(500).json({ error: "Errore nel recupero dei chunks" });
      }

      // 🚀 COUNT OTTIMIZZATO: Conta solo se necessario
      let totalCount = 0;
      const needCountBool = need_count === 'true';

      if (needCountBool) {
        let countQuery = supabase
          .from("thesis_raw_chunks")
          .select("*", { count: "exact", head: true })
          .eq("project_id", project_id)
          .eq("user_id", user.id);

        // Applica gli stessi filtri del count
        countQuery = buildSearchQuery(countQuery, searchTerm, statusFilter);

        const { count, error: countError } = await countQuery;
        if (countError) {
          logError(user.id, 'count_query_failed', countError, { project_id });
        } else {
          totalCount = count || 0;
        }
      }

      // 🚀 RESPONSE OTTIMIZZATA
      const response = {
        chunks: chunks || [],
        pagination: {
          total: totalCount,
          limit: limitNum,
          offset: offsetNum,
          has_more: needCountBool ? totalCount > offsetNum + limitNum : (chunks?.length || 0) === limitNum,
          current_page: Math.floor(offsetNum / limitNum) + 1,
          total_pages: needCountBool && totalCount > 0 ? Math.ceil(totalCount / limitNum) : 0
        },
        performance: {
          chunk_count: chunks?.length || 0,
          include_content: includeContent,
          filters_applied: {
            search: !!searchTerm,
            status: statusFilter !== 'all' && !!statusFilter,
            sort: `${sortField}_${sort_order}`
          },
          query_time: Date.now()
        }
      };

      logInfo(user.id, 'chunks_list_success', { 
        project_id, 
        count: chunks?.length || 0,
        filters: response.performance.filters_applied
      });

      return res.status(200).json(response);

    } else if (req.method === "PUT") {
      // 🔄 PUT: Aggiorna singolo chunk
      const { chunk_id, title, section, content, status } = req.body;

      if (!chunk_id || typeof chunk_id !== "string") {
        return res.status(400).json({ error: "chunk_id è obbligatorio" });
      }

      // Verifica autorizzazione al chunk
      const { data: chunkData, error: chunkError } = await supabase
        .from("thesis_raw_chunks")
        .select("id, user_id, project_id, status, title")
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
      const updates: any = { updated_at: new Date().toISOString() };
      
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
        updates.word_count = cleanContent.split(/\s+/).filter(word => word.length > 0).length;
      }

      if (status !== undefined) {
        updates.status = status;
      }

      // Esegui aggiornamento
      const { data: updatedChunk, error: updateError } = await supabase
        .from("thesis_raw_chunks")
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
        logError(user.id, 'chunk_update_failed', updateError, { chunk_id });
        return res.status(500).json({ error: "Errore nell'aggiornamento del chunk" });
      }

      // 📝 LOG ATTIVITÀ
      await supabase.from("attivita").insert({
        user_id: user.id,
        tipo: "thesis_chunk_updated",
        dettagli: `Chunk "${updates.title || chunkData.title}" aggiornato`,
        creato_il: new Date().toISOString()
      });

      logInfo(user.id, 'chunk_update_success', { chunk_id });

      return res.status(200).json({
        chunk: updatedChunk,
        message: "Chunk aggiornato con successo"
      });

    } else if (req.method === "DELETE") {
      // 🗑️ DELETE: Elimina chunk (singolo o multiplo)
      const { chunk_id, chunk_ids } = req.body;

      // 🚀 BATCH DELETE: Elimina multipli chunk
      if (chunk_ids && Array.isArray(chunk_ids)) {
        if (chunk_ids.length === 0) {
          return res.status(400).json({ error: "Nessun chunk da eliminare" });
        }

        if (chunk_ids.length > 50) {
          return res.status(400).json({ error: "Massimo 50 chunk per volta" });
        }

        // Verifica autorizzazione per tutti i chunk
        const { data: chunksData, error: chunksError } = await supabase
          .from("thesis_raw_chunks")
          .select("id, user_id, title, status")
          .in("id", chunk_ids)
          .eq("user_id", user.id);

        if (chunksError || !chunksData || chunksData.length !== chunk_ids.length) {
          return res.status(404).json({ error: "Alcuni chunk non sono stati trovati o non autorizzati" });
        }

        // Blocca eliminazione di chunks in elaborazione
        const processingChunks = chunksData.filter(chunk => 
          ['in_coda', 'elaborazione'].includes(chunk.status)
        );

        if (processingChunks.length > 0) {
          return res.status(400).json({ 
            error: `Impossibile eliminare ${processingChunks.length} chunk in elaborazione`,
            processing_chunks: processingChunks.map(c => c.id)
          });
        }

        // Elimina tutti i chunk
        const { error: deleteError } = await supabase
          .from("thesis_raw_chunks")
          .delete()
          .in("id", chunk_ids);

        if (deleteError) {
          logError(user.id, 'batch_delete_failed', deleteError, { chunk_ids });
          return res.status(500).json({ error: "Errore nell'eliminazione dei chunk" });
        }

        // 📝 LOG ATTIVITÀ
        await supabase.from("attivita").insert({
          user_id: user.id,
          tipo: "thesis_chunks_batch_deleted",
          dettagli: `${chunk_ids.length} chunk eliminati`,
          creato_il: new Date().toISOString()
        });

        logInfo(user.id, 'batch_delete_success', { count: chunk_ids.length });

        return res.status(200).json({
          message: `${chunk_ids.length} chunk eliminati con successo`,
          deleted_chunk_ids: chunk_ids
        });

      } else if (chunk_id) {
        // 🗑️ SINGLE DELETE: Elimina singolo chunk
        if (typeof chunk_id !== "string") {
          return res.status(400).json({ error: "chunk_id è obbligatorio" });
        }

        // Verifica autorizzazione e status
        const { data: chunkData, error: chunkError } = await supabase
          .from("thesis_raw_chunks")
          .select("id, user_id, title, status")
          .eq("id", chunk_id)
          .eq("user_id", user.id)
          .single();

        if (chunkError || !chunkData) {
          return res.status(404).json({ error: "Chunk non trovato o non autorizzato" });
        }

        // Blocca eliminazione di chunks in elaborazione
        if (['in_coda', 'elaborazione'].includes(chunkData.status)) {
          return res.status(400).json({ 
            error: `Impossibile eliminare chunk in stato '${chunkData.status}'` 
          });
        }

        // Elimina chunk
        const { error: deleteError } = await supabase
          .from("thesis_raw_chunks")
          .delete()
          .eq("id", chunk_id);

        if (deleteError) {
          logError(user.id, 'chunk_delete_failed', deleteError, { chunk_id });
          return res.status(500).json({ error: "Errore nell'eliminazione del chunk" });
        }

        // 📝 LOG ATTIVITÀ
        await supabase.from("attivita").insert({
          user_id: user.id,
          tipo: "thesis_chunk_deleted",
          dettagli: `Chunk "${chunkData.title}" eliminato`,
          creato_il: new Date().toISOString()
        });

        logInfo(user.id, 'chunk_delete_success', { chunk_id });

        return res.status(200).json({
          message: "Chunk eliminato con successo",
          deleted_chunk_id: chunk_id
        });

      } else {
        return res.status(400).json({ error: "chunk_id o chunk_ids richiesto" });
      }

    } else {
      return res.status(405).json({ error: "Metodo non consentito" });
    }

  } catch (err: any) {
    logError(user?.id || 'unknown', 'general_error', err, { method: req.method, url: req.url });
    return res.status(500).json({ 
      error: "Errore interno del server",
      details: process.env.NODE_ENV === 'development' ? err.message : 'Errore interno'
    });
  }
}