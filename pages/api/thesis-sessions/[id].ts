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

interface SessionWithChunks extends ThesisAnalysisSession {
  chunks: ThesisAnalysisChunk[];
  stats: {
    total_chunks: number;
    total_input_chars: number;
    total_output_chars: number;
    completion_percentage: number;
    last_activity: string;
    estimated_reading_time: string;
  };
}

interface GetSessionResponse {
  session: SessionWithChunks;
  message: string;
}

interface DeleteSessionResponse {
  message: string;
  deleted_session_id: string;
  deleted_chunks_count: number;
}

type ApiResponse = GetSessionResponse | DeleteSessionResponse | { error: string; details?: string };

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
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

  if (req.method === "GET") {
    // 📖 RECUPERA SESSIONE CON CHUNKS
    try {
      // Recupera sessione base
      const { data: session, error: sessionError } = await supabase
        .from("thesis_analysis_sessions")
        .select("*")
        .eq("id", id)
        .eq("user_id", userData.user.id)
        .single();

      if (sessionError) {
        if (sessionError.code === 'PGRST116') {
          return res.status(404).json({ error: "Sessione non trovata" });
        }
        console.error("Errore recupero sessione:", sessionError);
        throw sessionError;
      }

      // Recupera chunks ordinati
      const { data: chunks, error: chunksError } = await supabase
        .from("thesis_analysis_chunks")
        .select("*")
        .eq("session_id", id)
        .order("chunk_number", { ascending: true });

      if (chunksError) {
        console.error("Errore recupero chunks:", chunksError);
        throw chunksError;
      }

      // 📊 CALCOLA STATISTICHE ENTERPRISE
      const totalChunks = chunks?.length || 0;
      const totalInputChars = chunks?.reduce((sum, chunk) => sum + chunk.input_text.length, 0) || 0;
      const totalOutputChars = chunks?.reduce((sum, chunk) => sum + chunk.output_analysis.length, 0) || 0;
      
      const expectedAnalyses = getExpectedAnalysesCount(session.level as 'triennale' | 'magistrale' | 'dottorato');
      const completionPercentage = expectedAnalyses > 0 ? Math.round((totalChunks / expectedAnalyses) * 100) : 0;
      
      const lastActivity = chunks && chunks.length > 0 
        ? chunks[chunks.length - 1].created_at 
        : session.created_at;

      // 📖 Stima tempo lettura (200 parole/minuto)
      const estimatedWords = totalOutputChars / 5; // Approssimazione: 5 caratteri = 1 parola
      const estimatedMinutes = Math.ceil(estimatedWords / 200);
      const estimatedReadingTime = estimatedMinutes < 1 
        ? "Meno di 1 minuto"
        : estimatedMinutes === 1 
          ? "1 minuto"
          : `${estimatedMinutes} minuti`;

      const sessionWithChunks: SessionWithChunks = {
        ...session,
        chunks: chunks || [],
        stats: {
          total_chunks: totalChunks,
          total_input_chars: totalInputChars,
          total_output_chars: totalOutputChars,
          completion_percentage: completionPercentage,
          last_activity: lastActivity,
          estimated_reading_time: estimatedReadingTime
        }
      };

      console.log(`📖 Recuperata sessione ${session.project_title} con ${totalChunks} chunks`);
      
      res.status(200).json({
        session: sessionWithChunks,
        message: `Sessione recuperata: ${totalChunks} analisi completate su ${expectedAnalyses} previste`
      });

    } catch (error: any) {
      console.error("Errore recupero sessione:", error);
      res.status(500).json({ 
        error: "Errore interno del server", 
        details: error.message 
      });
    }

  } else if (req.method === "DELETE") {
    // 🗑️ CANCELLA SESSIONE
    try {
      // Prima recupera info per logging
      const { data: sessionInfo, error: infoError } = await supabase
        .from("thesis_analysis_sessions")
        .select("project_title, level")
        .eq("id", id)
        .eq("user_id", userData.user.id)
        .single();

      if (infoError) {
        if (infoError.code === 'PGRST116') {
          return res.status(404).json({ error: "Sessione non trovata" });
        }
        console.error("Errore recupero info sessione:", infoError);
        throw infoError;
      }

      // Conta chunks prima della cancellazione
      const { count: chunksCount, error: countError } = await supabase
        .from("thesis_analysis_chunks")
        .select("*", { count: "exact", head: true })
        .eq("session_id", id);

      if (countError) {
        console.error("Errore conteggio chunks:", countError);
        throw countError;
      }

      // Cancella sessione (CASCADE cancellerà automaticamente i chunks)
      const { error: deleteError } = await supabase
        .from("thesis_analysis_sessions")
        .delete()
        .eq("id", id)
        .eq("user_id", userData.user.id);

      if (deleteError) {
        console.error("Errore cancellazione sessione:", deleteError);
        throw deleteError;
      }

      console.log(`🗑️ Sessione ${sessionInfo.project_title} cancellata con successo (${chunksCount} chunks)`);
      
      // 📊 REGISTRA ATTIVITÀ (se tabella attivita esiste)
      try {
        await supabase.from("attivita").insert({
          user_id: userData.user.id,
          tipo: "analisi_tesi",
          dettagli: `Progetto cancellato: ${sessionInfo.project_title} (${sessionInfo.level}) - ${chunksCount} analisi perse`,
          creato_il: new Date().toISOString()
        });
      } catch (activityError) {
        // Non bloccante se tabella attivita non esiste
        console.warn("Impossibile registrare attività:", activityError);
      }
      
      res.status(200).json({
        message: "Sessione cancellata con successo",
        deleted_session_id: id,
        deleted_chunks_count: chunksCount || 0
      });

    } catch (error: any) {
      console.error("Errore cancellazione sessione:", error);
      res.status(500).json({ 
        error: "Errore interno del server", 
        details: error.message 
      });
    }

  } else {
    res.status(405).json({ error: "Metodo non consentito" });
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
