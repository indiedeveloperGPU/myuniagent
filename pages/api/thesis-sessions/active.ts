import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

// 🎯 ENTERPRISE TYPESCRIPT INTERFACES
interface ThesisAnalysisChunk {
  id: string;
  analysis_type: string;
  chunk_number: number;
  created_at: string;
}

interface ThesisAnalysisSession {
  id: string;
  user_id: string;
  project_title: string;
  faculty: string;
  thesis_topic: string;
  level: 'triennale' | 'magistrale' | 'dottorato';
  status: 'active' | 'completed' | 'abandoned';
  is_public: boolean;
  created_at: string;
  completed_at: string | null;
  final_analysis_id: string | null;
  processing_metadata: Record<string, any> | null;
  thesis_analysis_chunks?: ThesisAnalysisChunk[];
}

interface SessionStats {
  completed_analyses: number;
  expected_analyses: number;
  completion_percentage: number;
  remaining_analyses: number;
  completed_analysis_types: string[];
  remaining_analysis_types: string[];
  days_since_creation: number;
  days_since_last_activity: number;
  is_stale: boolean;
  estimated_completion_time: string;
}

interface SessionWithStats extends Omit<ThesisAnalysisSession, 'thesis_analysis_chunks'> {
  stats: SessionStats;
}

interface GlobalStats {
  total_active_sessions: number;
  total_completed_analyses: number;
  total_expected_analyses: number;
  average_completion_percentage: number;
  stale_sessions_count: number;
}

interface ActiveSessionsResponse {
  sessions: SessionWithStats[];
  global_stats: GlobalStats;
  message: string;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(
  req: NextApiRequest, 
  res: NextApiResponse<ActiveSessionsResponse | { error: string; details?: string }>
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Metodo non consentito" });
  }

  // 🔐 AUTENTICAZIONE
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Token mancante" });

  const { data: userData, error } = await supabase.auth.getUser(token);
  if (error || !userData?.user) return res.status(401).json({ error: "Utente non autenticato" });

  try {
    // 🔍 RECUPERA SESSIONI ATTIVE CON STATISTICHE CHUNKS
    const { data: sessions, error: selectError } = await supabase
      .from("thesis_analysis_sessions")
      .select(`
        *,
        thesis_analysis_chunks(
          id,
          analysis_type,
          chunk_number,
          created_at
        )
      `)
      .eq("user_id", userData.user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (selectError) {
      console.error("Errore recupero sessioni tesi attive:", selectError);
      throw selectError;
    }

    // 📊 PROCESSA RISULTATI CON STATISTICHE ENTERPRISE
    const sessionsWithStats: SessionWithStats[] = (sessions as ThesisAnalysisSession[])?.map(session => {
      const chunks: ThesisAnalysisChunk[] = session.thesis_analysis_chunks || [];
      const expectedCount = getExpectedAnalysesCount(session.level);
      const completedCount = chunks.length;
      const completionPercentage = expectedCount > 0 ? Math.round((completedCount / expectedCount) * 100) : 0;

      // 📈 Analisi tipi completate
      const completedAnalysisTypes = chunks.map((chunk: ThesisAnalysisChunk) => chunk.analysis_type);
      const remainingAnalysisTypes = getExpectedAnalysisTypes(session.level)
        .filter(type => !completedAnalysisTypes.includes(type));

      // ⏱️ Statistiche temporali
      const createdAt = new Date(session.created_at);
      const lastActivity = chunks.length > 0 
        ? new Date(Math.max(...chunks.map((c: ThesisAnalysisChunk) => new Date(c.created_at).getTime())))
        : createdAt;
      
      const daysSinceCreation = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
      const daysSinceLastActivity = Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));

      // 🧹 Rimuovi chunks nested per response più pulita
      const { thesis_analysis_chunks, ...sessionWithoutChunks } = session;

      return {
        ...sessionWithoutChunks,
        
        // 📊 Statistiche aggregate
        stats: {
          completed_analyses: completedCount,
          expected_analyses: expectedCount,
          completion_percentage: completionPercentage,
          remaining_analyses: expectedCount - completedCount,
          completed_analysis_types: completedAnalysisTypes,
          remaining_analysis_types: remainingAnalysisTypes,
          days_since_creation: daysSinceCreation,
          days_since_last_activity: daysSinceLastActivity,
          is_stale: daysSinceLastActivity > 7, // Progetto inattivo da > 7 giorni
          estimated_completion_time: estimateCompletionTime(completedCount, expectedCount, daysSinceCreation)
        }
      };
    }) || [];

    console.log(`📊 Recuperate ${sessionsWithStats.length} sessioni tesi attive per utente ${userData.user.id}`);
    
    // 📈 Statistiche globali utente
    const globalStats: GlobalStats = {
      total_active_sessions: sessionsWithStats.length,
      total_completed_analyses: sessionsWithStats.reduce((sum, s) => sum + s.stats.completed_analyses, 0),
      total_expected_analyses: sessionsWithStats.reduce((sum, s) => sum + s.stats.expected_analyses, 0),
      average_completion_percentage: sessionsWithStats.length > 0 
        ? Math.round(sessionsWithStats.reduce((sum, s) => sum + s.stats.completion_percentage, 0) / sessionsWithStats.length)
        : 0,
      stale_sessions_count: sessionsWithStats.filter(s => s.stats.is_stale).length
    };
    
    res.status(200).json({
      sessions: sessionsWithStats,
      global_stats: globalStats,
      message: `${sessionsWithStats.length} progetti di analisi tesi attivi trovati`
    });

  } catch (error: any) {
    console.error("Errore recupero sessioni tesi attive:", error);
    res.status(500).json({ 
      error: "Errore interno del server", 
      details: error.message 
    });
  }
}

// 🎯 HELPER: Conteggio analisi attese per livello
function getExpectedAnalysesCount(level: 'triennale' | 'magistrale' | 'dottorato'): number {
  switch (level) {
    case 'triennale': return 8;
    case 'magistrale': return 12;
    case 'dottorato': return 16;
    default: return 0;
  }
}

// 🎯 HELPER: Tipi di analisi attesi per livello
function getExpectedAnalysisTypes(level: 'triennale' | 'magistrale' | 'dottorato'): string[] {
  const baseTypes = [
    'analisi_strutturale',
    'analisi_metodologica', 
    'analisi_contenuti',
    'analisi_bibliografica',
    'analisi_formale'
  ];

  if (level === 'triennale') {
    return [
      ...baseTypes,
      'analisi_coerenza_argomentativa',
      'analisi_originalita_contributo',
      'analisi_rilevanza_disciplinare'
    ];
  }

  if (level === 'magistrale') {
    return [
      'analisi_strutturale_avanzata',
      'analisi_metodologica_rigorosa',
      'analisi_contenuti_specialistici',
      'analisi_critica_sintetica',
      'analisi_bibliografica_completa',
      'analisi_empirica_sperimentale',
      'analisi_implicazioni',
      'analisi_innovazione_metodologica',
      'analisi_validita_statistica',
      'analisi_applicabilita_pratica',
      'analisi_limiti_criticita',
      'analisi_posizionamento_teorico'
    ];
  }

  if (level === 'dottorato') {
    return [
      'analisi_originalita_scientifica',
      'analisi_metodologica_frontiera',
      'analisi_stato_arte_internazionale',
      'analisi_framework_teorico',
      'analisi_empirica_avanzata',
      'analisi_critica_profonda',
      'analisi_impatto_scientifico',
      'analisi_riproducibilita',
      'analisi_standard_internazionali',
      'analisi_significativita_statistica',
      'analisi_etica_ricerca',
      'analisi_sostenibilita_metodologica',
      'analisi_interdisciplinarieta',
      'analisi_scalabilita_risultati',
      'analisi_pubblicabilita_internazionale',
      'analisi_gap_conoscenza_colmato'
    ];
  }

  return [];
}

// 🎯 HELPER: Stima tempo completamento
function estimateCompletionTime(completed: number, expected: number, daysSinceStart: number): string {
  if (completed === 0) return "Non stimabile";
  if (completed === expected) return "Completato";
  
  const averageDaysPerAnalysis = daysSinceStart / completed;
  const remainingAnalyses = expected - completed;
  const estimatedDaysRemaining = Math.ceil(remainingAnalyses * averageDaysPerAnalysis);
  
  if (estimatedDaysRemaining <= 1) return "Entro 1 giorno";
  if (estimatedDaysRemaining <= 7) return `Entro ${estimatedDaysRemaining} giorni`;
  if (estimatedDaysRemaining <= 30) return `Entro ${Math.ceil(estimatedDaysRemaining / 7)} settimane`;
  
  return `Entro ${Math.ceil(estimatedDaysRemaining / 30)} mesi`;
}
