import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { batchId } = req.query;

  if (!batchId || typeof batchId !== "string") {
    return res.status(400).json({ error: "batchId mancante o non valido" });
  }

  // 🔐 AUTENTICAZIONE
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Token mancante" });

  const { data: userData, error } = await supabase.auth.getUser(token);
  if (error || !userData?.user) return res.status(401).json({ error: "Utente non autenticato" });

  const user = userData.user;

  try {
    if (req.method === "GET") {
      // 📊 GET: Status dettagliato del batch job
      
      // Recupera batch job con info progetto
      const { data: batchJob, error: batchError } = await supabase
        .from("batch_jobs")
        .select(`
          *,
          summary_sessions!inner(
            id,
            project_title,
            facolta,
            materia,
            user_id
          )
        `)
        .eq("id", batchId)
        .single();

      if (batchError || !batchJob) {
        return res.status(404).json({ error: "Batch job non trovato" });
      }

      // Verifica autorizzazione
      if (batchJob.summary_sessions.user_id !== user.id) {
        return res.status(403).json({ error: "Non autorizzato per questo batch job" });
      }

       if (batchJob.status === 'fallito') {
        return res.status(200).json({
          batch_job: {
            id: batchJob.id,
            status: batchJob.status,
            created_at: batchJob.created_at,
            error_details: batchJob.error_details,
            groq_batch_id: batchJob.groq_batch_id
          },
          project: {
            id: batchJob.summary_sessions.id,
            title: batchJob.summary_sessions.project_title,
          },
          progress: { total_chunks: batchJob.total_chunks, failed_chunks: batchJob.total_chunks, completed_chunks: 0, processing_chunks: 0, pending_chunks: 0, progress_percentage: 0 },
          metrics: { actual_cost_usd: 0, total_tokens_used: 0 },
          chunks: [] // Restituisce un array vuoto perché nessun chunk è stato processato
        });
      }

      // Recupera risultati dettagliati
      const { data: batchResults, error: resultsError } = await supabase
        .from("batch_results")
        .select(`
          *,
          raw_chunks!inner(
            id,
            title,
            section,
            char_count,
            order_index
          ),
          summary_chunks(
            id,
            output_summary,
            created_at
          )
        `)
        .eq("batch_job_id", batchId)
        .order("raw_chunks(order_index)", { ascending: true });

      if (resultsError) {
        console.error("Errore recupero batch results:", resultsError);
        return res.status(500).json({ error: "Errore nel recupero dei risultati" });
      }

      // 📊 CALCOLA STATISTICHE PROGRESSO
      const totalChunks = batchJob.total_chunks;
      const completedChunks = batchResults?.filter(r => r.status === 'completato').length || 0;
      const failedChunks = batchResults?.filter(r => r.status === 'fallito').length || 0;
      const processingChunks = batchResults?.filter(r => r.status === 'elaborazione').length || 0;
      const pendingChunks = batchResults?.filter(r => r.status === 'in_attesa').length || 0;

      const progressPercentage = totalChunks > 0 ? Math.round((completedChunks / totalChunks) * 100) : 0;

      // 💰 CALCOLA COSTI EFFETTIVI
      const actualCost = batchResults?.reduce((sum, result) => sum + (result.cost_usd || 0), 0) || 0;
      const totalTokensUsed = batchResults?.reduce((sum, result) => 
        sum + (result.input_tokens || 0) + (result.output_tokens || 0), 0) || 0;

      // ⏱️ CALCOLA TEMPI
      const avgProcessingTime = batchResults?.length > 0 
        ? batchResults.reduce((sum, result) => sum + (result.processing_time_ms || 0), 0) / batchResults.length
        : 0;

      const estimatedTimeRemaining = pendingChunks + processingChunks > 0 && avgProcessingTime > 0
        ? Math.round(((pendingChunks + processingChunks) * avgProcessingTime) / 1000) // secondi
        : null;

      // 🎯 DETERMINA STATUS GENERALE
      let overallStatus = batchJob.status;
      if (batchJob.status === 'elaborazione') {
        if (completedChunks === totalChunks) {
          overallStatus = 'finalizing';
        } else if (failedChunks > 0 && completedChunks + failedChunks === totalChunks) {
          overallStatus = 'completed_with_errors';
        }
      }

      return res.status(200).json({
        batch_job: {
          id: batchJob.id,
          status: overallStatus,
          created_at: batchJob.created_at,
          started_at: batchJob.started_at,
          completed_at: batchJob.completed_at,
          groq_batch_id: batchJob.groq_batch_id,
          groq_batch_status: batchJob.groq_batch_status,
          estimated_cost_usd: batchJob.estimated_cost_usd,
          actual_cost_usd: actualCost,
          estimated_total_tokens: batchJob.estimated_total_tokens,
          processing_config: batchJob.processing_config,
          error_details: batchJob.error_details
        },
        project: {
          id: batchJob.summary_sessions.id,
          title: batchJob.summary_sessions.project_title,
          facolta: batchJob.summary_sessions.facolta,
          materia: batchJob.summary_sessions.materia
        },
        progress: {
          total_chunks: totalChunks,
          completed_chunks: completedChunks,
          failed_chunks: failedChunks,
          processing_chunks: processingChunks,
          pending_chunks: pendingChunks,
          progress_percentage: progressPercentage,
          estimated_time_remaining_seconds: estimatedTimeRemaining
        },
        metrics: {
          actual_cost_usd: actualCost,
          cost_savings_vs_estimate: batchJob.estimated_cost_usd > 0 
            ? ((batchJob.estimated_cost_usd - actualCost) / batchJob.estimated_cost_usd * 100).toFixed(1) + '%'
            : null,
          total_tokens_used: totalTokensUsed,
          avg_processing_time_ms: Math.round(avgProcessingTime)
        },
        chunks: batchResults?.map(result => ({
          id: result.raw_chunk_id,
          title: result.raw_chunks.title,
          section: result.raw_chunks.section,
          char_count: result.raw_chunks.char_count,
          order_index: result.raw_chunks.order_index,
          status: result.status,
          processing_time_ms: result.processing_time_ms,
          input_tokens: result.input_tokens,
          output_tokens: result.output_tokens,
          cost_usd: result.cost_usd,
          error_message: result.error_message,
          retry_count: result.retry_count,
          completed_at: result.completed_at,
          has_result: !!result.summary_chunks
        })) || []
      });

    } else if (req.method === "POST") {
      // 🔄 POST: Azioni sul batch job (cancel, retry, etc.)
      
      const { action, chunk_ids } = req.body;

      if (!action || typeof action !== "string") {
        return res.status(400).json({ error: "Action richiesta" });
      }

      // Verifica autorizzazione
      const { data: batchJob, error: batchError } = await supabase
        .from("batch_jobs")
        .select("id, user_id, status, raw_chunk_ids")
        .eq("id", batchId)
        .eq("user_id", user.id)
        .single();

      if (batchError || !batchJob) {
        return res.status(404).json({ error: "Batch job non trovato o non autorizzato" });
      }

      switch (action) {
        case "cancel":
          if (!['in_coda', 'elaborazione'].includes(batchJob.status)) {
            return res.status(400).json({ 
              error: `Non è possibile cancellare un batch job in stato '${batchJob.status}'` 
            });
          }

          // Aggiorna status a cancelled
          const { error: cancelError } = await supabase
            .from("batch_jobs")
            .update({ 
              status: 'annullato',
              completed_at: new Date().toISOString(),
              error_details: { reason: 'Cancelled by user', timestamp: new Date().toISOString() }
            })
            .eq("id", batchId);

          if (cancelError) {
            return res.status(500).json({ error: "Errore nella cancellazione del batch job" });
          }

          // Reset status chunks a 'bozza'
          await supabase
            .from("raw_chunks")
            .update({ status: 'bozza' })
            .in("id", batchJob.raw_chunk_ids || []);

          return res.status(200).json({ message: "Batch job cancellato con successo" });

        case "retry_failed":
          if (batchJob.status !== 'completato' && batchJob.status !== 'fallito') {
            return res.status(400).json({ 
              error: "Solo batch job completati o falliti possono essere ritentati" 
            });
          }

          // Trova chunks falliti
          const { data: failedResults } = await supabase
            .from("batch_results")
            .select("raw_chunk_id")
            .eq("batch_job_id", batchId)
            .eq("status", "fallito");

          if (!failedResults || failedResults.length === 0) {
            return res.status(400).json({ error: "Nessun chunk fallito da ritentare" });
          }

          // Reset status dei chunks falliti
          const failedChunkIds = failedResults.map(r => r.raw_chunk_id);
          await supabase
            .from("raw_chunks")
            .update({ status: 'pronto' })
            .in("id", failedChunkIds);

          // Reset batch results
          await supabase
            .from("batch_results")
            .update({ 
              status: 'in_attesa',
              error_message: null,
              retry_count: supabase.rpc('increment_retry_count')
            })
            .eq("batch_job_id", batchId)
            .eq("status", "fallito");

          return res.status(200).json({ 
            message: `${failedChunkIds.length} chunks preparati per nuovo tentativo` 
          });

        case "retry_chunks":
          if (!Array.isArray(chunk_ids) || chunk_ids.length === 0) {
            return res.status(400).json({ error: "chunk_ids richiesti per retry specifici" });
          }

          // Reset status specifici chunks
          await supabase
            .from("batch_results")
            .update({ 
              status: 'in_attesa',
              error_message: null,
              retry_count: supabase.rpc('increment_retry_count')
            })
            .eq("batch_job_id", batchId)
            .in("raw_chunk_id", chunk_ids);

          await supabase
            .from("raw_chunks")
            .update({ status: 'pronto' })
            .in("id", chunk_ids);

          return res.status(200).json({ 
            message: `${chunk_ids.length} chunks preparati per nuovo tentativo` 
          });

        default:
          return res.status(400).json({ 
            error: `Action '${action}' non riconosciuta. Azioni disponibili: cancel, retry_failed, retry_chunks` 
          });
      }

    } else {
      return res.status(405).json({ error: "Metodo non consentito" });
    }

  } catch (err: any) {
    console.error("Errore generale nella gestione batch status:", err);
    return res.status(500).json({ 
      error: "Errore interno del server",
      details: err.message 
    });
  }
}
