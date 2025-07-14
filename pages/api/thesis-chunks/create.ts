// File: pages/api/thesis-chunks/create.ts
// Questo endpoint gestisce la creazione di un nuovo "materiale grezzo" per un progetto di analisi tesi.

import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

// Inizializza il client Supabase con la chiave di servizio per operazioni privilegiate.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Gestisce la richiesta POST per creare un nuovo thesis_raw_chunk.
 * - Autentica l'utente.
 * - Valida i dati in input (project_id, title, content).
 * - Autorizza l'utente, verificando che sia il proprietario del progetto.
 * - Inserisce il nuovo materiale nel database.
 * - Restituisce il record creato.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 1. Controlla che il metodo HTTP sia POST.
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metodo non consentito" });
  }

  // 2. Autenticazione dell'utente tramite token JWT.
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    return res.status(401).json({ error: "Token mancante" });
  }
  const { data: userData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !userData?.user) {
    return res.status(401).json({ error: "Utente non autenticato" });
  }
  const user = userData.user;

  // 3. Validazione dei dati ricevuti nel corpo della richiesta.
  const {
    project_id,
    title,
    section,
    content,
    page_range,
    source_metadata
  } = req.body;

  if (!project_id || typeof project_id !== "string") {
    return res.status(400).json({ error: "project_id è obbligatorio" });
  }
  if (!title || typeof title !== "string" || title.trim().length < 3) {
    return res.status(400).json({ error: "Il titolo è obbligatorio e deve essere almeno 3 caratteri" });
  }
  if (!content || typeof content !== "string" || content.trim().length < 10) {
    return res.status(400).json({ error: "Il contenuto è obbligatorio e deve essere almeno 10 caratteri" });
  }

  try {
    // 4. Autorizzazione: verifica che l'utente sia il proprietario del progetto di analisi.
    const { data: projectData, error: projectError } = await supabase
      .from("thesis_analysis_sessions")
      .select("id, project_title")
      .eq("id", project_id)
      .eq("user_id", user.id)
      .single();

    if (projectError || !projectData) {
      return res.status(404).json({ error: "Progetto di analisi non trovato o non autorizzato" });
    }

    // 5. Preparazione dei dati per l'inserimento.
    const cleanTitle = title.trim();
    const cleanContent = content.trim();
    const char_count = cleanContent.length;
    const word_count = cleanContent.split(/\s+/).filter(Boolean).length;

    // Calcola il prossimo 'order_index' per mantenere l'ordine dei materiali.
    const { data: lastChunk, error: orderError } = await supabase
      .from('thesis_raw_chunks')
      .select('order_index')
      .eq('project_id', project_id)
      .order('order_index', { ascending: false })
      .limit(1)
      .single();

    // Ignora l'errore se non ci sono ancora chunk (PGRST116: no rows found).
    if (orderError && orderError.code !== 'PGRST116') {
        throw orderError;
    }

    const order_index = (lastChunk?.order_index || 0) + 1;

    const newChunkData = {
      project_id,
      user_id: user.id,
      title: cleanTitle,
      section: section?.trim() || null,
      page_range: page_range?.trim() || null,
      order_index,
      content: cleanContent,
      char_count,
      word_count,
      status: 'bozza', // Lo stato di default è 'bozza'.
      source_metadata: source_metadata || null
    };

    // 6. Inserimento del nuovo record nel database.
    const { data: savedChunk, error: insertError } = await supabase
      .from("thesis_raw_chunks")
      .insert(newChunkData)
      .select()
      .single();

    if (insertError) {
      console.error("Errore inserimento materiale tesi:", insertError);
      return res.status(500).json({
        error: "Errore nel salvataggio del materiale",
        details: insertError.message
      });
    }
    
    // 7. (Opzionale) Registra l'attività per la cronologia dell'utente.
    await supabase.from("attivita").insert({
        user_id: user.id,
        tipo: "thesis_chunk_created",
        dettagli: `Materiale "${cleanTitle}" aggiunto al progetto tesi "${projectData.project_title}"`,
    });

    // 8. Restituisce una risposta di successo con il materiale appena creato.
    return res.status(201).json({
      message: "Materiale salvato con successo",
      chunk: savedChunk
    });

  } catch (err: any) {
    console.error("Errore API /thesis-chunks/create:", err);
    return res.status(500).json({
      error: "Errore interno del server",
      details: err.message
    });
  }
}
