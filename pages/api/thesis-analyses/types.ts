import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

interface AnalysisTypesResponse {
  success: boolean;
  analysis_types?: string[];
  error?: string;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AnalysisTypesResponse>
) {
  if (req.method !== "GET") {
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
    const projectId = req.query.project_id as string;

    if (!projectId) {
      return res.status(400).json({ 
        success: false, 
        error: "project_id obbligatorio" 
      });
    }

    // Verifica ownership del progetto
    const { data: sessionData, error: sessionError } = await supabase
      .from("thesis_analysis_sessions")
      .select("user_id")
      .eq("id", projectId)
      .single();

    if (sessionError || !sessionData || sessionData.user_id !== user.id) {
      return res.status(403).json({ 
        success: false, 
        error: "Progetto non trovato o non autorizzato" 
      });
    }

    // Recupera tipi analisi unici per questo progetto
    const { data: analysisTypes, error: typesError } = await supabase
      .from("thesis_analysis_chunks")
      .select("analysis_type")
      .eq("session_id", projectId);

    if (typesError) {
      return res.status(500).json({ 
        success: false, 
        error: "Errore nel recupero dei tipi analisi" 
      });
    }

    // Estrai tipi unici
    const uniqueTypes = [...new Set(analysisTypes?.map(item => item.analysis_type) || [])];

    return res.status(200).json({
      success: true,
      analysis_types: uniqueTypes
    });

  } catch (error: any) {
    console.error("[THESIS-ANALYSES-TYPES] Errore critico:", error);
    return res.status(500).json({
      success: false,
      error: "Errore interno del server"
    });
  }
}
