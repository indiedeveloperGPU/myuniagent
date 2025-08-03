import { createClient } from "@supabase/supabase-js";
import { OpenAI } from "openai";
import { createHITLPrompt } from "@/lib/prompt"; // Importiamo il nostro prompt centralizzato
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
 * Funzione di supporto per creare il file di input JSONL per il batch di Groq.
 * @param chunks - Array di chunk da processare (devono contenere id e content).
 * @param facolta - Facoltà del progetto.
 * @param materia - Materia del progetto.
 * @returns Stringa contenente il file in formato JSONL.
 */
const createBatchInputFile = (chunks: any[], facolta: string, materia: string): string => {
  return chunks.map(chunk => {
    // Per ogni chunk, creiamo il prompt specifico
    const promptContent = createHITLPrompt(chunk.content, facolta, materia);

    // 🔧 SANITIZZAZIONE COMPLETA DEL PROMPT PER GROQ BATCH
    const sanitizedPrompt = promptContent
      // Smart quotes → quotes normali
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
      // Escape caratteri non-ASCII per JSON sicuro
      .replace(/[\u0080-\uFFFF]/g, (match) => {
        return '\\u' + ('0000' + match.charCodeAt(0).toString(16)).slice(-4);
      })
      // Rimuovi spazi multipli
      .replace(/[ \t]+/g, ' ')
      .trim();
    
    // Creiamo l'oggetto richiesta come specificato dalla documentazione di Groq Batch API
    const requestBody = {
      custom_id: chunk.id,
      method: "POST",
      url: "/v1/chat/completions",
      body: {
        model: "meta-llama/llama-4-maverick-17b-128e-instruct",
        messages: [
          { role: "system", content: "Sei MyUniAgent. Segui le istruzioni con precisione assoluta." },
          { role: "user", content: sanitizedPrompt } // ✅ USA IL PROMPT SANITIZZATO
        ],
        temperature: 0.1,
        max_tokens: 4000,
      }
    };
    return JSON.stringify(requestBody);
  }).join('\n');
};

/**
 * 1. AVVIA UN BATCH JOB
 * Questa è la funzione principale chiamata da /api/batch/queue.ts.
 * Il suo compito è preparare tutto e inviare la richiesta di avvio a Groq.
 */
export const processBatchJob = async (batchJobId: string) => {
  console.log(`[WORKER] Avvio elaborazione per Batch Job ID: ${batchJobId}`);

  try {
    // Step 1: Recupera i dati del batch job e dei chunk associati dal nostro DB
    const { data: batchJob, error: jobError } = await supabase
      .from("batch_jobs")
      .select("*, summary_sessions(facolta, materia)")
      .eq("id", batchJobId)
      .single();

    if (jobError || !batchJob) {
      throw new Error(`Batch job ${batchJobId} non trovato: ${jobError?.message}`);
    }

    const { data: chunks, error: chunksError } = await supabase
      .from("raw_chunks")
      .select("id, content")
      .in("id", batchJob.raw_chunk_ids);

    if (chunksError || !chunks || chunks.length === 0) {
      throw new Error(`Chunks per batch job ${batchJobId} non trovati: ${chunksError?.message}`);
    }

    // Step 2: Crea il contenuto del file JSONL
    const jsonlContent = createBatchInputFile(chunks, batchJob.summary_sessions.facolta, batchJob.summary_sessions.materia);

    // Step 3: Carica il file su Groq.
    // Usiamo Buffer.from() per passare il contenuto direttamente senza salvarlo su disco.
    const uploadableFile = await toFile(Buffer.from(jsonlContent, "utf-8"), "batch_input.jsonl");

console.log(`[WORKER] File in memoria pronto per l'upload.`);

// Step 4: Carica il file su Groq.
const batchInputFile = await openai.files.create({
  file: uploadableFile, // Ora passiamo l'oggetto corretto
  purpose: "batch"
});

console.log(`[WORKER] File di input ${batchInputFile.id} creato su Groq.`);

    // Step 4: Crea il batch su Groq usando l'ID del file appena caricato
    const groqBatch = await openai.batches.create({
      input_file_id: batchInputFile.id,
      endpoint: "/v1/chat/completions",
      completion_window: "24h",
      metadata: { // Metadati utili per il nostro debug
        myuniagent_batch_id: batchJobId,
        myuniagent_project_id: batchJob.project_id,
      },
    });

    console.log(`[WORKER] Batch creato su Groq con ID: ${groqBatch.id}. Stato: ${groqBatch.status}`);

    // Step 5: Aggiorna il nostro DB con l'ID di Groq e imposta lo stato a "elaborazione"
    await supabase
      .from("batch_jobs")
      .update({
        status: 'elaborazione',
        groq_batch_id: groqBatch.id,
        started_at: new Date().toISOString()
      })
      .eq("id", batchJobId);

    // Step 6: Aggiorna lo stato dei singoli chunk
    await supabase
      .from("raw_chunks")
      .update({ status: 'elaborazione' })
      .in("id", batchJob.raw_chunk_ids);

  } catch (error: any) {
  console.error(`[WORKER] ERRORE CRITICO nell'avvio del batch ${batchJobId}:`, error.message);
  
  // Solo marca come fallito se non è stato ancora creato su Groq
  const { data: currentJob } = await supabase
    .from("batch_jobs")
    .select("groq_batch_id")
    .eq("id", batchJobId)
    .single();
  
  if (!currentJob?.groq_batch_id) {
    // Batch non creato su Groq, possiamo marcarlo come fallito
    await supabase
      .from("batch_jobs")
      .update({ status: 'fallito', error_details: { message: `Avvio fallito: ${error.message}` } })
      .eq("id", batchJobId);
  } else {
    // Batch creato su Groq ma errore nell'aggiornamento locale, mantieni 'elaborazione'
    console.log(`[WORKER] Batch ${batchJobId} creato su Groq ma errore nell'aggiornamento locale. Status rimane 'elaborazione'`);
  }
}
};

/**
 * 2. GESTISCE IL COMPLETAMENTO DI UN BATCH JOB
 * Questa funzione verrà chiamata da un webhook quando Groq finisce.
 * Il suo compito è scaricare, processare i risultati e aggiornare il DB.
 */
export const handleBatchCompletion = async (groqBatchId: string) => {
    console.log(`[WORKER] Gestione completamento per Groq Batch ID: ${groqBatchId}`);

    // Step 1: Recupera il nostro batch job usando l'ID di Groq
    const { data: batchJob, error: jobError } = await supabase
        .from("batch_jobs")
        .select("id")
        .eq("groq_batch_id", groqBatchId)
        .single();
    
    if (jobError || !batchJob) {
        console.error(`[WORKER] Nessun batch job trovato per Groq ID ${groqBatchId}. Webhook ignorato.`);
        return; // Esce silenziosamente se non trova un job corrispondente
    }

    const myUniAgentBatchId = batchJob.id;

    try {
        // Step 2: Recupera i dettagli del batch da Groq per ottenere gli ID dei file di output
        const groqBatch = await openai.batches.retrieve(groqBatchId);

        if (groqBatch.status !== 'completed') {
             throw new Error(`Stato batch Groq non è 'completed' ma '${groqBatch.status}'. Riprovare più tardi.`);
        }
        
        const output_file_id = groqBatch.output_file_id;

        if (!output_file_id) {
            throw new Error("ID del file di output mancante. Il batch potrebbe essere fallito completamente.");
        }

        // Step 3: Scarica il contenuto del file dei risultati
        const fileContentResponse = await openai.files.content(output_file_id);
        const resultsText = await fileContentResponse.text();

        // Step 4: Processa il file JSONL riga per riga
        const lines = resultsText.trim().split('\n');
        let successCount = 0;
        let errorCount = 0;
        const promises = []; // Eseguiamo gli aggiornamenti in parallelo per velocità

        for (const line of lines) {
    const result = JSON.parse(line);
    const chunkId = result.custom_id; // L'ID del nostro raw_chunk
    const response = result.response;
    
    if (response.body && response.body.choices && response.body.choices.length > 0) {
        // Richiesta andata a buon fine
        const summary = response.body.choices[0].message.content;
        const usage = response.body.usage;

        // 🔧 FIX: Prima recupera i dati del chunk per ottenere le info necessarie
        const { data: chunkData } = await supabase
            .from("raw_chunks")
            .select("content, order_index, project_id")
            .eq("id", chunkId)
            .single();

        if (chunkData) {
            // A) 🔧 CORRETTO: Salva il riassunto nella tabella summary_chunks con i campi giusti
            const { data: summaryChunk, error: summaryError } = await supabase
                .from("summary_chunks")
                .insert({
                    session_id: chunkData.project_id,  // ← session_id corrisponde al project_id
                    chunk_number: chunkData.order_index, // ← usa l'order_index del chunk
                    input_text: chunkData.content,      // ← il contenuto originale del chunk
                    output_summary: summary,            // ← il riassunto generato
                    processing_metadata: { 
                        usage,
                        batch_job_id: myUniAgentBatchId,
                        raw_chunk_id: chunkId
                    }
                })
                .select("id")
                .single();

            if (summaryError) {
                console.error(`[WORKER] Errore inserimento summary_chunk per ${chunkId}:`, summaryError);
                errorCount++;
                continue;
            }

            // B) 🔧 CORRETTO: Aggiorna batch_results con il summary_chunk_id
            promises.push(supabase.from("batch_results").update({
                status: 'completato',
                summary_chunk_id: summaryChunk.id,  // ← QUESTO È IL LINK MANCANTE!
                input_tokens: usage.prompt_tokens,
                output_tokens: usage.completion_tokens,
                completed_at: new Date().toISOString(),
            }).eq("raw_chunk_id", chunkId).eq("batch_job_id", myUniAgentBatchId));

            // C) Aggiorna lo stato del chunk originale a "completato"
            promises.push(supabase.from("raw_chunks").update({ 
                status: 'completato',
                processed_at: new Date().toISOString()
            }).eq("id", chunkId));
            
            successCount++;
        } else {
            console.error(`[WORKER] Chunk ${chunkId} non trovato nel database`);
            errorCount++;
        }

    } else {
        // Richiesta fallita
        const errorDetails = response.body.error;
        promises.push(supabase.from("batch_results").update({
            status: 'fallito',
            error_message: errorDetails?.message || "Errore sconosciuto da Groq",
        }).eq("raw_chunk_id", chunkId).eq("batch_job_id", myUniAgentBatchId));

        promises.push(supabase.from("raw_chunks").update({ status: 'errore' }).eq("id", chunkId));
        errorCount++;
    }
}
        
        await Promise.all(promises);
        console.log(`[WORKER] Elaborazione righe completata. Successi: ${successCount}, Errori: ${errorCount}`);
        

        // Step 5: Finalizza il batch job principale nel nostro DB
        const finalStatus = errorCount > 0 ? 'fallito' : 'completato';
        await supabase.from("batch_jobs").update({
            status: finalStatus,
            processed_chunks: successCount,
            completed_at: new Date().toISOString()
        }).eq("id", myUniAgentBatchId);

    } catch (error: any) {
        console.error(`[WORKER] ERRORE CRITICO durante il completamento del batch ${myUniAgentBatchId}:`, error.message);
        await supabase.from("batch_jobs").update({
            status: 'fallito',
            error_details: { message: `Elaborazione risultati fallita: ${error.message}` },
        }).eq("id", myUniAgentBatchId);
    }
};