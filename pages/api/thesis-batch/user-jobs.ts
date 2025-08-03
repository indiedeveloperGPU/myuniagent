// File: pages/api/thesis-batch/user-jobs.ts
// API per listare tutti i batch jobs dell'utente con filtri e paginazione

import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

// 🎯 ENTERPRISE TYPESCRIPT INTERFACES
interface UserJobsRequest {
  page?: number;
  limit?: number;
  status?: string;
  project_id?: string;
  analysis_type?: string;
  sort_by?: 'created_at' | 'completed_at' | 'status' | 'analysis_type';
  sort_order?: 'asc' | 'desc';
}

interface BatchJobSummary {
  id: string;
  project_id: string;
  analysis_type: string;
  analysis_name: string;
  status: string;
  total_chunks: number;
  processed_chunks: number;
  progress_percentage: number;
  created_at: string;
  completed_at: string | null;
  expires_at: string | null;
  results_processed: boolean;
  error_message: string | null;
  time_elapsed: string;
  project_details: {
    title: string;
    level: string;
    faculty: string;
  };
  groq_batch_id: string | null;
}

interface UserJobsResponse {
  success: boolean;
  jobs?: BatchJobSummary[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
  summary?: {
    total_jobs: number;
    active_jobs: number;
    completed_jobs: number;
    failed_jobs: number;
    analyses_created: number;
  };
  error?: string;
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
  
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (diffDays > 0) {
    return `${diffDays}d ${diffHours}h`;
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

// 🎯 HELPER: Validazione parametri query
function validateQueryParams(query: any): UserJobsRequest {
  const params: UserJobsRequest = {};

  // Paginazione
  if (query.page) {
    const page = parseInt(query.page);
    if (page > 0) params.page = page;
  }
  
  if (query.limit) {
    const limit = parseInt(query.limit);
    if (limit > 0 && limit <= 100) params.limit = limit;
  }

  // Filtri
  if (query.status && typeof query.status === 'string') {
    const validStatuses = ['pending', 'validating', 'in_progress', 'finalizing', 'completed', 'failed', 'expired', 'cancelling', 'cancelled'];
    if (validStatuses.includes(query.status)) {
      params.status = query.status;
    }
  }

  if (query.project_id && typeof query.project_id === 'string') {
    params.project_id = query.project_id;
  }

  if (query.analysis_type && typeof query.analysis_type === 'string') {
    params.analysis_type = query.analysis_type;
  }

  // Ordinamento
  if (query.sort_by && typeof query.sort_by === 'string') {
    const validSortBy = ['created_at', 'completed_at', 'status', 'analysis_type'];
    if (validSortBy.includes(query.sort_by)) {
      params.sort_by = query.sort_by as any;
    }
  }

  if (query.sort_order && typeof query.sort_order === 'string') {
    if (['asc', 'desc'].includes(query.sort_order)) {
      params.sort_order = query.sort_order as 'asc' | 'desc';
    }
  }

  return params;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UserJobsResponse>
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

    // 📝 VALIDAZIONE PARAMETRI QUERY
    const params = validateQueryParams(req.query);
    
    // Defaults
    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;
    const sortBy = params.sort_by || 'created_at';
    const sortOrder = params.sort_order || 'desc';

    // 🔍 COSTRUZIONE QUERY BASE
    let query = supabase
      .from("thesis_batch_jobs")
      .select(`
        *,
        thesis_analysis_sessions!project_id (
          project_title,
          level,
          faculty
        )
      `)
      .eq("user_id", user.id);

    // 🔍 APPLICAZIONE FILTRI
    if (params.status) {
      query = query.eq("status", params.status);
    }

    if (params.project_id) {
      query = query.eq("project_id", params.project_id);
    }

    if (params.analysis_type) {
      query = query.eq("analysis_type", params.analysis_type);
    }

    // 📊 CONTEGGIO TOTALE (per paginazione)
let countQuery = supabase
  .from("thesis_batch_jobs")
  .select("*", { count: "exact", head: true })
  .eq("user_id", user.id);

// Applica gli stessi filtri della query principale
if (params.status) {
  countQuery = countQuery.eq("status", params.status);
}

if (params.project_id) {
  countQuery = countQuery.eq("project_id", params.project_id);
}

if (params.analysis_type) {
  countQuery = countQuery.eq("analysis_type", params.analysis_type);
}

const { count: totalCount, error: countError } = await countQuery;

    if (countError) {
      return res.status(500).json({ 
        success: false, 
        error: "Errore nel conteggio dei batch jobs" 
      });
    }

    // 📋 RECUPERO DATI PAGINATI
    const { data: batchJobs, error: jobsError } = await query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1);

    if (jobsError) {
      return res.status(500).json({ 
        success: false, 
        error: "Errore nel recupero dei batch jobs" 
      });
    }

    // 📊 CALCOLO STATISTICHE GLOBALI
    const { data: allJobs, error: allJobsError } = await supabase
      .from("thesis_batch_jobs")
      .select("status, processed_chunks")
      .eq("user_id", user.id);

    if (allJobsError) {
      console.error("Errore recupero statistiche:", allJobsError);
    }

    const summary = {
      total_jobs: totalCount || 0,
      active_jobs: allJobs?.filter(j => ['pending', 'validating', 'in_progress', 'finalizing'].includes(j.status)).length || 0,
      completed_jobs: allJobs?.filter(j => j.status === 'completed').length || 0,
      failed_jobs: allJobs?.filter(j => ['failed', 'expired', 'cancelled'].includes(j.status)).length || 0,
      analyses_created: allJobs?.reduce((sum, j) => sum + (j.processed_chunks || 0), 0) || 0
    };

    // 🎯 TRASFORMAZIONE DATI
    const jobs: BatchJobSummary[] = (batchJobs || []).map(job => {
      // Se il job è completato e processato, forza 100%
const progressPercentage = (job.status === 'completed' && job.results_processed) 
  ? 100 
  : job.total_chunks > 0 
    ? Math.round((job.processed_chunks / job.total_chunks) * 100)
    : 0;

// Se completato e processato, mostra tutti i chunk come elaborati
const displayedProcessedChunks = (job.status === 'completed' && job.results_processed)
  ? job.total_chunks
  : job.processed_chunks;

      const timeElapsed = getTimeElapsed(job.created_at);

      return {
        id: job.id,
        project_id: job.project_id,
        analysis_type: job.analysis_type,
        analysis_name: getAnalysisName(job.analysis_type),
        status: job.status,
        total_chunks: job.total_chunks,
        processed_chunks: displayedProcessedChunks,
        progress_percentage: progressPercentage,
        created_at: job.created_at,
        completed_at: job.completed_at,
        expires_at: job.expires_at,
        results_processed: job.results_processed,
        error_message: job.error_message,
        time_elapsed: timeElapsed,
        project_details: {
          title: job.thesis_analysis_sessions.project_title,
          level: job.thesis_analysis_sessions.level,
          faculty: job.thesis_analysis_sessions.faculty
        },
        groq_batch_id: job.groq_batch_id
      };
    });

    // 📊 CALCOLO PAGINAZIONE
    const totalPages = Math.ceil((totalCount || 0) / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    // ✅ RISPOSTA FINALE
    return res.status(200).json({
      success: true,
      jobs,
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        total_pages: totalPages,
        has_next: hasNext,
        has_prev: hasPrev
      },
      summary
    });

  } catch (error: any) {
    console.error("[BATCH-USER-JOBS] Errore critico:", error);
    return res.status(500).json({
      success: false,
      error: "Errore interno del server"
    });
  }
}
