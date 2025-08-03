// File: pages/api/thesis-batch/create.ts
// API per creare job di analisi batch per tesi tramite Groq

import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { processThesisBatchJob } from "@/lib/groqThesisBatchWorker";

// 🎯 ENTERPRISE TYPESCRIPT INTERFACES
interface BatchCreateRequest {
  project_id: string;
  chunk_ids: string[];
  analysis_type: string;
}

interface BatchCreateResponse {
  success: boolean;
  batch_job_id?: string;
  message?: string;
  error?: string;
  details?: {
    total_chunks: number;
    analysis_type: string;
    project_title: string;
  };
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 🎯 HELPER: Tipi di analisi validi per livello
function getValidAnalysisTypes(level: 'triennale' | 'magistrale' | 'dottorato'): string[] {
  const analysisTypes = {
    triennale: [
      'analisi_strutturale',
      'analisi_metodologica',
      'analisi_contenuti',
      'analisi_bibliografica',
      'analisi_formale',
      'analisi_coerenza_argomentativa',
      'analisi_originalita_contributo',
      'analisi_rilevanza_disciplinare'
    ],
    magistrale: [
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
    ],
    dottorato: [
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
    ]
  };

  return analysisTypes[level] || [];
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
  res: NextApiResponse<BatchCreateResponse>
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

    // 🛡️ VALIDAZIONE ORIGINE
    const origin = req.headers.origin || "";
    const dominiAutorizzati = ["https://myuniagent.it", "http://localhost:3000"];
    if (!dominiAutorizzati.includes(origin)) {
      return res.status(403).json({ 
        success: false, 
        error: "Accesso non consentito da questa origine" 
      });
    }

    // 📝 VALIDAZIONE INPUT
    const { project_id, chunk_ids, analysis_type }: BatchCreateRequest = req.body;

    // Validazione project_id
    if (!project_id || typeof project_id !== "string" || !project_id.trim()) {
      return res.status(400).json({ 
        success: false, 
        error: "ID progetto mancante o non valido" 
      });
    }

    // Validazione chunk_ids
    if (!Array.isArray(chunk_ids) || chunk_ids.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: "Lista chunk mancante o vuota" 
      });
    }

    if (chunk_ids.length > 50) {
      return res.status(400).json({ 
        success: false, 
        error: `Troppi chunk selezionati: ${chunk_ids.length}. Massimo consentito: 50` 
      });
    }

    // Validazione che tutti i chunk_ids siano stringhe UUID valide
    for (const chunkId of chunk_ids) {
      if (typeof chunkId !== "string" || !chunkId.trim()) {
        return res.status(400).json({ 
          success: false, 
          error: "ID chunk non valido nella lista" 
        });
      }
    }

    // Validazione analysis_type
    if (!analysis_type || typeof analysis_type !== "string" || !analysis_type.trim()) {
      return res.status(400).json({ 
        success: false, 
        error: "Tipo di analisi mancante o non valido" 
      });
    }

    // 🔍 VALIDAZIONE PROGETTO ESISTENTE
    const { data: project, error: projectError } = await supabase
      .from("thesis_analysis_sessions")
      .select("*")
      .eq("id", project_id)
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (projectError || !project) {
      return res.status(404).json({ 
        success: false, 
        error: "Progetto non trovato o non attivo" 
      });
    }

    // 🔍 VALIDAZIONE TIPO ANALISI PER LIVELLO
    const validAnalysisTypes = getValidAnalysisTypes(project.level as 'triennale' | 'magistrale' | 'dottorato');
    if (!validAnalysisTypes.includes(analysis_type)) {
      return res.status(400).json({ 
        success: false, 
        error: `Tipo di analisi "${analysis_type}" non valido per livello ${project.level}`,
        details: {
          total_chunks: 0,
          analysis_type: analysis_type,
          project_title: project.project_title
        }
      });
    }

    // 🔍 VALIDAZIONE CHUNK ESISTENTI
    const { data: chunks, error: chunksError } = await supabase
      .from("thesis_raw_chunks")
      .select("id, content, char_count")
      .eq("project_id", project_id)
      .eq("user_id", user.id)
      .in("id", chunk_ids);

    if (chunksError) {
      return res.status(500).json({ 
        success: false, 
        error: "Errore durante la validazione dei chunk" 
      });
    }

    if (!chunks || chunks.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: "Nessun chunk trovato per questo progetto" 
      });
    }

    // Verifica che tutti i chunk richiesti esistano
    const foundChunkIds = chunks.map(c => c.id);
    const missingChunkIds = chunk_ids.filter(id => !foundChunkIds.includes(id));
    
    if (missingChunkIds.length > 0) {
      return res.status(404).json({ 
        success: false, 
        error: `Alcuni chunk non sono stati trovati: ${missingChunkIds.length} mancanti` 
      });
    }

    // 🔍 CONTROLLO ANALISI DUPLICATA
    // Verifica se esiste già un'analisi di questo tipo per almeno uno dei chunk
    const { data: existingAnalyses, error: duplicateError } = await supabase
      .from("thesis_analysis_chunks")
      .select("id, analysis_type")
      .eq("session_id", project_id)
      .eq("analysis_type", analysis_type);

    if (duplicateError) {
      return res.status(500).json({ 
        success: false, 
        error: "Errore durante il controllo analisi duplicate" 
      });
    }

    if (existingAnalyses && existingAnalyses.length > 0) {
      return res.status(409).json({ 
        success: false, 
        error: `Analisi "${getAnalysisName(analysis_type)}" già completata per questo progetto. Ogni tipo di analisi può essere eseguito solo una volta per progetto.` 
      });
    }

    // 🚧 CONTROLLO LIMITI UTENTE
    const oggiInizio = new Date();
    oggiInizio.setHours(0, 0, 0, 0);

    const { count: batchJobsToday, error: countError } = await supabase
      .from("thesis_batch_jobs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", oggiInizio.toISOString());

    if (countError) {
      return res.status(500).json({ 
        success: false, 
        error: "Errore controllo limite giornaliero" 
      });
    }

    const LIMITE_BATCH_GIORNALIERO = 5; // Limite ragionevole per batch jobs
    if ((batchJobsToday ?? 0) >= LIMITE_BATCH_GIORNALIERO) {
      return res.status(429).json({
        success: false,
        error: `Hai raggiunto il limite di ${LIMITE_BATCH_GIORNALIERO} batch job al giorno.`,
      });
    }

    // 🔍 VERIFICA CONTENUTO CHUNK
    const totalChars = chunks.reduce((sum, chunk) => sum + (chunk.char_count || 0), 0);
    const avgCharsPerChunk = totalChars / chunks.length;

    // Verifica limiti ragionevoli
    if (avgCharsPerChunk > 25000) {
      return res.status(400).json({ 
        success: false, 
        error: `Chunk troppo lunghi in media: ${Math.round(avgCharsPerChunk).toLocaleString()} caratteri. Massimo consigliato: 25,000 caratteri per chunk.` 
      });
    }

    if (totalChars > 500000) { // 500k caratteri totali
      return res.status(400).json({ 
        success: false, 
        error: `Troppo contenuto totale: ${totalChars.toLocaleString()} caratteri. Massimo consigliato: 500,000 caratteri per batch job.` 
      });
    }

    // 💾 CREAZIONE BATCH JOB
    console.log(`[BATCH-CREATE] Creazione batch job per utente ${user.id}, progetto ${project_id}, analisi ${analysis_type}, ${chunks.length} chunk`);

    const { data: batchJob, error: insertError } = await supabase
      .from("thesis_batch_jobs")
      .insert({
        user_id: user.id,
        project_id: project_id,
        analysis_type: analysis_type,
        selected_chunk_ids: chunk_ids,
        total_chunks: chunks.length,
        status: 'pending',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h da ora
        metadata: {
          created_by: "thesis-batch-api",
          project_title: project.project_title,
          project_level: project.level,
          project_faculty: project.faculty,
          total_chars: totalChars,
          avg_chars_per_chunk: Math.round(avgCharsPerChunk),
          analysis_name: getAnalysisName(analysis_type),
          chunks_preview: chunks.slice(0, 3).map(c => ({
            id: c.id,
            char_count: c.char_count,
            content_preview: c.content?.substring(0, 100) + "..."
          }))
        }
      })
      .select()
      .single();

    if (insertError || !batchJob) {
      console.error("[BATCH-CREATE] Errore inserimento batch job:", insertError);
      return res.status(500).json({ 
        success: false, 
        error: "Errore durante la creazione del batch job" 
      });
    }

    // 🚀 AVVIO PROCESSING ASINCRONO
    console.log(`[BATCH-CREATE] Batch job ${batchJob.id} creato, avvio processing...`);
    
    // Avvia il worker in background senza aspettare
    setImmediate(() => {
      processThesisBatchJob(batchJob.id).catch(error => {
        console.error(`[BATCH-CREATE] Errore processing batch job ${batchJob.id}:`, error);
      });
    });

    // 📊 REGISTRA ATTIVITÀ
    await supabase.from("attivita").insert({
      user_id: user.id,
      tipo: "thesis_batch_created",
      dettagli: `Batch job creato per analisi "${getAnalysisName(analysis_type)}" su ${chunks.length} chunk del progetto "${project.project_title}"`,
      creato_il: new Date().toISOString()
    });

    // ✅ RISPOSTA SUCCESSO
    return res.status(201).json({
      success: true,
      batch_job_id: batchJob.id,
      message: `Batch job creato con successo! Analisi "${getAnalysisName(analysis_type)}" su ${chunks.length} chunk in elaborazione.`,
      details: {
        total_chunks: chunks.length,
        analysis_type: getAnalysisName(analysis_type),
        project_title: project.project_title
      }
    });

  } catch (error: any) {
    console.error("[BATCH-CREATE] Errore critico:", error);
    return res.status(500).json({
      success: false,
      error: "Errore interno del server",
      details: {
        total_chunks: 0,
        analysis_type: "unknown",
        project_title: "unknown"
      }
    });
  }
}
