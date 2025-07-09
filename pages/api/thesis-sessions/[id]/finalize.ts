// File: pages/api/thesis-sessions/[id]/finalize.ts
// API per finalizzare progetti di analisi tesi multi-parte

import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

// 🎯 ENTERPRISE TYPESCRIPT INTERFACES
interface ThesisAnalysisChunk {
  id: string;
  session_id: string;
  chunk_number: number;
  analysis_type: string;
  input_text: string;
  output_analysis: string;
  created_at: string;
  processing_metadata: Record<string, any> | null;
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
}

interface ThesisAnalysisGenerated {
  id: string;
  user_id: string;
  session_id: string;
  titolo: string;
  input: string;
  output: string;
  faculty: string;
  thesis_topic: string;
  level: string;
  is_public: boolean;
  creato_il: string;
  processing_metadata: Record<string, any>;
}

interface FinalizeResponse {
  final_analysis: ThesisAnalysisGenerated;
  chunks_count: number;
  total_characters: number;
  compression_ratio: number;
  analysis_quality_score: number;
  completion_time_days: number;
  message: string;
}

type ApiResponse = FinalizeResponse | { error: string; details?: string };

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metodo non consentito" });
  }

  const { id } = req.query;
  
  // 🔐 AUTENTICAZIONE
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Token mancante" });

  const { data: userData, error } = await supabase.auth.getUser(token);
  if (error || !userData?.user) return res.status(401).json({ error: "Utente non autenticato" });

  // 🛡️ VALIDAZIONE ID
  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "ID sessione non valido" });
  }

  try {
    // 📖 RECUPERA SESSIONE
    const { data: session, error: sessionError } = await supabase
      .from("thesis_analysis_sessions")
      .select("*")
      .eq("id", id)
      .eq("user_id", userData.user.id)
      .eq("status", "active")
      .single();

    if (sessionError) {
      if (sessionError.code === 'PGRST116') {
        return res.status(404).json({ error: "Sessione non trovata o già completata" });
      }
      console.error("Errore recupero sessione per finalizzazione:", sessionError);
      throw sessionError;
    }

    // 📊 RECUPERA TUTTI I CHUNKS
    const { data: chunks, error: chunksError } = await supabase
      .from("thesis_analysis_chunks")
      .select("*")
      .eq("session_id", id)
      .order("chunk_number", { ascending: true });

    if (chunksError) {
      console.error("Errore recupero chunks per finalizzazione:", chunksError);
      throw chunksError;
    }

    if (!chunks || chunks.length === 0) {
      return res.status(400).json({ error: "Nessun contenuto da finalizzare" });
    }

    // 🎯 VALIDAZIONE COMPLETEZZA ANALISI
    const expectedAnalyses = getExpectedAnalysesCount(session.level as 'triennale' | 'magistrale' | 'dottorato');
    const completionPercentage = (chunks.length / expectedAnalyses) * 100;

    // Avviso se analisi incompleta (ma non bloccare)
    if (completionPercentage < 80) {
      console.warn(`⚠️ Finalizzazione con ${completionPercentage.toFixed(1)}% completezza (${chunks.length}/${expectedAnalyses})`);
    }

    // 🔗 CREA ANALISI FINALE UNIFICATA ENTERPRISE
    const finalAnalysis = createUnifiedAnalysis(chunks, session);

    // 📈 CALCOLA METADATI AGGREGATI ENTERPRISE
    const totalInputChars = chunks.reduce((sum, chunk) => sum + chunk.input_text.length, 0);
    const totalOutputChars = finalAnalysis.length;
    const compressionRatio = totalOutputChars / totalInputChars;

    // 🎯 CALCOLA QUALITY SCORE ENTERPRISE
    const qualityScore = calculateAnalysisQualityScore(chunks, session, compressionRatio);

    // ⏱️ CALCOLA TEMPO COMPLETAMENTO
    const createdAt = new Date(session.created_at);
    const completedAt = new Date();
    const completionTimeDays = Math.ceil((completedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

    const processingMetadata = {
      method: "THESIS_ANALYSIS_MULTIPART",
      analysis_type: "comprehensive_thesis_evaluation",
      level: session.level,
      total_chunks: chunks.length,
      expected_analyses: expectedAnalyses,
      completion_percentage: completionPercentage,
      total_input_length: totalInputChars,
      total_output_length: totalOutputChars,
      compression_ratio: compressionRatio,
      quality_score: qualityScore,
      completion_time_days: completionTimeDays,
      chunks_metadata: chunks.map(chunk => ({
        chunk_number: chunk.chunk_number,
        analysis_type: chunk.analysis_type,
        input_length: chunk.input_text.length,
        output_length: chunk.output_analysis.length,
        created_at: chunk.created_at
      })),
      finalized_at: completedAt.toISOString(),
      thesis_metrics: {
        faculty: session.faculty,
        thesis_topic: session.thesis_topic,
        analysis_depth: getAnalysisDepthLabel(session.level as 'triennale' | 'magistrale' | 'dottorato'),
        analysis_coverage: completionPercentage,
        estimated_reading_time: Math.ceil(totalOutputChars / 1000) // ~1000 chars/minuto
      }
    };

    // 💾 SALVA ANALISI FINALE IN BIBLIOTECA
    const { data: finalAnalysisRecord, error: saveError } = await supabase
      .from("thesis_analyses_generated")
      .insert({
        user_id: userData.user.id,
        session_id: id,
        titolo: session.project_title,
        input: chunks.map(c => c.input_text).join('\n\n=== SEZIONE SEPARATOR ===\n\n'),
        output: finalAnalysis,
        faculty: session.faculty,
        thesis_topic: session.thesis_topic,
        level: session.level,
        is_public: session.is_public,
        creato_da: userData.user.id,
        processing_metadata: processingMetadata
      })
      .select()
      .single();

    if (saveError) {
      console.error("Errore salvataggio analisi finale:", saveError);
      throw saveError;
    }

    // ✅ AGGIORNA SESSIONE COME COMPLETATA
    const { error: updateError } = await supabase
      .from("thesis_analysis_sessions")
      .update({
        status: "completed",
        completed_at: completedAt.toISOString(),
        final_analysis_id: finalAnalysisRecord.id
      })
      .eq("id", id);

    if (updateError) {
      console.error("Errore aggiornamento sessione:", updateError);
      throw updateError;
    }

    // 📋 REGISTRA ATTIVITÀ (se tabella attivita esiste)
    try {
      await supabase.from("attivita").insert({
        user_id: userData.user.id,
        tipo: "analisi_tesi",
        dettagli: `Progetto completato: ${session.project_title} (${session.level}) - ${chunks.length} analisi unite`,
        creato_il: completedAt.toISOString()
      });
    } catch (activityError) {
      // Non bloccante se tabella attivita non esiste
      console.warn("Impossibile registrare attività:", activityError);
    }

    console.log(`✅ Progetto ${session.project_title} finalizzato con successo: ${chunks.length} analisi unite`);

    res.status(200).json({
      final_analysis: finalAnalysisRecord,
      chunks_count: chunks.length,
      total_characters: totalOutputChars,
      compression_ratio: compressionRatio,
      analysis_quality_score: qualityScore,
      completion_time_days: completionTimeDays,
      message: `Progetto "${session.project_title}" completato con successo e salvato in Biblioteca`
    });

  } catch (error: any) {
    console.error("Errore finalizzazione progetto:", error);
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

// 🎯 HELPER: Label profondità analisi
function getAnalysisDepthLabel(level: 'triennale' | 'magistrale' | 'dottorato'): string {
  switch (level) {
    case 'triennale': return "Analisi Base e Comprensione";
    case 'magistrale': return "Analisi Avanzata e Critica";
    case 'dottorato': return "Analisi Scientifica di Frontiera";
    default: return "Analisi Standard";
  }
}

// 🔗 HELPER: Crea analisi unificata enterprise
function createUnifiedAnalysis(chunks: ThesisAnalysisChunk[], session: ThesisAnalysisSession): string {
  const header = `# ANALISI COMPLETA DELLA TESI
## ${session.project_title}

**Facoltà:** ${session.faculty}
**Argomento:** ${session.thesis_topic}
**Livello:** ${session.level.toUpperCase()}
**Analisi completate:** ${chunks.length}
**Data completamento:** ${new Date().toLocaleDateString('it-IT')}

---

`;

  const analysisBody = chunks
    .map((chunk, index) => {
      const analysisTitle = formatAnalysisTitle(chunk.analysis_type);
      return `## ${index + 1}. ${analysisTitle}

${chunk.output_analysis}

---`;
    })
    .join('\n\n');

  const footer = `

## CONCLUSIONI GENERALI

Questa analisi completa presenta una valutazione approfondita della tesi "${session.project_title}" secondo gli standard accademici per il livello ${session.level}. 

Le ${chunks.length} analisi specializzate forniscono una copertura completa degli aspetti fondamentali, offrendo una base solida per la valutazione finale e l'identificazione di punti di forza e aree di miglioramento.

**Generato da MyUniAgent - Sistema di Analisi Tesi Enterprise**
`;

  return header + analysisBody + footer;
}

// 🎯 HELPER: Formatta titolo analisi
function formatAnalysisTitle(analysisType: string): string {
  const titles: Record<string, string> = {
    'analisi_strutturale': 'Analisi Strutturale',
    'analisi_metodologica': 'Analisi Metodologica',
    'analisi_contenuti': 'Analisi dei Contenuti',
    'analisi_bibliografica': 'Analisi Bibliografica',
    'analisi_formale': 'Analisi Formale',
    'analisi_coerenza_argomentativa': 'Analisi della Coerenza Argomentativa',
    'analisi_originalita_contributo': 'Analisi dell\'Originalità del Contributo',
    'analisi_rilevanza_disciplinare': 'Analisi della Rilevanza Disciplinare',
    'analisi_strutturale_avanzata': 'Analisi Strutturale Avanzata',
    'analisi_metodologica_rigorosa': 'Analisi Metodologica Rigorosa',
    'analisi_contenuti_specialistici': 'Analisi dei Contenuti Specialistici',
    'analisi_critica_sintetica': 'Analisi Critica e Sintetica',
    'analisi_bibliografica_completa': 'Analisi Bibliografica Completa',
    'analisi_empirica_sperimentale': 'Analisi Empirica/Sperimentale',
    'analisi_implicazioni': 'Analisi delle Implicazioni',
    'analisi_innovazione_metodologica': 'Analisi dell\'Innovazione Metodologica',
    'analisi_validita_statistica': 'Analisi della Validità Statistica',
    'analisi_applicabilita_pratica': 'Analisi dell\'Applicabilità Pratica',
    'analisi_limiti_criticita': 'Analisi dei Limiti e Criticità',
    'analisi_posizionamento_teorico': 'Analisi del Posizionamento Teorico',
    'analisi_originalita_scientifica': 'Analisi dell\'Originalità Scientifica',
    'analisi_metodologica_frontiera': 'Analisi Metodologica di Frontiera',
    'analisi_stato_arte_internazionale': 'Analisi dello Stato dell\'Arte Internazionale',
    'analisi_framework_teorico': 'Analisi del Framework Teorico',
    'analisi_empirica_avanzata': 'Analisi Empirica Avanzata',
    'analisi_critica_profonda': 'Analisi Critica Profonda',
    'analisi_impatto_scientifico': 'Analisi dell\'Impatto Scientifico',
    'analisi_riproducibilita': 'Analisi della Riproducibilità',
    'analisi_standard_internazionali': 'Analisi degli Standard Internazionali',
    'analisi_significativita_statistica': 'Analisi della Significatività Statistica',
    'analisi_etica_ricerca': 'Analisi dell\'Etica della Ricerca',
    'analisi_sostenibilita_metodologica': 'Analisi della Sostenibilità Metodologica',
    'analisi_interdisciplinarieta': 'Analisi dell\'Interdisciplinarità',
    'analisi_scalabilita_risultati': 'Analisi della Scalabilità dei Risultati',
    'analisi_pubblicabilita_internazionale': 'Analisi della Pubblicabilità Internazionale',
    'analisi_gap_conoscenza_colmato': 'Analisi del Gap di Conoscenza Colmato'
  };

  return titles[analysisType] || analysisType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// 🎯 HELPER: Calcola quality score enterprise
function calculateAnalysisQualityScore(
  chunks: ThesisAnalysisChunk[], 
  session: ThesisAnalysisSession, 
  compressionRatio: number
): number {
  let score = 0;
  const maxScore = 100;

  // 📊 Completezza (40% del punteggio)
  const expectedAnalyses = getExpectedAnalysesCount(session.level as 'triennale' | 'magistrale' | 'dottorato');
  const completenessScore = Math.min((chunks.length / expectedAnalyses) * 40, 40);
  score += completenessScore;

  // 📝 Qualità contenuto (30% del punteggio)
  const avgOutputLength = chunks.reduce((sum, chunk) => sum + chunk.output_analysis.length, 0) / chunks.length;
  const contentQualityScore = Math.min((avgOutputLength / 2000) * 30, 30); // 2000 chars = full score
  score += contentQualityScore;

  // 🔄 Compression ratio (20% del punteggio)
  const idealCompressionRatio = 0.6; // 60% del testo originale
  const compressionScore = Math.max(0, 20 - Math.abs(compressionRatio - idealCompressionRatio) * 50);
  score += compressionScore;

  // 📈 Diversità analisi (10% del punteggio)
  const uniqueAnalysisTypes = new Set(chunks.map(c => c.analysis_type)).size;
  const diversityScore = Math.min((uniqueAnalysisTypes / chunks.length) * 10, 10);
  score += diversityScore;

  return Math.round(Math.min(score, maxScore));
}
