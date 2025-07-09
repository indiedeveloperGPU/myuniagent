import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metodo non consentito" });
  }

  // 🔐 AUTENTICAZIONE
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Token mancante" });

  const { data: userData, error } = await supabase.auth.getUser(token);
  if (error || !userData?.user) return res.status(401).json({ error: "Utente non autenticato" });

  const user = userData.user;

  // 📝 VALIDAZIONE INPUT
  const { 
    project_id, 
    title, 
    section, 
    content, 
    page_range,
    word_count,
    char_count,
    source_metadata 
  } = req.body;

  // Validazioni obbligatorie
  if (!project_id || typeof project_id !== "string") {
    return res.status(400).json({ error: "project_id è obbligatorio" });
  }

  if (!title || typeof title !== "string" || title.trim().length < 3) {
    return res.status(400).json({ error: "Titolo deve essere almeno 3 caratteri" });
  }

  if (!content || typeof content !== "string" || content.trim().length < 10) {
    return res.status(400).json({ error: "Contenuto deve essere almeno 10 caratteri" });
  }

  const cleanContent = content.trim();
  const cleanTitle = title.trim().slice(0, 200); // Limite DB

  // Auto-calcolo se non forniti
  const finalWordCount = word_count || cleanContent.split(/\s+/).length;
  const finalCharCount = char_count || cleanContent.length;

  // Validazione lunghezza
  if (finalCharCount > 50000) {
    return res.status(400).json({ 
      error: `Contenuto troppo lungo: ${finalCharCount} caratteri. Massimo 50.000 caratteri per chunk.`
    });
  }

  try {
    // 🔍 VERIFICA CHE IL PROGETTO ESISTA E APPARTENGA ALL'UTENTE
    const { data: projectData, error: projectError } = await supabase
      .from("summary_sessions")
      .select("id, user_id, project_title, status")
      .eq("id", project_id)
      .eq("user_id", user.id)
      .single();

    if (projectError || !projectData) {
      return res.status(404).json({ error: "Progetto non trovato o non autorizzato" });
    }

    if (projectData.status !== 'attivo') {
      return res.status(400).json({ 
        error: `Progetto in stato '${projectData.status}'. Solo progetti attivi accettano nuovi chunks.` 
      });
    }

    // 📊 CALCOLA ORDER_INDEX (prossimo numero nella sequenza)
    const { data: lastChunk } = await supabase
      .from("raw_chunks")
      .select("order_index")
      .eq("project_id", project_id)
      .order("order_index", { ascending: false })
      .limit(1)
      .single();

    const nextOrderIndex = (lastChunk?.order_index || 0) + 1;

    // 💾 INSERIMENTO CHUNK
    const chunkData = {
      project_id,
      user_id: user.id,
      title: cleanTitle,
      section: section?.trim() || null,
      page_range: page_range?.trim() || null,
      order_index: nextOrderIndex,
      content: cleanContent,
      word_count: finalWordCount,
      char_count: finalCharCount,
      status: 'bozza', // Default status
      source_metadata: source_metadata || null,
    };

    const { data: savedChunk, error: insertError } = await supabase
      .from("raw_chunks")
      .insert(chunkData)
      .select(`
        id,
        project_id,
        title,
        section,
        page_range,
        order_index,
        word_count,
        char_count,
        status,
        created_at
      `)
      .single();

    if (insertError) {
      console.error("Errore inserimento chunk:", insertError);
      return res.status(500).json({ 
        error: "Errore nel salvataggio del chunk",
        details: insertError.message 
      });
    }

    // 📈 AGGIORNA STATISTICS DEL PROGETTO (opzionale)
    const { data: projectStats } = await supabase
      .from("raw_chunks")
      .select("id, char_count")
      .eq("project_id", project_id);

    const totalChunks = projectStats?.length || 0;
    const totalChars = projectStats?.reduce((sum, chunk) => sum + chunk.char_count, 0) || 0;

    // 📝 LOG ATTIVITÀ
    await supabase.from("attivita").insert({
      user_id: user.id,
      tipo: "chunk_created",
      dettagli: `Chunk "${cleanTitle}" aggiunto al progetto "${projectData.project_title}"`,
      creato_il: new Date().toISOString()
    });

    // ✅ RISPOSTA SUCCESS
    return res.status(201).json({
      chunk: savedChunk,
      project_stats: {
        total_chunks: totalChunks,
        total_chars: totalChars,
        project_title: projectData.project_title
      }
    });

  } catch (err: any) {
    console.error("Errore generale nella creazione chunk:", err);
    return res.status(500).json({ 
      error: "Errore interno del server",
      details: err.message 
    });
  }
}
