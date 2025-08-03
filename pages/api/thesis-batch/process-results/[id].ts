// File: pages/api/thesis-batch/process-results/[id].ts
// API per processare i risultati di un batch job completato

import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { handleThesisBatchCompletion } from "@/lib/groqThesisBatchWorker";

// 🎯 ENTERPRISE TYPESCRIPT INTERFACES
interface ProcessResultsResponse {
  success: boolean;
  batch_job_id?: string;
  status?: string;
  results?: {
    total_chunks: number;
    processed_chunks: number;
    success_count: number;
    error_count: number;
    results_processed: boolean;
  };
  timing?: {
    completed_at?: string;
    processing_duration?: string;
  };
  details?: {
    analysis_type: string;
    project_title: string;
    analyses_created: number;
    groq_batch_id?: string;
  };
  error?: string;
  message?: string;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 🎯 HELPER: Calcola durata processing
function getProcessingDuration(createdAt: string, completedAt: string): string {
  const created = new Date(createdAt);
  const completed = new Date(completedAt);
  const diffMs = completed.getTime() - created.getTime();
  
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (diffDays > 0) {
    return `${diffDays}d ${diffHours}h ${diffMinutes}m`;
  } else if (diffHours > 0) {
    return `${diffHours}h ${diffMinutes}m`;
  } else {
    return `${diffMinutes}m`;
  }
}

// 🎯 HELPER: Ottieni nome leggibile per tipo di analisi
function getAnalysisName(analysisType: string): string {
  const nameMap: Record<string, string> = {
    'analisi_strutturale': 'Analisi Strutturale',
    'analisi_metodologica': 'Analisi Metodologica',
    'analisi_contenuti': 'Analisi dei Contenuti',
    'analisi_bibliografica': 'Analisi Bibliografica',
    'analisi_formale': 'Analisi Formale',
    'analisi_coerenza_argomentativa': 'Coerenza Argomentativa',
    'analisi_originalita_contributo': 'Originalità del Contributo',
    'analisi_rilevanza_disciplinare': 'Rilevanza Disciplinare',
    'analisi_strutturale_avanzata': 'Strutturale Avanzata',
    'analisi_metodologica_rigorosa': 'Metodologica Rigorosa',
    'analisi_contenuti_specialistici': 'Contenuti Specialistici',
    'analisi_critica_sintetica': 'Critica e Sintetica',
    'analisi_bibliografica_completa': 'Bibliografica Completa',
    'analisi_empirica_sperimentale': 'Empirica/Sperimentale',
    'analisi_implicazioni': 'Delle Implicazioni',
    'analisi_innovazione_metodologica': 'Innovazione Metodologica',
    'analisi_validita_statistica': 'Validità Statistica',
    'analisi_applicabilita_pratica': 'Applicabilità Pratica',
    'analisi_limiti_criticita': 'Limiti e Criticità',
    'analisi_posizionamento_teorico': 'Posizionamento Teorico',
    'analisi_originalita_scientifica': 'Originalità Scientifica',
    'analisi_metodologica_frontiera': 'Metodologica di Frontiera',
    'analisi_stato_arte_internazionale': 'Stato dell\'Arte Internazionale',
    'analisi_framework_teorico': 'Framework Teorico',
    'analisi_empirica_avanzata': 'Empirica Avanzata',
    'analisi_critica_profonda': 'Critica Profonda',
    'analisi_impatto_scientifico': 'Impatto Scientifico',
    'analisi_riproducibilita': 'Riproducibilità',
    'analisi_standard_internazionali': 'Standard Internazionali',
    'analisi_significativita_statistica': 'Significatività Statistica',
    'analisi_etica_ricerca': 'Etica della Ricerca',
    'analisi_sostenibilita_metodologica': 'Sostenibilità Metodologica',
    'analisi_interdisciplinarieta': 'Interdisciplinarità',
    'analisi_scalabilita_risultati': 'Scalabilità Risultati',
    'analisi_pubblicabilita_internazionale': 'Pubblicabilità Internazionale',
    'analisi_gap_conoscenza_colmato': 'Gap di Conoscenza'
  };

  return nameMap[analysisType] || analysisType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ProcessResultsResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ 
      success: false, 
      error: "Metodo non consentito" 
    });
  }

  try {
    // 🔐 AUTENTICAZIONE
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: "Token di autenticazione mancante" 
      });
    }

    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData?.user) {
      return res.status(401).json({ 
        success: false, 
        error: "Utente non autenticato" 
      });
    }

    const user = userData.user;

    // 📝 VALIDAZIONE PARAMETRI
    const { id: batchJobId } = req.query;
    
    if (!batchJobId || typeof batchJobId !== "string") {
      return res.status(400).json({ 
        success: false, 
        error: "ID batch job mancante o non valido" 
      });
    }

    // 🔍 RECUPERA BATCH JOB DAL DATABASE
    const { data: batchJob, error: jobError } = await supabase
      .from("thesis_batch_jobs")
      .select(`
        *,
        thesis_analysis_sessions!project_id (
          project_title,
          level,
          faculty,
          thesis_topic
        )
      `)
      .eq("id", batchJobId)
      .eq("user_id", user.id)
      .single();

    if (jobError || !batchJob) {
      return res.status(404).json({ 
        success: false, 
        error: "Batch job non trovato o non autorizzato" 
      });
    }

    // 🔍 CONTROLLO STATO BATCH JOB
    if (!batchJob.groq_batch_id) {
      return res.status(400).json({ 
        success: false, 
        error: "Batch job non ha ancora un ID Groq associato" 
      });
    }

    // Se già processato, ritorna i dati esistenti
    if (batchJob.results_processed) {
      console.log(`[BATCH-PROCESS] Job ${batchJobId} già processato, ritorno dati esistenti`);
      
      // Conta le analisi create da questo batch
      const { count: analysesCount } = await supabase
        .from("thesis_analysis_chunks")
        .select("*", { count: "exact", head: true })
        .eq("batch_job_id", batchJobId);

      const processingDuration = batchJob.completed_at 
        ? getProcessingDuration(batchJob.created_at, batchJob.completed_at)
        : "N/A";

      return res.status(200).json({
        success: true,
        batch_job_id: batchJob.id,
        status: batchJob.status,
        results: {
          total_chunks: batchJob.total_chunks,
          processed_chunks: batchJob.processed_chunks,
          success_count: batchJob.metadata?.success_count || batchJob.processed_chunks,
          error_count: batchJob.metadata?.error_count || 0,
          results_processed: true
        },
        timing: {
          completed_at: batchJob.completed_at,
          processing_duration: processingDuration
        },
        details: {
          analysis_type: getAnalysisName(batchJob.analysis_type),
          project_title: batchJob.thesis_analysis_sessions.project_title,
          analyses_created: analysesCount || 0,
          groq_batch_id: batchJob.groq_batch_id
        },
        message: "Risultati già processati e disponibili"
      });
    }

    // 🔍 CONTROLLO STATO PRIMA DEL PROCESSING
    if (!['completed', 'failed'].includes(batchJob.status)) {
      return res.status(400).json({ 
        success: false, 
        error: `Batch job non pronto per il processing. Stato attuale: ${batchJob.status}` 
      });
    }

    // 🚀 AVVIA PROCESSING DEI RISULTATI
    console.log(`[BATCH-PROCESS] Avvio processing risultati per batch job ${batchJobId}`);

    try {
      // Chiama il worker per processare i risultati
      await handleThesisBatchCompletion(batchJobId);
      
      console.log(`[BATCH-PROCESS] Processing completato per batch job ${batchJobId}`);
      
    } catch (processingError: any) {
      console.error(`[BATCH-PROCESS] Errore durante processing batch job ${batchJobId}:`, processingError);
      
      // Aggiorna lo stato del batch job con l'errore
      await supabase
        .from("thesis_batch_jobs")
        .update({
          status: 'failed',
          error_message: `Processing fallito: ${processingError.message}`,
          completed_at: new Date().toISOString()
        })
        .eq("id", batchJobId);

      return res.status(500).json({
        success: false,
        error: "Errore durante il processing dei risultati",
        details: {
          analysis_type: getAnalysisName(batchJob.analysis_type),
          project_title: batchJob.thesis_analysis_sessions.project_title,
          analyses_created: 0,
          groq_batch_id: batchJob.groq_batch_id
        }
      });
    }

    // 📊 RECUPERA DATI AGGIORNATI DOPO IL PROCESSING
    const { data: updatedBatchJob, error: updateError } = await supabase
      .from("thesis_batch_jobs")
      .select(`
        *,
        thesis_analysis_sessions!project_id (
          project_title,
          level,
          faculty,
          thesis_topic
        )
      `)
      .eq("id", batchJobId)
      .single();

    if (updateError || !updatedBatchJob) {
      return res.status(500).json({ 
        success: false, 
        error: "Errore recupero dati aggiornati dopo processing" 
      });
    }

    // 📊 CONTA LE ANALISI CREATE
    const { count: analysesCount, error: countError } = await supabase
      .from("thesis_analysis_chunks")
      .select("*", { count: "exact", head: true })
      .eq("batch_job_id", batchJobId);

    if (countError) {
      console.error(`[BATCH-PROCESS] Errore conteggio analisi create:`, countError);
    }

    // 📊 CALCOLA STATISTICHE
    const successCount = updatedBatchJob.metadata?.success_count || updatedBatchJob.processed_chunks;
    const errorCount = updatedBatchJob.metadata?.error_count || 0;
    const totalProcessed = successCount + errorCount;

    const processingDuration = updatedBatchJob.completed_at 
      ? getProcessingDuration(updatedBatchJob.created_at, updatedBatchJob.completed_at)
      : "N/A";

    // 📊 REGISTRA ATTIVITÀ
    await supabase.from("attivita").insert({
      user_id: user.id,
      tipo: "thesis_batch_processed",
      dettagli: `Risultati processati per batch job "${getAnalysisName(batchJob.analysis_type)}" - ${analysesCount} analisi create`,
      creato_il: new Date().toISOString()
    });

    // ✅ RISPOSTA SUCCESSO
    return res.status(200).json({
      success: true,
      batch_job_id: updatedBatchJob.id,
      status: updatedBatchJob.status,
      results: {
        total_chunks: updatedBatchJob.total_chunks,
        processed_chunks: updatedBatchJob.processed_chunks,
        success_count: successCount,
        error_count: errorCount,
        results_processed: updatedBatchJob.results_processed
      },
      timing: {
        completed_at: updatedBatchJob.completed_at,
        processing_duration: processingDuration
      },
      details: {
        analysis_type: getAnalysisName(updatedBatchJob.analysis_type),
        project_title: updatedBatchJob.thesis_analysis_sessions.project_title,
        analyses_created: analysesCount || 0,
        groq_batch_id: updatedBatchJob.groq_batch_id
      },
      message: `Processing completato! ${analysesCount} analisi create da ${totalProcessed} chunk processati.`
    });

  } catch (error: any) {
    console.error("[BATCH-PROCESS] Errore critico:", error);
    return res.status(500).json({
      success: false,
      error: "Errore interno del server"
    });
  }
}
