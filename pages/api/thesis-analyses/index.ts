// File: pages/api/thesis-analyses/index.ts
// API per recuperare risultati delle analisi con filtri e paginazione

import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

// 🎯 ENTERPRISE TYPESCRIPT INTERFACES
interface AnalysesRequest {
  project_id?: string;
  analysis_id?: string; // Per singola analisi
  page?: number;
  limit?: number;
  offset?: number;
  search?: string;
  analysis_type?: string;
  has_batch_job?: 'true' | 'false';
  sort_by?: 'created_at' | 'chunk_number' | 'analysis_type';
  sort_order?: 'asc' | 'desc';
  include_previews?: 'true' | 'false';
  need_count?: 'true' | 'false';
}

interface ThesisAnalysisResult {
  id: string;
  session_id: string;
  chunk_number: number;
  analysis_type: string;
  analysis_name: string;
  input_text: string;
  output_analysis: string;
  created_at: string;
  processing_metadata: any;
  batch_job_id?: string;
  input_preview?: string;
  output_preview?: string;
  project_details: {
    title: string;
    level: string;
    faculty: string;
  };
}

interface AnalysesResponse {
  success: boolean;
  analyses?: ThesisAnalysisResult[];
  analysis?: ThesisAnalysisResult; // Per singola analisi
  pagination?: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
  summary?: {
    total_analyses: number;
    unique_types: number;
    batch_analyses: number;
    single_analyses: number;
  };
  error?: string;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

// 🎯 HELPER: Crea preview di testo
function createPreview(text: string, maxLength: number = 200): string {
  if (!text || typeof text !== 'string') return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}

// 🎯 HELPER: Validazione parametri query
function validateQueryParams(query: any): AnalysesRequest {
  const params: AnalysesRequest = {};

  // ID specifici
  if (query.project_id && typeof query.project_id === 'string') {
    params.project_id = query.project_id;
  }
  
  if (query.analysis_id && typeof query.analysis_id === 'string') {
    params.analysis_id = query.analysis_id;
  }

  // Paginazione
  if (query.page) {
    const page = parseInt(query.page);
    if (page > 0) params.page = page;
  }
  
  if (query.limit) {
    const limit = parseInt(query.limit);
    if (limit > 0 && limit <= 100) params.limit = limit;
  }

  if (query.offset) {
    const offset = parseInt(query.offset);
    if (offset >= 0) params.offset = offset;
  }

  // Filtri
  if (query.search && typeof query.search === 'string') {
    params.search = query.search.trim();
  }

  if (query.analysis_type && typeof query.analysis_type === 'string') {
    params.analysis_type = query.analysis_type;
  }

  if (query.has_batch_job && ['true', 'false'].includes(query.has_batch_job)) {
    params.has_batch_job = query.has_batch_job as 'true' | 'false';
  }

  // Ordinamento
  if (query.sort_by && typeof query.sort_by === 'string') {
    const validSortBy = ['created_at', 'chunk_number', 'analysis_type'];
    if (validSortBy.includes(query.sort_by)) {
      params.sort_by = query.sort_by as any;
    }
  }

  if (query.sort_order && ['asc', 'desc'].includes(query.sort_order)) {
    params.sort_order = query.sort_order as 'asc' | 'desc';
  }

  // Opzioni
  if (query.include_previews === 'true') {
    params.include_previews = 'true';
  }

  if (query.need_count === 'true') {
    params.need_count = 'true';
  }

  return params;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AnalysesResponse>
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

    // 🎯 CASO 1: Richiesta di singola analisi
    if (params.analysis_id) {
      const { data: analysisData, error: analysisError } = await supabase
        .from("thesis_analysis_chunks")
        .select(`
          *,
          thesis_analysis_sessions!session_id (
            user_id,
            project_title,
            level,
            faculty
          )
        `)
        .eq("id", params.analysis_id)
        .single();

      if (analysisError || !analysisData) {
        return res.status(404).json({ 
          success: false, 
          error: "Analisi non trovata" 
        });
      }

      // Verifica ownership
      if (analysisData.thesis_analysis_sessions.user_id !== user.id) {
        return res.status(403).json({ 
          success: false, 
          error: "Non autorizzato" 
        });
      }

      const analysis: ThesisAnalysisResult = {
        id: analysisData.id,
        session_id: analysisData.session_id,
        chunk_number: analysisData.chunk_number,
        analysis_type: analysisData.analysis_type,
        analysis_name: getAnalysisName(analysisData.analysis_type),
        input_text: analysisData.input_text,
        output_analysis: analysisData.output_analysis,
        created_at: analysisData.created_at,
        processing_metadata: analysisData.processing_metadata,
        batch_job_id: analysisData.batch_job_id,
        project_details: {
          title: analysisData.thesis_analysis_sessions.project_title,
          level: analysisData.thesis_analysis_sessions.level,
          faculty: analysisData.thesis_analysis_sessions.faculty
        }
      };

      return res.status(200).json({
        success: true,
        analysis
      });
    }

    // 🎯 CASO 2: Lista analisi per progetto
    if (!params.project_id) {
      return res.status(400).json({ 
        success: false, 
        error: "project_id obbligatorio per la lista" 
      });
    }

    // Verifica ownership del progetto
    const { data: sessionData, error: sessionError } = await supabase
      .from("thesis_analysis_sessions")
      .select("user_id")
      .eq("id", params.project_id)
      .single();

    if (sessionError || !sessionData || sessionData.user_id !== user.id) {
      return res.status(403).json({ 
        success: false, 
        error: "Progetto non trovato o non autorizzato" 
      });
    }

    // Defaults per paginazione
    const limit = params.limit || 20;
    const offset = params.offset || 0;
    const sortBy = params.sort_by || 'created_at';
    const sortOrder = params.sort_order || 'desc';

    // 🔍 COSTRUZIONE QUERY BASE
    let query = supabase
      .from("thesis_analysis_chunks")
      .select(`
        *,
        thesis_analysis_sessions!session_id (
          project_title,
          level,
          faculty
        )
      `)
      .eq("session_id", params.project_id);

    // 🔍 APPLICAZIONE FILTRI
    if (params.search) {
      query = query.or(`analysis_type.ilike.%${params.search}%,input_text.ilike.%${params.search}%,output_analysis.ilike.%${params.search}%`);
    }

    if (params.analysis_type) {
      query = query.eq("analysis_type", params.analysis_type);
    }

    if (params.has_batch_job === 'true') {
      query = query.not("batch_job_id", "is", null);
    } else if (params.has_batch_job === 'false') {
      query = query.is("batch_job_id", null);
    }

    // 📊 CONTEGGIO TOTALE (se richiesto)
    let totalCount = 0;
    if (params.need_count === 'true') {
      let countQuery = supabase
        .from("thesis_analysis_chunks")
        .select("*", { count: "exact", head: true })
        .eq("session_id", params.project_id);

      // Applica gli stessi filtri
      if (params.search) {
        countQuery = countQuery.or(`analysis_type.ilike.%${params.search}%,input_text.ilike.%${params.search}%,output_analysis.ilike.%${params.search}%`);
      }

      if (params.analysis_type) {
        countQuery = countQuery.eq("analysis_type", params.analysis_type);
      }

      if (params.has_batch_job === 'true') {
        countQuery = countQuery.not("batch_job_id", "is", null);
      } else if (params.has_batch_job === 'false') {
        countQuery = countQuery.is("batch_job_id", null);
      }

      const { count, error: countError } = await countQuery;
      if (countError) {
        console.error("Errore conteggio:", countError);
      } else {
        totalCount = count || 0;
      }
    }

    // 📋 RECUPERO DATI PAGINATI
    const { data: analysesData, error: analysesError } = await query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1);

    if (analysesError) {
      return res.status(500).json({ 
        success: false, 
        error: "Errore nel recupero delle analisi" 
      });
    }

    // 📊 CALCOLO STATISTICHE (se richiesto)
    let summary;
    if (params.need_count === 'true') {
      const { data: allAnalyses, error: allError } = await supabase
        .from("thesis_analysis_chunks")
        .select("analysis_type, batch_job_id")
        .eq("session_id", params.project_id);

      if (!allError && allAnalyses) {
        const uniqueTypes = new Set(allAnalyses.map(a => a.analysis_type)).size;
        const batchAnalyses = allAnalyses.filter(a => a.batch_job_id).length;
        
        summary = {
          total_analyses: totalCount,
          unique_types: uniqueTypes,
          batch_analyses: batchAnalyses,
          single_analyses: totalCount - batchAnalyses
        };
      }
    }

    // 🎯 TRASFORMAZIONE DATI
    const analyses: ThesisAnalysisResult[] = (analysesData || []).map(analysis => {
      const result: ThesisAnalysisResult = {
        id: analysis.id,
        session_id: analysis.session_id,
        chunk_number: analysis.chunk_number,
        analysis_type: analysis.analysis_type,
        analysis_name: getAnalysisName(analysis.analysis_type),
        input_text: analysis.input_text,
        output_analysis: analysis.output_analysis,
        created_at: analysis.created_at,
        processing_metadata: analysis.processing_metadata,
        batch_job_id: analysis.batch_job_id,
        project_details: {
          title: analysis.thesis_analysis_sessions.project_title,
          level: analysis.thesis_analysis_sessions.level,
          faculty: analysis.thesis_analysis_sessions.faculty
        }
      };

      // Aggiungi preview se richiesti
      if (params.include_previews === 'true') {
        result.input_preview = createPreview(analysis.input_text);
        result.output_preview = createPreview(analysis.output_analysis);
      }

      return result;
    });

    // 📊 CALCOLO PAGINAZIONE
    const totalPages = totalCount > 0 ? Math.ceil(totalCount / limit) : 0;
    const currentPage = Math.floor(offset / limit) + 1;
    const hasNext = offset + limit < totalCount;
    const hasPrev = offset > 0;

    // ✅ RISPOSTA FINALE
    return res.status(200).json({
      success: true,
      analyses,
      pagination: {
        page: currentPage,
        limit,
        total: totalCount,
        total_pages: totalPages,
        has_next: hasNext,
        has_prev: hasPrev
      },
      summary
    });

  } catch (error: any) {
    console.error("[THESIS-ANALYSES] Errore critico:", error);
    return res.status(500).json({
      success: false,
      error: "Errore interno del server"
    });
  }
}
