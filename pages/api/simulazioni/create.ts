import type { NextApiRequest, NextApiResponse } from "next";
import { OpenAI } from "openai";
import { createClient } from "@supabase/supabase-js";

// 🤖 Configurazione AI Providers
const groqClient = new OpenAI({
  apiKey: process.env.GROQ_API_KEY!,
  baseURL: "https://api.groq.com/openai/v1",
});

const togetherClient = new OpenAI({
  apiKey: process.env.TOGETHER_API_KEY!,
  baseURL: "https://api.together.xyz/v1",
});

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

// 🎯 Tipi TypeScript
type DifficultyLevel = "liceo" | "università" | "magistrale" | "dottorato";
type SimulationType = "standard" | "intensivo" | "express" | "comprehensive";
type AIPersona = "professore_universitario" | "esaminatore_severo" | "tutor_amichevole";

interface CreateSimulationRequest {
  materia: string;
  argomento: string;
  sottotema?: string;
  difficulty_level?: DifficultyLevel;
  simulation_type?: SimulationType;
  ai_persona?: AIPersona;
  total_questions?: number;
  duration_minutes?: number;
}

// 💰 Calcolo costi AI providers
function calcolaCosto(
  model: string,
  promptTokens: number | null,
  completionTokens: number | null
): number | null {
  const prezzi: Record<string, { in: number; out: number }> = {
    "meta-llama/llama-4-maverick-17b-128e-instruct": {
      in: 0.00020, // $0.20 per 1M token input
      out: 0.00060, // $0.60 per 1M token output
    },
  };
  const p = prezzi[model];
  if (!p || promptTokens == null || completionTokens == null) return null;
  return promptTokens * p.in + completionTokens * p.out;
}

const calcolaCostiCartesia = (characters: number): number => {
  // $65 per 1M token, ~4 caratteri per token = $65/250k caratteri
  return (characters / 250000) * 65;
};

// 🧠 Sistema di prompt per prima domanda
function generateFirstQuestionPrompt(
  materia: string, 
  argomento: string, 
  sottotema: string | undefined,
  difficulty: DifficultyLevel,
  persona: AIPersona
): string {
  
  const personaPrompts = {
    professore_universitario: `Sei un professore universitario esperto e comprensivo. Il tuo approccio è accademico ma incoraggiante. Fai domande che testano la comprensione profonda senza essere intimidatorio.`,
    esaminatore_severo: `Sei un esaminatore universitario rigoroso e preciso. Le tue domande sono dirette, specifiche e richiedono conoscenza approfondita. Mantieni standard elevati ma rimani professionale.`,
    tutor_amichevole: `Sei un tutor universitario paziente e di supporto. Le tue domande guidano lo studente verso la risposta corretta, costruendo fiducia mentre valuti la comprensione.`
  };

  const difficultyInstructions = {
    liceo: "Concentrati sui concetti fondamentali e sui principi base. Usa esempi concreti e linguaggio accessibile.",
    università: "Richiedi comprensione teorica solida e capacità di collegamento tra concetti. Usa terminologia tecnica appropriata.",
    magistrale: "Aspettati analisi critica, capacità di sintesi e collegamento interdisciplinare. Richiedi precisione e rigore.",
    dottorato: "Richiedi padronanza completa, capacità di ricerca indipendente e contributi originali al campo di studio."
  };

  const topicContext = sottotema 
    ? `nell'ambito di "${materia}" - argomento "${argomento}" - sottotema specifico "${sottotema}"`
    : `nell'ambito di "${materia}" - argomento "${argomento}"`;

  return `${personaPrompts[persona]}

CONTESTO ESAME:
- Materia: ${materia}
- Argomento principale: ${argomento}
${sottotema ? `- Sottotema specifico: ${sottotema}` : ''}
- Livello: ${difficulty}

ISTRUZIONI PER LA PRIMA DOMANDA:
${difficultyInstructions[difficulty]}

La tua prima domanda deve:
1. Essere aperta ma specifica sull'argomento richiesto
2. Permettere allo studente di mostrare la sua preparazione 
3. Durare circa 3 minuti di risposta parlata
4. Essere appropriata per il livello ${difficulty}

Genera UNA SOLA DOMANDA chiara e diretta. Non aggiungere introduzioni lunghe o spiegazioni aggiuntive.

Domanda:`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metodo non consentito" });
  }

  // 🔐 Autenticazione JWT (stesso pattern del tuo spiegazione.ts)
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Token mancante" });

  const { data: user, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: "Utente non autenticato" });

  // 🌍 CORS Security (stesso pattern)
  const origin = req.headers.origin || "";
  const dominiAutorizzati = ["https://myuniagent.it", "http://localhost:3000"];
  if (!dominiAutorizzati.includes(origin)) {
    return res.status(403).json({ error: "Accesso non consentito da questa origine." });
  }

  const {
    materia,
    argomento,
    sottotema,
    difficulty_level = "università",
    simulation_type = "standard",
    ai_persona = "professore_universitario",
    total_questions = 3,
    duration_minutes = 15
  } = req.body as CreateSimulationRequest;

  // ✅ Validazione input
  if (!materia || typeof materia !== "string" || materia.trim().length < 2) {
    return res.status(400).json({ error: "Materia mancante o non valida (minimo 2 caratteri)" });
  }

  if (!argomento || typeof argomento !== "string" || argomento.trim().length < 3) {
    return res.status(400).json({ error: "Argomento mancante o non valido (minimo 3 caratteri)" });
  }

  if (!["liceo", "università", "magistrale", "dottorato"].includes(difficulty_level)) {
    return res.status(400).json({ error: "Livello difficoltà non valido" });
  }

  if (!["standard", "intensivo", "express", "comprehensive"].includes(simulation_type)) {
    return res.status(400).json({ error: "Tipo simulazione non valido" });
  }

  if (total_questions < 1 || total_questions > 10) {
    return res.status(400).json({ error: "Numero domande deve essere tra 1 e 10" });
  }

  if (duration_minutes < 5 || duration_minutes > 60) {
    return res.status(400).json({ error: "Durata deve essere tra 5 e 60 minuti" });
  }

  const userId = user.user?.id;
  if (!userId) return res.status(400).json({ error: "User ID non trovato" });

  try {
    console.log(`🎯 Creazione simulazione: ${materia} - ${argomento} (${difficulty_level})`);
    
    // 📊 Verifica limiti utente (controllo abbonamento)
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("abbonamento_attivo, ruolo")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      return res.status(400).json({ error: "Profilo utente non trovato" });
    }

    if (!profile.abbonamento_attivo) {
      return res.status(403).json({ 
        error: "Abbonamento richiesto per accedere alle simulazioni orali",
        require_subscription: true 
      });
    }

    // 🎯 Creazione record simulazione nel database
    const totalSteps = (total_questions * 2) + 1; // domanda + risposta per ogni Q + feedback finale

    const { data: newSimulation, error: dbError } = await supabase
      .from("simulazioni_orali")
      .insert({
        user_id: userId,
        materia: materia.trim(),
        argomento: argomento.trim(),
        sottotema: sottotema?.trim() || null,
        difficulty_level,
        simulation_type,
        ai_persona,
        total_questions,
        duration_minutes,
        total_steps: totalSteps,
        status: "in_progress",
        current_step: 1,
        language_code: "it-IT",
        timezone: "Europe/Rome",
        started_at: new Date().toISOString()
      })
      .select("*")
      .single();

    if (dbError || !newSimulation) {
      console.error("❌ Errore creazione simulazione:", dbError);
      return res.status(500).json({ error: "Errore nella creazione della simulazione" });
    }

    // 🤖 Generazione prima domanda con Llama-4 Maverick
    const modelloAI = "meta-llama/llama-4-maverick-17b-128e-instruct";
    const systemPrompt = generateFirstQuestionPrompt(
      materia.trim(), 
      argomento.trim(), 
      sottotema?.trim(),
      difficulty_level,
      ai_persona
    );

    const startTime = Date.now();
    let tokenUsage: any = {};

    const chatCompletion = await groqClient.chat.completions.create({
      model: modelloAI,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Genera la prima domanda d'esame per valutare la conoscenza su: ${argomento}` }
      ],
      temperature: 0.4, // Leggermente più creativo rispetto a spiegazioni
      max_tokens: 300, // Prima domanda dovrebbe essere concisa
    });

    const latencyMs = Date.now() - startTime;
    const firstQuestion = chatCompletion.choices[0]?.message?.content?.trim();
    tokenUsage = chatCompletion.usage || {};

    if (!firstQuestion) {
      throw new Error("Nessuna domanda generata dall'AI");
    }

    // 💰 Calcolo costo
    const costoUsd = calcolaCosto(
      modelloAI, 
      tokenUsage.prompt_tokens, 
      tokenUsage.completion_tokens
    );

    // 🔊 FASE 2: Text-to-Speech per prima domanda
    let firstQuestionTTSData = null;
    try {
      const ttsResponse = await togetherClient.audio.speech.create({
        model: "cartesia-sonic-2", // Cartesia su Together.ai
        input: firstQuestion,
        voice: "voice-italian-professional", // Voice italiana professionale
        response_format: "mp3",
        speed: 1.0
      });

      // ✅ Stream diretto - converte in base64 per frontend
      const audioBuffer = await ttsResponse.arrayBuffer();
      const audioBase64 = Buffer.from(audioBuffer).toString('base64');
      firstQuestionTTSData = `data:audio/mp3;base64,${audioBase64}`;
      
    } catch (ttsError) {
      console.error("❌ Errore TTS prima domanda:", ttsError);
      // Continua anche senza TTS
    }

    // 💰 Calcolo costo incluso TTS
    const ttsCost = calcolaCostiCartesia(firstQuestion.length);
    const costoEur = costoUsd ? (costoUsd + ttsCost) * 0.92 : null; // USD to EUR

    // 💾 Salvataggio chunk prima domanda
    const { data: firstChunk, error: chunkError } = await supabase
      .from("simulazione_chunks")
      .insert({
        simulazione_id: newSimulation.id,
        chunk_type: "ai_question",
        chunk_order: 1,
        question_number: 1,
        ai_content: firstQuestion,
        ai_prompt_used: systemPrompt,
        ai_model_used: modelloAI,
        ai_tokens_input: tokenUsage.prompt_tokens,
        ai_tokens_output: tokenUsage.completion_tokens,
        ai_cost_eur: costoEur,
        ai_latency_ms: latencyMs,
        processing_status: "completed",
        processing_completed_at: new Date().toISOString()
      })
      .select("*")
      .single();

    if (chunkError) {
      console.error("❌ Errore salvataggio chunk:", chunkError);
    }

    // 📊 Update simulazione con costi e token
    const { error: updateError } = await supabase
      .from("simulazioni_orali")
      .update({
        total_tokens_used: tokenUsage.prompt_tokens + tokenUsage.completion_tokens,
        total_cost_eur: costoEur || 0,
        current_step: 2, // Prossimo step: risposta studente
        updated_at: new Date().toISOString()
      })
      .eq("id", newSimulation.id);

    if (updateError) {
      console.error("❌ Errore update simulazione:", updateError);
    }

    console.log(`✅ Simulazione creata: ${newSimulation.id}`);

    // 🎉 Risposta di successo
    return res.status(201).json({
      success: true,
      simulation: {
        id: newSimulation.id,
        materia: newSimulation.materia,
        argomento: newSimulation.argomento,
        sottotema: newSimulation.sottotema,
        difficulty_level: newSimulation.difficulty_level,
        total_questions: newSimulation.total_questions,
        current_step: 2,
        total_steps: newSimulation.total_steps,
        status: newSimulation.status
      },
      first_question: firstQuestion,
      first_question_tts_data: firstQuestionTTSData, // ✅ Stream diretto base64
      first_question_tts_text: firstQuestion, // Fallback per browser TTS
      next_action: "user_audio_upload",
      message: "Simulazione iniziata con successo. Registra la tua risposta audio."
    });

  } catch (error: any) {
    console.error("❌ Errore generale creazione simulazione:", error);
    
    // 🚨 Cleanup in caso di errore
    if ((error as any).simulationId) {
      await supabase
        .from("simulazioni_orali")
        .update({ status: "error", error_logs: [{ error: error.message, timestamp: new Date().toISOString() }] })
        .eq("id", (error as any).simulationId);
    }

    const errorMessage = error.response?.data?.error?.message || error.message || "Errore sconosciuto";
    return res.status(500).json({ 
      error: "Errore durante la creazione della simulazione", 
      details: errorMessage 
    });
  }
}
