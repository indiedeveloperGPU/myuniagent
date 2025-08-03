import { createClient } from "@supabase/supabase-js";
import { OpenAI } from "openai";
import { toFile } from "openai/uploads";

// Inizializzazione dei client con le chiavi di servizio (massimi privilegi)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY!,
  baseURL: "https://api.groq.com/openai/v1",
});

/**
 * Crea il prompt specializzato per analisi tesi in base al tipo di analisi
 */
const createThesisAnalysisPrompt = (
  text: string, 
  faculty: string, 
  thesis_topic: string, 
  level: 'triennale' | 'magistrale' | 'dottorato', 
  analysis_type: string,
  project_title: string
): string => {
  const inputLength = text.length;
  const targetLength = Math.ceil(inputLength * 0.5);
  
// 🔧 SANITIZZAZIONE COMPLETA DEL TESTO INPUT PER GROQ BATCH
const sanitizedText = text
  // 🎯 PRIMA: Smart quotes → quotes normali (PRIMA dell'escape)
  .replace(/['']/g, "'")           // U+2018, U+2019 → '
  .replace(/[""]/g, '"')           // U+201C, U+201D → "
  // Altri caratteri problematici
  .replace(/[–—]/g, '-')           // En dash, Em dash → hyphen
  .replace(/…/g, '...')            // Ellipsis → tre punti
  .replace(/[\u00A0]/g, ' ')       // Non-breaking space → space normale
  // Caratteri di controllo
  .replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ')
  // Normalizza line endings
  .replace(/\r\n/g, '\n')
  .replace(/\r/g, '\n')
  // Converti tab in spazi
  .replace(/\t/g, '    ')
  // 🎯 ULTIMO: Escape caratteri non-ASCII per JSON sicuro
  .replace(/[\u0080-\uFFFF]/g, (match) => {
    return '\\u' + ('0000' + match.charCodeAt(0).toString(16)).slice(-4);
  })
  // Rimuovi spazi multipli
  .replace(/[ \t]+/g, ' ')
  .trim();
  
  const basePrompt = `Agisci come AgenteFox, l'esperto relatore universitario piu avanzato al mondo specializzato in valutazione di tesi accademiche.

CONTESTO ACCADEMICO:
- Facolta: ${faculty}
- Argomento tesi: ${thesis_topic}
- Livello: ${level.toUpperCase()}
- Progetto: ${project_title}
- Tipo analisi: ${analysis_type}
- Input: ${inputLength.toLocaleString()} caratteri
- Target output: circa ${targetLength.toLocaleString()} caratteri

OBIETTIVO SPECIALIZZATO

Devi condurre una analisi "${analysis_type}" approfondita e professionale del materiale di tesi fornito, secondo gli standard accademici piu elevati per il livello ${level}.

REGOLE FONDAMENTALI

1. Rigore Accademico: Mantieni sempre il massimo rigore scientifico e la precisione terminologica
2. Aderenza al Testo: Basati ESCLUSIVAMENTE sul contenuto fornito, senza aggiungere informazioni esterne
3. Professionalita: Adotta il tono e l'approccio di un relatore esperto e autorevole
4. Completezza: Fornisci una analisi completa che copra tutti gli aspetti rilevanti per questo tipo di valutazione

${getSpecializedAnalysisInstructions(analysis_type, level, faculty)}

STRUTTURA DELL'ANALISI

La tua analisi deve seguire questa struttura professionale:

1. INQUADRAMENTO GENERALE
- Contestualizzazione dell'argomento nel campo di studio
- Rilevanza del tema trattato

2. ANALISI SPECIALIZZATA
- Sviluppo completo dell'analisi richiesta secondo le istruzioni specifiche
- Osservazioni dettagliate e motivate
- Riferimenti puntuali al testo

3. VALUTAZIONE CRITICA
- Punti di forza identificati
- Aree di miglioramento o criticita
- Suggerimenti costruttivi

4. CONCLUSIONI
- Sintesi dei risultati dell'analisi
- Valutazione complessiva secondo i criteri specifici del tipo di analisi

IMPORTANTE

Ricorda che stai valutando una tesi di livello ${level} in ${faculty}. Le tue osservazioni devono essere:
- Appropriate al livello accademico
- Costruttive e formative
- Basate su evidenze concrete dal testo
- Orientate al miglioramento della qualita accademica

TESTO DA ANALIZZARE:
${sanitizedText}

Procedi con l'analisi "${analysis_type}" seguendo rigorosamente le istruzioni specializzate per ${level} in ${faculty}.`;

  return basePrompt;
};

/**
 * Istruzioni specializzate per tipo di analisi (versione semplificata per batch)
 */
const getSpecializedAnalysisInstructions = (
  analysis_type: string, 
  level: 'triennale' | 'magistrale' | 'dottorato', 
  faculty: string
): string => {
  // Mappa delle istruzioni base per i tipi di analisi più comuni
  const instructionsMap: Record<string, Record<string, string>> = {
    'analisi_strutturale': {
      triennale: `## ISTRUZIONI SPECIALIZZATE: ANALISI STRUTTURALE (TRIENNALE)

Valuta l'organizzazione logica e la struttura del lavoro:
- **Coerenza strutturale**: Verifica la sequenza logica delle argomentazioni
- **Chiarezza espositiva**: Analizza la capacità di presentare idee in modo ordinato
- **Equilibrio delle parti**: Valuta la proporzione tra le diverse sezioni
- **Transizioni**: Esamina i collegamenti tra i capitoli/paragrafi
- **Gerarchia informativa**: Verifica l'organizzazione gerarchica dei contenuti

Criteri di valutazione per livello triennale:
- Struttura semplice ma efficace
- Logica consequenziale chiara
- Capacità di organizzare il pensiero accademico`
    },
    'analisi_metodologica': {
      triennale: `## ISTRUZIONI SPECIALIZZATE: ANALISI METODOLOGICA (TRIENNALE)

Valuta l'approccio metodologico adottato:
- **Appropriatezza del metodo**: Verifica l'adeguatezza del metodo scelto rispetto agli obiettivi
- **Descrizione metodologica**: Analizza la chiarezza nella presentazione del metodo
- **Applicazione pratica**: Valuta l'implementazione concreta del metodo
- **Limiti metodologici**: Identifica eventuali limitazioni nell'approccio
- **Giustificazione delle scelte**: Esamina la motivazione delle decisioni metodologiche

Criteri di valutazione per livello triennale:
- Comprensione base dei principi metodologici
- Applicazione corretta di metodi standard
- Consapevolezza delle limitazioni metodologiche`
    },
    'analisi_contenuti': {
      triennale: `## ISTRUZIONI SPECIALIZZATE: ANALISI DEI CONTENUTI (TRIENNALE)

Valuta la padronanza degli argomenti e la qualità dei contenuti:
- **Accuratezza dei contenuti**: Verifica la correttezza delle informazioni presentate
- **Completezza della trattazione**: Analizza la copertura degli argomenti essenziali
- **Approfondimento tematico**: Valuta il livello di dettaglio nell'analisi
- **Pertinenza dei contenuti**: Esamina la rilevanza rispetto agli obiettivi
- **Aggiornamento delle fonti**: Verifica l'attualità delle informazioni utilizzate

Criteri di valutazione per livello triennale:
- Padronanza base degli argomenti fondamentali
- Capacità di sintesi e rielaborazione
- Uso appropriato della terminologia disciplinare`
    }
  };

  // Genera istruzioni specifiche o fallback generico
  const specificInstructions = instructionsMap[analysis_type]?.[level];
  
  if (specificInstructions) {
    return specificInstructions;
  }

  // Fallback generico
  const analysisName = analysis_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  
  const levelGuidelines = {
    triennale: "Valuta secondo standard di base universitari, focalizzandoti su comprensione e applicazione corretta dei concetti.",
    magistrale: "Applica criteri avanzati di valutazione, considerando approfondimento critico e capacità di sintesi specialistica.",
    dottorato: "Usa standard di eccellenza scientifica internazionale, valutando originalità, rigore metodologico e contributo alla conoscenza."
  };

  return `## ISTRUZIONI SPECIALIZZATE: ${analysisName.toUpperCase()} (${level.toUpperCase()})

Conduci un'analisi completa di "${analysisName}" secondo i più alti standard accademici per ${faculty}.

${levelGuidelines[level]}

Fornisci una valutazione approfondita che consideri:
- Aspetti teorici e metodologici rilevanti
- Qualità del contenuto in relazione al tipo di analisi
- Appropriatezza per il livello accademico ${level}
- Contributo specifico nell'ambito di ${faculty}

La tua analisi deve essere costruttiva, dettagliata e orientata al miglioramento della qualità accademica.`;
};

/**
 * ✅ CORRETTA: Funzione di supporto per creare il file di input JSONL per il batch di Groq.
 * @param chunks - Array di chunk da processare (devono contenere id e content).
 * @param sessionData - Dati della sessione di analisi (faculty, thesis_topic, level, project_title).
 * @param analysisType - Tipo di analisi da eseguire.
 * @returns Stringa contenente il file in formato JSONL.
 */
const createBatchInputFile = (
  chunks: any[], 
  sessionData: any, 
  analysisType: string
): string => {
  return chunks.map(chunk => {
    // Per ogni chunk, creiamo il prompt specializzato per analisi tesi
    const promptContent = createThesisAnalysisPrompt(
      chunk.content, 
      sessionData.faculty, 
      sessionData.thesis_topic, 
      sessionData.level,
      analysisType,
      sessionData.project_title
    );
    
    // 🔍 DEBUG: Verifica contenuto esatto che va a Groq
console.log(`[DEBUG-CONTENT] Chunk ID: ${chunk.id}`);
console.log(`[DEBUG-CONTENT] User content length: ${promptContent.length}`);
console.log(`[DEBUG-CONTENT] User content first 100 chars: ${promptContent.substring(0, 100)}`);
console.log(`[DEBUG-CONTENT] User content has quotes: ${promptContent.includes('"') ? 'YES' : 'NO'}`);
console.log(`[DEBUG-CONTENT] User content has newlines: ${promptContent.includes('\n') ? 'YES' : 'NO'}`);
    // Creiamo l'oggetto richiesta come specificato dalla documentazione di Groq Batch API
    const requestBody = {
      custom_id: chunk.id, // ✅ SEMPLIFICATO: Solo l'ID del chunk (come nei riassunti)
      method: "POST",
      url: "/v1/chat/completions",
      body: {
        model: "meta-llama/llama-4-maverick-17b-128e-instruct",
        messages: [
          { 
            role: "system", 
            content: "Sei AgenteFox, l'esperto relatore universitario più avanzato. Conduci analisi accademiche di altissima qualità seguendo rigorosamente le istruzioni specializzate." 
          },
          { 
            role: "user", 
            content: promptContent 
          }
        ],
        temperature: 0.1, // Temperatura molto bassa per consistenza
        top_p: 0.82,
        max_tokens: 8000,
      }
    };
    const jsonString = JSON.stringify(requestBody);
    console.log(`[DEBUG-JSON] JSON string length: ${jsonString.length}`);
console.log(`[DEBUG-JSON] JSON first 200 chars: ${jsonString.substring(0, 200)}`);
console.log(`[DEBUG-JSON] JSON last 100 chars: ${jsonString.substring(jsonString.length - 100)}`);
    return jsonString;
  }).join('\n'); // Uniamo ogni oggetto JSON con un a capo per creare il formato JSONL
};

/**
 * 1. AVVIA UN BATCH JOB PER ANALISI TESI
 * Questa è la funzione principale chiamata da /api/thesis-batch/create.ts.
 * Il suo compito è preparare tutto e inviare la richiesta di avvio a Groq.
 */
export const processThesisBatchJob = async (batchJobId: string) => {
  console.log(`[THESIS-WORKER] Avvio elaborazione per Thesis Batch Job ID: ${batchJobId}`);

  try {
    // Step 1: Recupera i dati del batch job dal nostro DB
    const { data: batchJob, error: jobError } = await supabase
      .from("thesis_batch_jobs")
      .select(`
        *,
        thesis_analysis_sessions!project_id (
          faculty,
          thesis_topic,
          level,
          project_title
        )
      `)
      .eq("id", batchJobId)
      .single();

    if (jobError || !batchJob) {
      throw new Error(`Thesis batch job ${batchJobId} non trovato: ${jobError?.message}`);
    }

    // Step 2: Recupera i chunk selezionati
    const { data: chunks, error: chunksError } = await supabase
  .from("thesis_raw_chunks")
  .select("id, content")
  .in("id", batchJob.selected_chunk_ids);

// ✅ E AGGIUNGI QUESTO per mantenere l'ordine di selezione:
const orderedChunks = batchJob.selected_chunk_ids
  .map((id: string) => {
    return chunks?.find((chunk: any) => chunk.id === id);
  })
  .filter((chunk: any): chunk is NonNullable<typeof chunk> => chunk != null);
  // 🔍 DEBUG ORDINE
// 🔍 DEBUG ORDINE
console.log(`[DEBUG-ORDER] selected_chunk_ids:`, batchJob.selected_chunk_ids);
console.log(`[DEBUG-ORDER] chunks from DB:`, chunks?.map((c: any) => c.id));
console.log(`[DEBUG-ORDER] orderedChunks final:`, orderedChunks?.map((c: any) => c.id));

    if (chunksError || !chunks || chunks.length === 0) {
      throw new Error(`Chunks per thesis batch job ${batchJobId} non trovati: ${chunksError?.message}`);
    }

    console.log(`[THESIS-WORKER] Trovati ${chunks.length} chunk per analisi ${batchJob.analysis_type}`);

    // Step 3: Crea il contenuto del file JSONL
    const sessionData = batchJob.thesis_analysis_sessions;
    const jsonlContent = createBatchInputFile(orderedChunks, sessionData, batchJob.analysis_type);
    // 🔍 DEBUG: Verifica JSONL
console.log(`[DEBUG-JSONL] Contenuto JSONL generato:`);
console.log(`[DEBUG-JSONL] Lunghezza: ${jsonlContent.length}`);
console.log(`[DEBUG-JSONL] Numero righe: ${jsonlContent.split('\n').length}`);
console.log(`[DEBUG-JSONL] Prima riga: ${jsonlContent.split('\n')[0].substring(0, 100)}...`);
console.log(`[DEBUG-JSONL] Seconda riga: ${jsonlContent.split('\n')[1]?.substring(0, 100)}...`);


    // Step 4: Carica il file su Groq
    const uploadableFile = await toFile(
      Buffer.from(jsonlContent, "utf-8"), 
      `thesis_batch_${batchJob.analysis_type}_${batchJobId}.jsonl`
    );

    console.log(`[THESIS-WORKER] File JSONL in memoria pronto per l'upload.`);

    const batchInputFile = await openai.files.create({
      file: uploadableFile,
      purpose: "batch"
    });

    console.log(`[THESIS-WORKER] File di input ${batchInputFile.id} creato su Groq.`);

    // Step 5: Crea il batch su Groq usando l'ID del file appena caricato
    const groqBatch = await openai.batches.create({
      input_file_id: batchInputFile.id,
      endpoint: "/v1/chat/completions",
      completion_window: "24h",
      metadata: {
        myuniagent_thesis_batch_id: batchJobId,
        myuniagent_project_id: batchJob.project_id,
        analysis_type: batchJob.analysis_type,
        level: sessionData.level,
        faculty: sessionData.faculty,
      },
    });

    console.log(`[THESIS-WORKER] Thesis batch creato su Groq con ID: ${groqBatch.id}. Stato: ${groqBatch.status}`);

    // Step 6: Aggiorna il nostro DB con l'ID di Groq e i metadati
    await supabase
      .from("thesis_batch_jobs")
      .update({
        status: groqBatch.status, // Usa lo stato diretto da Groq
        groq_batch_id: groqBatch.id,
        groq_file_id: batchInputFile.id,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h da ora
        metadata: {
          groq_created_at: groqBatch.created_at,
          groq_request_counts: groqBatch.request_counts,
          completion_window: groqBatch.completion_window,
        }
      })
      .eq("id", batchJobId);

    console.log(`[THESIS-WORKER] Batch job ${batchJobId} aggiornato con successo.`);

  } catch (error: any) {
    console.error(`[THESIS-WORKER] ERRORE CRITICO nell'avvio del thesis batch ${batchJobId}:`, error.message);
    
    // In caso di errore durante l'avvio, marchiamo il batch come fallito
    await supabase
      .from("thesis_batch_jobs")
      .update({ 
        status: 'failed',
        error_message: `Avvio fallito: ${error.message}`,
        completed_at: new Date().toISOString()
      })
      .eq("id", batchJobId);
  }
};

/**
 * ✅ CORRETTA: 2. GESTISCE IL COMPLETAMENTO DI UN THESIS BATCH JOB
 * Questa funzione verrà chiamata da /api/thesis-batch/process-results/:id
 * Il suo compito è scaricare, processare i risultati e salvare in thesis_analysis_chunks.
 */
export const handleThesisBatchCompletion = async (batchJobId: string) => {
  console.log(`\n🔍 [DEBUG-START] Batch Job ID: ${batchJobId}`);

  try {
    // Step 1: Recupera il batch job dal nostro DB
    console.log(`📊 [DEBUG-1] Recupero batch job dal DB...`);
    const { data: batchJob, error: jobError } = await supabase
      .from("thesis_batch_jobs")
      .select("*")
      .eq("id", batchJobId)
      .single();
    
    if (jobError || !batchJob) {
      console.error(`❌ [DEBUG-1-ERROR] Batch job non trovato:`, jobError);
      throw new Error(`Thesis batch job ${batchJobId} non trovato: ${jobError?.message}`);
    }

    console.log(`✅ [DEBUG-1-OK] Batch job trovato:`, {
      groq_batch_id: batchJob.groq_batch_id,
      status: batchJob.status,
      selected_chunk_ids: batchJob.selected_chunk_ids
    });

    if (!batchJob.groq_batch_id) {
      console.error(`❌ [DEBUG-1-ERROR] Groq batch ID mancante`);
      throw new Error(`Groq batch ID mancante per job ${batchJobId}`);
    }

    // Step 2: Recupera i dettagli del batch da Groq
    console.log(`🌐 [DEBUG-2] Recupero dettagli da Groq...`);
    const groqBatch = await openai.batches.retrieve(batchJob.groq_batch_id);

    console.log(`✅ [DEBUG-2-OK] Groq batch stato:`, {
      status: groqBatch.status,
      output_file_id: groqBatch.output_file_id,
      request_counts: groqBatch.request_counts
    });

    // Step 3: Aggiorna lo stato nel nostro DB
    await supabase
      .from("thesis_batch_jobs")
      .update({
        status: groqBatch.status,
        metadata: {
          ...batchJob.metadata,
          groq_request_counts: groqBatch.request_counts,
          groq_errors: groqBatch.errors,
        }
      })
      .eq("id", batchJobId);

    // Step 4: Se non è completato, esci
    if (groqBatch.status !== 'completed') {
      console.log(`⏸️ [DEBUG-4] Batch non ancora completato. Stato: ${groqBatch.status}`);
      return;
    }

    // Step 5: Processa i risultati solo se completato
    const output_file_id = groqBatch.output_file_id;
    if (!output_file_id) {
      console.error(`❌ [DEBUG-5-ERROR] Output file ID mancante`);
      throw new Error("ID del file di output mancante dal batch completato.");
    }

    console.log(`📁 [DEBUG-5] Output file ID: ${output_file_id}`);

    // Step 6: Scarica il contenuto del file dei risultati
    console.log(`⬇️ [DEBUG-6] Scaricamento file risultati...`);
    const fileContentResponse = await openai.files.content(output_file_id);
    const resultsText = await fileContentResponse.text();

    console.log(`✅ [DEBUG-6-OK] File scaricato. Dimensione: ${resultsText.length} caratteri`);
    console.log(`📄 [DEBUG-6-PREVIEW] Prime 200 caratteri:`, resultsText.substring(0, 200));


    // Step 7: Processa il file JSONL riga per riga
    console.log(`🔄 [DEBUG-7] Inizio processing JSONL...`);
    const lines = resultsText.trim().split('\n');
    console.log(`📊 [DEBUG-7] Trovate ${lines.length} righe nel JSONL`);

    let successCount = 0;
    let errorCount = 0;
    const savePromises = [];
    const debugResults = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      console.log(`\n🔍 [DEBUG-7-${i}] Processing riga ${i + 1}...`);
      
      try {
        const result = JSON.parse(line);
        const chunkId = result.custom_id;
        const response = result.response;

        console.log(`📋 [DEBUG-7-${i}-PARSE] Chunk ID: ${chunkId}`);
        console.log(`📋 [DEBUG-7-${i}-PARSE] Response status: ${response?.status_code}`);

        if (response?.status_code === 200 && response?.body?.choices?.[0]?.message?.content) {
          const analysisOutput = response.body.choices[0].message.content;
          const usage = response.body.usage;

          console.log(`✅ [DEBUG-7-${i}-SUCCESS] Analisi generata: ${analysisOutput.length} caratteri`);

          // 🔍 PUNTO CRITICO: Recupera i dati del chunk
          console.log(`🔍 [DEBUG-7-${i}-CHUNK] Recupero chunk dal DB...`);
          const { data: chunkData, error: chunkError } = await supabase
            .from("thesis_raw_chunks")
            .select("content, order_index")
            .eq("id", chunkId)
            .single();

          if (chunkData) {
            console.log(`✅ [DEBUG-7-${i}-CHUNK-OK] Chunk trovato:`, {
              order_index: chunkData.order_index,
              content_length: chunkData.content?.length
            });

            // 🔍 PUNTO CRITICO: Prepara il salvataggio
            const insertData = {
              session_id: batchJob.project_id,
              chunk_number: chunkData.order_index, 
              analysis_type: batchJob.analysis_type,
              input_text: chunkData.content,
              output_analysis: analysisOutput,
              batch_job_id: batchJobId,
              processing_metadata: {
                method: "THESIS_BATCH_GROQ",
                groq_batch_id: batchJob.groq_batch_id,
                chunk_id: chunkId,
                original_order_index: chunkData.order_index, 
                usage: usage,
                processed_at: new Date().toISOString(),
                model: "meta-llama/llama-4-maverick-17b-128e-instruct",
                analysis_type: batchJob.analysis_type
              }
            };

            console.log(`💾 [DEBUG-7-${i}-SAVE] Preparazione salvataggio:`, {
              session_id: insertData.session_id,
              chunk_number: insertData.chunk_number,
              analysis_type: insertData.analysis_type,
              input_length: insertData.input_text?.length,
              output_length: insertData.output_analysis?.length
            });

            // 🔍 TEST DIRETTO DEL SALVATAGGIO
            console.log(`🧪 [DEBUG-7-${i}-TEST] Test salvataggio diretto...`);
            const { data: saveResult, error: saveError } = await supabase
              .from("thesis_analysis_chunks")
              .insert(insertData);

            if (saveError) {
              console.error(`❌ [DEBUG-7-${i}-SAVE-ERROR] Errore salvataggio:`, saveError);
              errorCount++;
              debugResults.push({
                chunk_id: chunkId,
                status: 'SAVE_FAILED',
                error: saveError.message
              });
            } else {
              console.log(`✅ [DEBUG-7-${i}-SAVE-OK] Salvataggio riuscito!`);
              successCount++;
              debugResults.push({
                chunk_id: chunkId,
                status: 'SAVED',
                order_index: chunkData.order_index
              });
            }

          } else {
            console.error(`❌ [DEBUG-7-${i}-CHUNK-ERROR] Chunk non trovato nel database`);
            errorCount++;
            debugResults.push({
              chunk_id: chunkId,
              status: 'CHUNK_NOT_FOUND',
              error: chunkError?.message
            });
          }
        } else {
          console.error(`❌ [DEBUG-7-${i}-RESPONSE-ERROR] Risposta invalida:`, {
            statusCode: response?.statusCode,
            hasContent: !!response?.body?.choices?.[0]?.message?.content
          });
          errorCount++;
          debugResults.push({
            chunk_id: result.custom_id,
            status: 'INVALID_RESPONSE',
            error: response?.body?.error || response?.error || "Errore sconosciuto",
            actual_status_code: response?.status_code,
            has_content: !!response?.body?.choices?.[0]?.message?.content
          });
        }
      } catch (parseError: any) {
        console.error(`❌ [DEBUG-7-${i}-PARSE-ERROR] Errore parsing riga:`, parseError.message);
        errorCount++;
        debugResults.push({
          line_index: i,
          status: 'PARSE_ERROR',
          error: parseError.message
        });
      }
    }

    // 🎯 RIEPILOGO FINALE
    console.log(`\n📊 [DEBUG-FINAL] RIEPILOGO ELABORAZIONE:`);
    console.log(`✅ Successi: ${successCount}`);
    console.log(`❌ Errori: ${errorCount}`);
    console.log(`📋 Dettagli:`, debugResults);

    // Step 9: Finalizza il batch job
    const finalStatus = errorCount > 0 ? 'completed' : 'completed';
    const updateData = {
      status: finalStatus,
      processed_chunks: successCount,
      total_chunks: successCount + errorCount,
      completed_at: new Date().toISOString(),
      results_processed: true,
      groq_output_file_id: output_file_id,
      metadata: {
        ...batchJob.metadata,
        success_count: successCount,
        error_count: errorCount,
        processing_completed_at: new Date().toISOString(),
        debug_results: debugResults
      }
    };

    console.log(`💾 [DEBUG-FINAL-UPDATE] Aggiornamento batch job:`, updateData);

    const { error: updateError } = await supabase
      .from("thesis_batch_jobs")
      .update(updateData)
      .eq("id", batchJobId);

    if (updateError) {
      console.error(`❌ [DEBUG-UPDATE-ERROR] Errore aggiornamento finale:`, updateError);
    } else {
      console.log(`✅ [DEBUG-UPDATE-OK] Batch job aggiornato con successo`);
    }

    console.log(`🎯 [DEBUG-END] Elaborazione completata!`);

  } catch (error: any) {
    console.error(`💥 [DEBUG-CRITICAL-ERROR] ERRORE CRITICO:`, {
      message: error.message,
      stack: error.stack
    });
    
    await supabase
      .from("thesis_batch_jobs")
      .update({
        status: 'failed',
        error_message: `Elaborazione risultati fallita: ${error.message}`,
        completed_at: new Date().toISOString()
      })
      .eq("id", batchJobId);
  }
};

/**
 * 3. CONTROLLA LO STATO DI UN THESIS BATCH JOB
 * Funzione utile per aggiornare lo stato senza processare i risultati
 */
export const checkThesisBatchStatus = async (batchJobId: string) => {
  console.log(`[THESIS-WORKER] Controllo stato per Thesis Batch Job ID: ${batchJobId}`);

  try {
    // Recupera il batch job dal nostro DB
    const { data: batchJob, error: jobError } = await supabase
      .from("thesis_batch_jobs")
      .select("*")
      .eq("id", batchJobId)
      .single();
    
    if (jobError || !batchJob) {
      throw new Error(`Thesis batch job ${batchJobId} non trovato: ${jobError?.message}`);
    }

    if (!batchJob.groq_batch_id) {
      throw new Error(`Groq batch ID mancante per job ${batchJobId}`);
    }

    // Recupera stato da Groq
    const groqBatch = await openai.batches.retrieve(batchJob.groq_batch_id);

    // Aggiorna lo stato nel nostro DB
    await supabase
      .from("thesis_batch_jobs")
      .update({
        status: groqBatch.status,
        metadata: {
          ...batchJob.metadata,
          groq_request_counts: groqBatch.request_counts,
          groq_errors: groqBatch.errors,
          last_status_check: new Date().toISOString(),
        }
      })
      .eq("id", batchJobId);

    console.log(`[THESIS-WORKER] Stato aggiornato per batch ${batchJobId}: ${groqBatch.status}`);

    return {
      status: groqBatch.status,
      request_counts: groqBatch.request_counts,
      errors: groqBatch.errors,
    };

  } catch (error: any) {
    console.error(`[THESIS-WORKER] Errore controllo stato batch ${batchJobId}:`, error.message);
    
    await supabase
      .from("thesis_batch_jobs")
      .update({
        status: 'failed',
        error_message: `Controllo stato fallito: ${error.message}`,
      })
      .eq("id", batchJobId);

    throw error;
  }
};