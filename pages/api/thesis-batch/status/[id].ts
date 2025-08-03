// File: pages/api/thesis-batch/status/[id].ts
// API per controllare lo stato di un batch job di analisi tesi

import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { checkThesisBatchStatus } from "@/lib/groqThesisBatchWorker";

// 🎯 ENTERPRISE TYPESCRIPT INTERFACES
interface BatchStatusResponse {
  success: boolean;
  batch_job_id?: string;
  status?: string;
  progress?: {
    total_chunks: number;
    processed_chunks: number;
    percentage: number;
  };
  timing?: {
    created_at: string;
    time_elapsed: string;
  };
  details?: {
    analysis_type: string;
    project_title: string;
    project_level: string;
    groq_batch_id?: string;
    expires_at?: string;
    completed_at?: string;
    results_processed?: boolean;
  };
  metadata?: {
    groq_request_counts?: any;
    groq_errors?: any;
    last_updated: string;
  };
  error?: string;
  message?: string;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 🎯 HELPER: Calcola tempo trascorso
function getTimeElapsed(createdAt: string): string {
  const now = new Date();
  const created = new Date(createdAt);
  const diffMs = now.getTime() - created.getTime();
  
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (diffHours > 0) {
    return `${diffHours}h ${diffMinutes}m`;
  } else {
    return `${diffMinutes}m`;
  }
}

// 🎯 HELPER: Ottieni messaggio di stato user-friendly
function getStatusMessage(status: string, processedChunks: number, totalChunks: number): string {
  switch (status) {
    case 'pending':
      return "Job in attesa di essere processato...";
    case 'validating':
      return "Groq sta validando il batch job...";
    case 'in_progress':
      return `Analisi in corso... (${processedChunks}/${totalChunks} chunk processati)`;
    case 'finalizing':
      return "Groq sta finalizzando i risultati...";
    case 'completed':
      return `Analisi completata! ${processedChunks}/${totalChunks} chunk processati con successo.`;
    case 'failed':
      return "Analisi fallita. Controlla i dettagli dell'errore.";
    case 'expired':
      return "Batch job scaduto dopo 24h. Riprova con un nuovo job.";
    case 'cancelling':
      return "Cancellazione in corso...";
    case 'cancelled':
      return "Batch job cancellato dall'utente.";
    default:
      return `Stato sconosciuto: ${status}`;
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
  res: NextApiResponse<BatchStatusResponse>
) {
  if (req.method !== "GET") {
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

    // 🔄 AGGIORNA STATO DA GROQ (se necessario)
    let updatedStatus = batchJob.status;
    let groqMetadata = batchJob.metadata || {};

    // Solo se il job è in uno stato "attivo" e abbiamo un groq_batch_id
    if (batchJob.groq_batch_id && ['validating', 'in_progress', 'finalizing'].includes(batchJob.status)) {
      try {
        console.log(`[BATCH-STATUS] Aggiornamento stato da Groq per job ${batchJobId}`);
        
        const groqStatusResult = await checkThesisBatchStatus(batchJobId);
        updatedStatus = groqStatusResult.status;
        groqMetadata = {
          ...groqMetadata,
          groq_request_counts: groqStatusResult.request_counts,
          groq_errors: groqStatusResult.errors,
          last_status_check: new Date().toISOString(),
        };
        
        console.log(`[BATCH-STATUS] Stato aggiornato per job ${batchJobId}: ${updatedStatus}`);
      } catch (groqError) {
        console.error(`[BATCH-STATUS] Errore aggiornamento stato Groq per job ${batchJobId}:`, groqError);
        // Non bloccare la risposta per errori Groq, usa lo stato dal DB
      }
    }

    // 🎯 CALCOLO PROGRESSO
    const progressPercentage = batchJob.total_chunks > 0 
      ? Math.round((batchJob.processed_chunks / batchJob.total_chunks) * 100)
      : 0;

    // 📊 TIMING CALCULATIONS
    const timeElapsed = getTimeElapsed(batchJob.created_at);

    // 📋 COSTRUZIONE RISPOSTA
    const response: BatchStatusResponse = {
      success: true,
      batch_job_id: batchJob.id,
      status: updatedStatus,
      progress: {
        total_chunks: batchJob.total_chunks,
        processed_chunks: batchJob.processed_chunks,
        percentage: progressPercentage
      },
      timing: {
        created_at: batchJob.created_at,
        time_elapsed: timeElapsed
      },
      details: {
        analysis_type: getAnalysisName(batchJob.analysis_type),
        project_title: batchJob.thesis_analysis_sessions.project_title,
        project_level: batchJob.thesis_analysis_sessions.level,
        ...(batchJob.groq_batch_id && { groq_batch_id: batchJob.groq_batch_id }),
        ...(batchJob.expires_at && { expires_at: batchJob.expires_at }),
        ...(batchJob.completed_at && { completed_at: batchJob.completed_at }),
        results_processed: batchJob.results_processed
      },
      metadata: {
        ...groqMetadata,
        last_updated: new Date().toISOString()
      },
      message: getStatusMessage(updatedStatus, batchJob.processed_chunks, batchJob.total_chunks)
    };

    // 🚨 AGGIUNGI ERRORE SE PRESENTE
    if (batchJob.error_message) {
      response.error = batchJob.error_message;
    }

    // 📊 LOG PER DEBUG
    console.log(`[BATCH-STATUS] Job ${batchJobId} - Stato: ${updatedStatus}, Progresso: ${progressPercentage}%, Tempo: ${timeElapsed}`);

    // ✅ RISPOSTA FINALE
    return res.status(200).json(response);

  } catch (error: any) {
    console.error("[BATCH-STATUS] Errore critico:", error);
    return res.status(500).json({
      success: false,
      error: "Errore interno del server"
    });
  }
}
