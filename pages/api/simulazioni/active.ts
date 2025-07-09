import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

// 🗄️ Configurazione Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const config = {
  api: {
    bodyParser: true,
  },
};

// 🎯 Tipi per simulazioni attive
interface ActiveSimulation {
  id: string;
  materia: string;
  argomento: string;
  sottotema?: string;
  difficulty_level: string;
  simulation_type: string;
  ai_persona: string;
  status: string;
  current_step: number;
  total_steps: number;
  progress_percentage: number;
  total_questions: number;
  duration_minutes: number;
  created_at: string;
  started_at?: string;
  updated_at: string;
  questions_completed: number;
  last_activity: string;
  estimated_time_remaining: number;
  quality_score?: number;
  can_resume: boolean;
}

// 🕐 Calcolo tempo rimanente stimato
function calculateEstimatedTimeRemaining(
  currentStep: number, 
  totalSteps: number, 
  timePerAnswer: number
): number {
  const questionsRemaining = Math.ceil((totalSteps - currentStep) / 2);
  return Math.max(0, questionsRemaining * timePerAnswer);
}

// 📊 Determina se la simulazione può essere ripresa
function canResumeSimulation(
  status: string, 
  lastActivity: string, 
  maxIdleHours: number = 24
): boolean {
  if (status !== "in_progress" && status !== "paused") return false;
  
  const lastActivityDate = new Date(lastActivity);
  const hoursSinceLastActivity = (Date.now() - lastActivityDate.getTime()) / (1000 * 60 * 60);
  
  return hoursSinceLastActivity <= maxIdleHours;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Metodo non consentito" });
  }

  // 🔐 Autenticazione JWT (stesso pattern degli altri endpoint)
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Token mancante" });

  const { data: user, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: "Utente non autenticato" });

  // 🌍 CORS Security
  const origin = req.headers.origin || "";
  const dominiAutorizzati = ["https://myuniagent.it", "http://localhost:3000"];
  if (!dominiAutorizzati.includes(origin)) {
    return res.status(403).json({ error: "Accesso non consentito da questa origine." });
  }

  const userId = user.user?.id;
  if (!userId) return res.status(400).json({ error: "User ID non trovato" });

  try {
    console.log(`📋 Recupero simulazioni attive per utente: ${userId}`);

    // 📊 Query simulazioni attive con calcolo chunks completati
    const { data: activeSimulations, error: simError } = await supabase
      .from("simulazioni_orali")
      .select(`
        id,
        materia,
        argomento, 
        sottotema,
        difficulty_level,
        simulation_type,
        ai_persona,
        status,
        current_step,
        total_steps,
        progress_percentage,
        total_questions,
        duration_minutes,
        time_per_answer,
        quality_score,
        created_at,
        started_at,
        updated_at
      `)
      .eq("user_id", userId)
      .in("status", ["initialized", "in_progress", "paused"])
      .order("updated_at", { ascending: false })
      .limit(20); // Limite ragionevole

    if (simError) {
      console.error("❌ Errore query simulazioni:", simError);
      return res.status(500).json({ error: "Errore nel recupero delle simulazioni" });
    }

    if (!activeSimulations || activeSimulations.length === 0) {
      return res.status(200).json({
        success: true,
        active_simulations: [],
        total_count: 0,
        message: "Nessuna simulazione attiva trovata"
      });
    }

    // 🔄 Arricchimento dati con informazioni chunks
    const enrichedSimulations: ActiveSimulation[] = [];

    for (const sim of activeSimulations) {
      // Conta chunks completati per ogni simulazione
      const { data: chunks, error: chunksError } = await supabase
        .from("simulazione_chunks")
        .select("chunk_type, question_number, processing_status")
        .eq("simulazione_id", sim.id)
        .eq("processing_status", "completed");

      let questionsCompleted = 0;
      if (chunks && !chunksError) {
        // Conta domande uniche con risposte complete
        const uniqueQuestions = new Set(
          chunks
            .filter(c => c.chunk_type === "ai_evaluation") // Valutazioni = domande completate
            .map(c => c.question_number)
        );
        questionsCompleted = uniqueQuestions.size;
      }

      // Calcolo tempo rimanente
      const estimatedTimeRemaining = calculateEstimatedTimeRemaining(
        sim.current_step,
        sim.total_steps,
        sim.time_per_answer || 3
      );

      // Verifica se può essere ripresa
      const canResume = canResumeSimulation(
        sim.status,
        sim.updated_at,
        24 // 24 ore max idle time
      );

      // Calcolo ultima attività
      const lastActivity = sim.updated_at || sim.created_at;

      enrichedSimulations.push({
        id: sim.id,
        materia: sim.materia,
        argomento: sim.argomento,
        sottotema: sim.sottotema,
        difficulty_level: sim.difficulty_level,
        simulation_type: sim.simulation_type,
        ai_persona: sim.ai_persona,
        status: sim.status,
        current_step: sim.current_step,
        total_steps: sim.total_steps,
        progress_percentage: sim.progress_percentage || 0,
        total_questions: sim.total_questions,
        duration_minutes: sim.duration_minutes,
        created_at: sim.created_at,
        started_at: sim.started_at,
        updated_at: sim.updated_at,
        questions_completed: questionsCompleted,
        last_activity: lastActivity,
        estimated_time_remaining: estimatedTimeRemaining,
        quality_score: sim.quality_score,
        can_resume: canResume
      });
    }

    // 📊 Statistiche aggregate
    const totalActiveCount = enrichedSimulations.length;
    const inProgressCount = enrichedSimulations.filter(s => s.status === "in_progress").length;
    const pausedCount = enrichedSimulations.filter(s => s.status === "paused").length;
    const resumableCount = enrichedSimulations.filter(s => s.can_resume).length;

    // 🏷️ Gruppi per materia (per UI)
    const byMateria = enrichedSimulations.reduce((acc: any, sim) => {
      if (!acc[sim.materia]) {
        acc[sim.materia] = [];
      }
      acc[sim.materia].push(sim);
      return acc;
    }, {});

    // 🎯 Suggerimenti intelligenti
    const suggestions = [];
    
    if (resumableCount > 0) {
      suggestions.push(`Hai ${resumableCount} simulazioni che puoi riprendere`);
    }
    
    if (pausedCount > 0) {
      suggestions.push(`${pausedCount} simulazioni in pausa richiedono attenzione`);
    }

    const oldSimulations = enrichedSimulations.filter(s => {
      const hoursSinceUpdate = (Date.now() - new Date(s.updated_at).getTime()) / (1000 * 60 * 60);
      return hoursSinceUpdate > 12;
    });

    if (oldSimulations.length > 0) {
      suggestions.push(`${oldSimulations.length} simulazioni non aggiornate da oltre 12 ore`);
    }

    console.log(`✅ Trovate ${totalActiveCount} simulazioni attive (${resumableCount} riprendibili)`);

    // 🎉 Risposta di successo
    return res.status(200).json({
      success: true,
      active_simulations: enrichedSimulations,
      statistics: {
        total_count: totalActiveCount,
        in_progress_count: inProgressCount,
        paused_count: pausedCount,
        resumable_count: resumableCount,
        by_materia: byMateria
      },
      suggestions,
      meta: {
        last_updated: new Date().toISOString(),
        user_id: userId,
        max_idle_hours: 24
      }
    });

  } catch (error: any) {
    console.error("❌ Errore recupero simulazioni attive:", error);
    
    const errorMessage = error.message || "Errore sconosciuto";
    return res.status(500).json({ 
      error: "Errore durante il recupero delle simulazioni attive", 
      details: errorMessage 
    });
  }
}

// 🔧 Endpoint aggiuntivo per azioni sulle simulazioni attive
export async function handleSimulationAction(
  req: NextApiRequest,
  res: NextApiResponse,
  action: "pause" | "resume" | "abandon"
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metodo non consentito" });
  }

  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Token mancante" });

  const { data: user, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: "Utente non autenticato" });

  const { simulation_id } = req.body;
  if (!simulation_id) {
    return res.status(400).json({ error: "ID simulazione mancante" });
  }

  const userId = user.user?.id;

  try {
    // Verifica permessi
    const { data: simulation, error: simError } = await supabase
      .from("simulazioni_orali")
      .select("id, status, materia, argomento")
      .eq("id", simulation_id)
      .eq("user_id", userId)
      .single();

    if (simError || !simulation) {
      return res.status(404).json({ error: "Simulazione non trovata o accesso negato" });
    }

    let newStatus: string;
    let updateData: any = {
      updated_at: new Date().toISOString()
    };

    switch (action) {
      case "pause":
        if (simulation.status !== "in_progress") {
          return res.status(400).json({ error: "Solo simulazioni in corso possono essere messe in pausa" });
        }
        newStatus = "paused";
        break;

      case "resume":
        if (simulation.status !== "paused") {
          return res.status(400).json({ error: "Solo simulazioni in pausa possono essere riprese" });
        }
        newStatus = "in_progress";
        break;

      case "abandon":
        if (simulation.status === "completed") {
          return res.status(400).json({ error: "Simulazioni completate non possono essere abbandonate" });
        }
        newStatus = "abandoned";
        updateData.completed_at = new Date().toISOString();
        break;

      default:
        return res.status(400).json({ error: "Azione non valida" });
    }

    updateData.status = newStatus;

    // Update simulazione
    const { error: updateError } = await supabase
      .from("simulazioni_orali")
      .update(updateData)
      .eq("id", simulation_id);

    if (updateError) {
      console.error(`❌ Errore ${action} simulazione:`, updateError);
      return res.status(500).json({ error: `Errore durante ${action}` });
    }

    console.log(`✅ Simulazione ${action}: ${simulation.materia} - ${simulation.argomento}`);

    return res.status(200).json({
      success: true,
      action,
      simulation_id,
      new_status: newStatus,
      message: `Simulazione ${action === "abandon" ? "abbandonata" : action === "pause" ? "messa in pausa" : "ripresa"} con successo`
    });

  } catch (error: any) {
    console.error(`❌ Errore ${action} simulazione:`, error);
    return res.status(500).json({ 
      error: `Errore durante ${action} della simulazione`, 
      details: error.message 
    });
  }
}
