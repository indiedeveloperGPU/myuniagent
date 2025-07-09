import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { TokenEstimationService } from "@/lib/tokenEstimation";
import { processBatchJob } from '@/lib/groqBatchWorker';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 🎯 CONFIGURAZIONE BATCH PROCESSING
const BATCH_CONFIG = {
  MAX_CHUNKS_PER_BATCH: 50,
  MAX_CHARS_PER_CHUNK: 25000,
  MODEL: "meta-llama/llama-4-maverick-17b-128e-instruct",
  GROQ_BATCH_ENDPOINT: "https://api.groq.com/openai/v1/batches", // Placeholder - da verificare API Groq
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metodo non consentito" });
  }

  // 🔐 AUTENTICAZIONE
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Token mancante" });

  const { data: userData, error } = await supabase.auth.getUser(token);
  if (error || !userData?.user) return res.status(401).json({ error: "Utente non autenticato" });

  const user = userData.user;

  // 📝 VALIDAZIONE INPUT
  const { project_id, chunk_ids, processing_config } = req.body;

  if (!project_id || typeof project_id !== "string") {
    return res.status(400).json({ error: "project_id è obbligatorio" });
  }

  if (!Array.isArray(chunk_ids) || chunk_ids.length === 0) {
    return res.status(400).json({ error: "chunk_ids deve essere un array non vuoto" });
  }

  if (chunk_ids.length > BATCH_CONFIG.MAX_CHUNKS_PER_BATCH) {
    return res.status(400).json({ 
      error: `Troppi chunks selezionati. Massimo ${BATCH_CONFIG.MAX_CHUNKS_PER_BATCH} per batch.`
    });
  }

  try {
    // 🔍 VERIFICA PROGETTO E AUTORIZZAZIONE
    const { data: projectData, error: projectError } = await supabase
      .from("summary_sessions")
      .select("id, user_id, project_title, facolta, materia, status")
      .eq("id", project_id)
      .eq("user_id", user.id)
      .single();

    if (projectError || !projectData) {
      return res.status(404).json({ error: "Progetto non trovato o non autorizzato" });
    }

    if (projectData.status !== 'attivo') {
      return res.status(400).json({ 
        error: `Progetto in stato '${projectData.status}'. Solo progetti attivi possono elaborare batch.` 
      });
    }

    // 📋 RECUPERA E VALIDA I CHUNKS
    const { data: chunks, error: chunksError } = await supabase
      .from("raw_chunks")
      .select(`
        id,
        title,
        section,
        content,
        char_count,
        word_count,
        status,
        order_index
      `)
      .in("id", chunk_ids)
      .eq("project_id", project_id)
      .eq("user_id", user.id);

    if (chunksError || !chunks || chunks.length === 0) {
      return res.status(404).json({ error: "Chunks non trovati o non autorizzati" });
    }

    if (chunks.length !== chunk_ids.length) {
      return res.status(400).json({ 
        error: `Alcuni chunks non sono stati trovati. Trovati ${chunks.length}/${chunk_ids.length}` 
      });
    }

    // 🚦 VALIDAZIONE STATUS CHUNKS
    const invalidChunks = chunks.filter(chunk => 
      !['bozza', 'pronto'].includes(chunk.status)
    );

    if (invalidChunks.length > 0) {
      return res.status(400).json({ 
        error: `${invalidChunks.length} chunks hanno status non valido per l'elaborazione. Solo 'bozza' e 'pronto' sono accettati.`,
        invalid_chunks: invalidChunks.map(c => ({ id: c.id, title: c.title, status: c.status }))
      });
    }

    // 📏 VALIDAZIONE LUNGHEZZA CHUNKS
    const oversizedChunks = chunks.filter(chunk => 
      chunk.char_count > BATCH_CONFIG.MAX_CHARS_PER_CHUNK
    );

    if (oversizedChunks.length > 0) {
      return res.status(400).json({ 
        error: `${oversizedChunks.length} chunks superano il limite di ${BATCH_CONFIG.MAX_CHARS_PER_CHUNK} caratteri`,
        oversized_chunks: oversizedChunks.map(c => ({ 
          id: c.id, 
          title: c.title, 
          char_count: c.char_count 
        }))
      });
    }

    // 🧮 STIMA TOKEN E COSTI
    const tokenService = new TokenEstimationService(BATCH_CONFIG.MODEL);
    let totalEstimatedTokens = 0;
    let totalEstimatedCost = 0;

    for (const chunk of chunks) {
      const estimate = tokenService.estimateRiassuntoTokens(
        chunk.content, 
        projectData.facolta, 
        projectData.materia
      );
      totalEstimatedTokens += estimate.totalInputTokens + estimate.maxOutputTokens;
      totalEstimatedCost += estimate.estimatedCost || 0;
    }

    // 💰 SCONTO BATCH + GROQ (25% secondo la tua info)
    const batchDiscount = 0.5; // 50% sconto batch API
    const groqDiscount = 0.25; // 25% sconto Groq
    const finalEstimatedCost = totalEstimatedCost * (1 - batchDiscount) * (1 - groqDiscount);

    console.log(`🎯 Batch Job Preview:`, {
      chunks: chunks.length,
      total_chars: chunks.reduce((sum, c) => sum + c.char_count, 0),
      estimated_tokens: totalEstimatedTokens,
      raw_cost: totalEstimatedCost,
      final_cost: finalEstimatedCost,
      savings: ((totalEstimatedCost - finalEstimatedCost) / totalEstimatedCost * 100).toFixed(1) + '%'
    });

    // 💾 CREA BATCH JOB
    const batchJobData = {
      user_id: user.id,
      project_id,
      raw_chunk_ids: chunk_ids,
      total_chunks: chunks.length,
      processed_chunks: 0,
      status: 'in_coda',
      estimated_total_tokens: totalEstimatedTokens,
      estimated_cost_usd: finalEstimatedCost,
      processing_config: {
        model: BATCH_CONFIG.MODEL,
        temperature: 0.1,
        max_tokens_per_chunk: 4000,
        batch_discount: batchDiscount,
        groq_discount: groqDiscount,
        facolta: projectData.facolta,
        materia: projectData.materia,
        ...processing_config
      }
    };

    const { data: batchJob, error: batchError } = await supabase
      .from("batch_jobs")
      .insert(batchJobData)
      .select("id, status, estimated_cost_usd, estimated_total_tokens, created_at")
      .single();

    if (batchError) {
      console.error("Errore creazione batch job:", batchError);
      return res.status(500).json({ 
        error: "Errore nella creazione del batch job",
        details: batchError.message 
      });
    }

    // 🔄 AGGIORNA STATUS CHUNKS A 'IN_CODA'
    const { error: statusUpdateError } = await supabase
      .from("raw_chunks")
      .update({ status: 'in_coda' })
      .in("id", chunk_ids);

    if (statusUpdateError) {
      console.error("Errore aggiornamento status chunks:", statusUpdateError);
      // Non è critico, continua
    }

    // 🎯 CREA BATCH_RESULTS ENTRIES
    const batchResultsData = chunk_ids.map(chunkId => ({
      batch_job_id: batchJob.id,
      raw_chunk_id: chunkId,
      status: 'in_attesa'
    }));

    const { error: resultsError } = await supabase
      .from("batch_results")
      .insert(batchResultsData);

    if (resultsError) {
      console.error("Errore creazione batch results:", resultsError);
      // Rollback del batch job se critico
      await supabase.from("batch_jobs").delete().eq("id", batchJob.id);
      return res.status(500).json({ 
        error: "Errore nella configurazione del batch job"
      });
    }

    // 📝 LOG ATTIVITÀ
    await supabase.from("attivita").insert({
      user_id: user.id,
      tipo: "batch_queued",
      dettagli: `Batch job creato per ${chunks.length} chunks nel progetto "${projectData.project_title}"`,
      creato_il: new Date().toISOString()
    });

    // 🚀 AVVIA ELABORAZIONE BATCH (asincrono)
    // Nota: Qui dovresti triggare il processore batch che gestisce Groq API
    processBatchJob(batchJob.id);

    // ✅ RISPOSTA SUCCESS
    return res.status(201).json({
      batch_job: batchJob,
      project_info: {
        id: projectData.id,
        title: projectData.project_title,
        facolta: projectData.facolta,
        materia: projectData.materia
      },
      chunks_info: {
        count: chunks.length,
        total_chars: chunks.reduce((sum, c) => sum + c.char_count, 0),
        titles: chunks.map(c => c.title)
      },
      cost_estimate: {
        raw_cost_usd: totalEstimatedCost,
        final_cost_usd: finalEstimatedCost,
        savings_percentage: ((totalEstimatedCost - finalEstimatedCost) / totalEstimatedCost * 100).toFixed(1),
        estimated_tokens: totalEstimatedTokens
      }
    });

  } catch (err: any) {
    console.error("Errore generale nella creazione batch job:", err);
    return res.status(500).json({ 
      error: "Errore interno del server",
      details: err.message 
    });
  }
}
