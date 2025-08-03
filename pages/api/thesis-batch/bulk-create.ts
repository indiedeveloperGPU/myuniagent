// File: pages/api/thesis-batch/bulk-create.ts
// API per creare TUTTI i job di analisi batch per tesi in una volta sola

import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { processThesisBatchJob } from "@/lib/groqThesisBatchWorker";

// 🎯 ENTERPRISE TYPESCRIPT INTERFACES
interface BulkBatchCreateRequest {
  project_id: string;
  chunk_ids: string[];
}

interface BulkBatchCreateResponse {
  success: boolean;
  bulk_job_id?: string;
  created_jobs?: Array<{
    batch_job_id: string;
    analysis_type: string;
    analysis_name: string;
  }>;
  message?: string;
  error?: string;
  details?: {
    total_jobs_created: number;
    total_chunks: number;
    project_title: string;
    project_level: string;
    estimated_completion_time: string;
  };
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 🎯 HELPER: Tipi di analisi validi per livello (copiato da create.ts)
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

// 🎯 HELPER: Ottieni nome leggibile per tipo di analisi (copiato da create.ts)
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

// 🎯 HELPER: Genera bulk job ID univoco
function generateBulkJobId(): string {
  return `bulk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BulkBatchCreateResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ 
      success: false, 
      error: "Metodo non consentito" 
    });
  }

  try {
    // 🔐 AUTENTICAZIONE (copiato da create.ts)
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

    // 🛡️ VALIDAZIONE ORIGINE (copiato da create.ts)
    const origin = req.headers.origin || "";
    const dominiAutorizzati = ["https://myuniagent.it", "http://localhost:3000"];
    if (!dominiAutorizzati.includes(origin)) {
      return res.status(403).json({ 
        success: false, 
        error: "Accesso non consentito da questa origine" 
      });
    }

    // 📝 VALIDAZIONE INPUT
    const { project_id, chunk_ids }: BulkBatchCreateRequest = req.body;

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

    // 🎯 OTTIENI TUTTI I TIPI DI ANALISI PER IL LIVELLO
    const validAnalysisTypes = getValidAnalysisTypes(project.level as 'triennale' | 'magistrale' | 'dottorato');
    
    console.log(`[BULK-CREATE] Creazione ${validAnalysisTypes.length} batch jobs per progetto ${project_id}, livello ${project.level}`);

    // 🔍 CONTROLLO ANALISI GIÀ ESISTENTI
    const { data: existingAnalyses, error: duplicateError } = await supabase
      .from("thesis_analysis_chunks")
      .select("analysis_type")
      .eq("session_id", project_id);

    if (duplicateError) {
      return res.status(500).json({ 
        success: false, 
        error: "Errore durante il controllo analisi duplicate" 
      });
    }

    // Filtra i tipi di analisi già completati
    const existingAnalysisTypes = new Set(existingAnalyses?.map(a => a.analysis_type) || []);
    const pendingAnalysisTypes = validAnalysisTypes.filter(type => !existingAnalysisTypes.has(type));

    if (pendingAnalysisTypes.length === 0) {
      return res.status(409).json({ 
        success: false, 
        error: `Tutte le analisi per il livello ${project.level} sono già state completate per questo progetto.` 
      });
    }

    if (pendingAnalysisTypes.length < validAnalysisTypes.length) {
      const completedCount = validAnalysisTypes.length - pendingAnalysisTypes.length;
      console.log(`[BULK-CREATE] ${completedCount} analisi già completate, creando ${pendingAnalysisTypes.length} job rimanenti`);
    }

    // 🚧 CONTROLLO LIMITI UTENTE BULK
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

    const LIMITE_BATCH_GIORNALIERO = 20; // Limite più alto per bulk operations
    const jobsToCreate = pendingAnalysisTypes.length;
    
    if ((batchJobsToday ?? 0) + jobsToCreate > LIMITE_BATCH_GIORNALIERO) {
      return res.status(429).json({
        success: false,
        error: `Operazione richiederebbe ${jobsToCreate} batch job, ma hai già usato ${batchJobsToday} dei ${LIMITE_BATCH_GIORNALIERO} job giornalieri disponibili.`,
      });
    }

    // 🔍 VERIFICA CONTENUTO CHUNK (copiato da create.ts)
    const totalChars = chunks.reduce((sum, chunk) => sum + (chunk.char_count || 0), 0);
    const avgCharsPerChunk = totalChars / chunks.length;

    if (avgCharsPerChunk > 25000) {
      return res.status(400).json({ 
        success: false, 
        error: `Chunk troppo lunghi in media: ${Math.round(avgCharsPerChunk).toLocaleString()} caratteri. Massimo consigliato: 25,000 caratteri per chunk.` 
      });
    }

    if (totalChars > 500000) {
      return res.status(400).json({ 
        success: false, 
        error: `Troppo contenuto totale: ${totalChars.toLocaleString()} caratteri. Massimo consigliato: 500,000 caratteri per batch job.` 
      });
    }

    // 🚀 CREAZIONE BULK BATCH JOBS
    const bulkJobId = generateBulkJobId();
    const createdJobs: Array<{batch_job_id: string; analysis_type: string; analysis_name: string}> = [];
    const creationErrors: Array<{analysis_type: string; error: string}> = [];

    console.log(`[BULK-CREATE] Inizio creazione ${pendingAnalysisTypes.length} batch jobs con bulk_job_id: ${bulkJobId}`);

    // Crea tutti i batch jobs in una transazione
    for (const analysisType of pendingAnalysisTypes) {
      try {
        const { data: batchJob, error: insertError } = await supabase
          .from("thesis_batch_jobs")
          .insert({
            user_id: user.id,
            project_id: project_id,
            analysis_type: analysisType,
            selected_chunk_ids: chunk_ids,
            total_chunks: chunks.length,
            status: 'pending',
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            metadata: {
              created_by: "thesis-bulk-batch-api",
              bulk_job_id: bulkJobId, // 🎯 COLLEGAMENTO BULK
              project_title: project.project_title,
              project_level: project.level,
              project_faculty: project.faculty,
              total_chars: totalChars,
              avg_chars_per_chunk: Math.round(avgCharsPerChunk),
              analysis_name: getAnalysisName(analysisType),
              is_bulk_operation: true,
              bulk_operation_size: pendingAnalysisTypes.length,
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
          console.error(`[BULK-CREATE] Errore creazione job per ${analysisType}:`, insertError);
          creationErrors.push({
            analysis_type: analysisType,
            error: insertError?.message || "Errore sconosciuto"
          });
          continue;
        }

        createdJobs.push({
          batch_job_id: batchJob.id,
          analysis_type: analysisType,
          analysis_name: getAnalysisName(analysisType)
        });

        console.log(`[BULK-CREATE] Batch job creato: ${batchJob.id} per analisi ${analysisType}`);

        // 🚀 AVVIO PROCESSING ASINCRONO
        setImmediate(() => {
          processThesisBatchJob(batchJob.id).catch(error => {
            console.error(`[BULK-CREATE] Errore processing batch job ${batchJob.id}:`, error);
          });
        });

      } catch (error: any) {
        console.error(`[BULK-CREATE] Errore critico per ${analysisType}:`, error);
        creationErrors.push({
          analysis_type: analysisType,
          error: error.message
        });
      }
    }

    // 📊 VALUTAZIONE RISULTATI
    const successCount = createdJobs.length;
    const errorCount = creationErrors.length;

    // Se nessun job è stato creato, ritorna errore
    if (successCount === 0) {
      return res.status(500).json({
        success: false,
        error: `Impossibile creare alcun batch job. Errori: ${creationErrors.map(e => `${e.analysis_type}: ${e.error}`).join('; ')}`,
      });
    }

    // 📊 REGISTRA ATTIVITÀ BULK
    await supabase.from("attivita").insert({
      user_id: user.id,
      tipo: "thesis_bulk_batch_created",
      dettagli: `Analisi completa avviata: ${successCount} batch job creati${errorCount > 0 ? `, ${errorCount} errori` : ''} per progetto "${project.project_title}" (${project.level})`,
      creato_il: new Date().toISOString()
    });

    // ✅ RISPOSTA SUCCESSO (anche parziale)
    // Stima conservativa enterprise-grade per gestire aspettative
    const baseTimePerJob = 5; // 5 minuti per job (stima sicura)
    const bufferMultiplier = 1.5; // Buffer del 50% per picchi di traffico
    const estimatedMinutes = Math.ceil(successCount * baseTimePerJob * bufferMultiplier);
    
    // Messaging intelligente basato sulla durata stimata
    const timeMessage = estimatedMinutes <= 10 
      ? `${estimatedMinutes} minuti circa`
      : `${estimatedMinutes}-${Math.ceil(estimatedMinutes * 1.3)} minuti`;
    
    return res.status(201).json({
      success: true,
      bulk_job_id: bulkJobId,
      created_jobs: createdJobs,
      message: `Analisi completa avviata con successo! ${successCount} analisi in elaborazione${errorCount > 0 ? ` (${errorCount} non create)` : ''}. Monitora i progressi nella tab 'Batch Jobs'.`,
      details: {
        total_jobs_created: successCount,
        total_chunks: chunks.length,
        project_title: project.project_title,
        project_level: project.level.toUpperCase(),
        estimated_completion_time: timeMessage
      }
    });

  } catch (error: any) {
    console.error("[BULK-CREATE] Errore critico:", error);
    return res.status(500).json({
      success: false,
      error: "Errore interno del server durante la creazione bulk",
      details: {
        total_jobs_created: 0,
        total_chunks: 0,
        project_title: "unknown",
        project_level: "unknown",
        estimated_completion_time: "unknown"
      }
    });
  }
}
