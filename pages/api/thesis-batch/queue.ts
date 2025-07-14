// File: pages/api/thesis-batch/queue.ts
// Questo endpoint riceve una richiesta per avviare un nuovo batch di analisi tesi.

import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
// Importeremo il nostro futuro worker qui. Per ora lo commentiamo.
// import { processThesisBatchJob } from '@/lib/thesisBatchWorker';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Gestisce la richiesta POST per mettere in coda un nuovo batch di analisi.
 * - Valida l'input: projectId, chunkIds, analysisTypes.
 * - Autorizza l'utente e il progetto.
 * - Crea un record nella tabella `thesis_batch_jobs`.
 * - Lancia in modo asincrono il worker per l'elaborazione.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo non consentito' });
  }

  // 1. Autenticazione
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Token mancante" });
  
  const { data: userData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !userData?.user) {
    return res.status(401).json({ error: "Utente non autenticato" });
  }
  const user = userData.user;

  // 2. Validazione dell'input
  const { projectId, chunkIds, analysisTypes } = req.body;

  if (!projectId || typeof projectId !== 'string') {
    return res.status(400).json({ error: 'projectId è obbligatorio' });
  }
  if (!Array.isArray(chunkIds) || chunkIds.length === 0) {
    return res.status(400).json({ error: 'chunkIds deve essere un array non vuoto' });
  }
  if (!Array.isArray(analysisTypes) || analysisTypes.length === 0) {
    return res.status(400).json({ error: 'analysisTypes deve essere un array non vuoto' });
  }

  try {
    // 3. Autorizzazione del progetto
    const { data: projectData, error: projectError } = await supabase
      .from('thesis_analysis_sessions')
      .select('id, status')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (projectError || !projectData) {
      return res.status(404).json({ error: 'Progetto non trovato o non autorizzato' });
    }
    if (projectData.status !== 'active') {
        return res.status(400).json({ error: `Il progetto non è attivo (stato: ${projectData.status})` });
    }

    // 4. Calcola il numero totale di analisi da eseguire
    const totalAnalyses = chunkIds.length * analysisTypes.length;

    // 5. Crea il batch job nel database
    const { data: batchJob, error: batchError } = await supabase
      .from('thesis_batch_jobs')
      .insert({
        user_id: user.id,
        project_id: projectId,
        raw_chunk_ids: chunkIds,
        analysis_types: analysisTypes,
        total_analyses: totalAnalyses,
        status: 'in_coda',
      })
      .select()
      .single();

    if (batchError) {
      console.error('Errore creazione thesis_batch_job:', batchError);
      return res.status(500).json({ error: 'Impossibile creare il batch job', details: batchError.message });
    }

    // 6. Lancia il worker asincrono (NON attendere la fine con await)
    // processThesisBatchJob(batchJob.id); // Lo scommenteremo quando avremo creato il file
    console.log(`[API] Job ${batchJob.id} messo in coda. Il worker verrà lanciato (simulazione).`);

    // 7. Restituisci una risposta di successo immediata
    return res.status(202).json({
      message: 'Batch di analisi messo in coda con successo!',
      batch_job: batchJob,
    });

  } catch (err: any) {
    console.error('Errore API /thesis-batch/queue:', err);
    return res.status(500).json({ error: 'Errore interno del server', details: err.message });
  }
}
