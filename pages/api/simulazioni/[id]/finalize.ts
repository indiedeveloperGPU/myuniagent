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

// 🎯 Tipi per risultati finali
interface FinalScores {
  contenuto: number;
  chiarezza: number;
  approfondimento: number;
  linguaggio: number;
  overall: number;
}

interface FinalResults {
  final_score: number;
  grade_letter: string;
  grade_points: number;
  grade_description: string;
  scores_breakdown: FinalScores;
  strengths: string[];
  weaknesses: string[];
  improvement_suggestions: string[];
  final_feedback_text: string;
  recommended_study_areas: string[];
  suggested_next_topics: string[];
}

// 💰 Calcolo costi AI providers
function calcolaCosto(
  model: string,
  promptTokens: number | null,
  completionTokens: number | null
): number | null {
  const prezzi: Record<string, { in: number; out: number }> = {
    "meta-llama/llama-4-maverick-17b-128e-instruct": {
      in: 0.00020,
      out: 0.00060,
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

// 🎓 Sistema di grading adattato al sistema italiano
function calculateGrade(score: number, difficulty: string): { letter: string; points: number; description: string } {
  if (difficulty === "liceo") {
    // Sistema 0-10 per licei
    if (score >= 9.5) return { letter: "10", points: 10, description: "Eccellente" };
    if (score >= 9.0) return { letter: "9+", points: 9.5, description: "Ottimo plus" };
    if (score >= 8.5) return { letter: "9", points: 9, description: "Ottimo" };
    if (score >= 8.0) return { letter: "8+", points: 8.5, description: "Distinto plus" };
    if (score >= 7.5) return { letter: "8", points: 8, description: "Distinto" };
    if (score >= 7.0) return { letter: "7+", points: 7.5, description: "Buono plus" };
    if (score >= 6.5) return { letter: "7", points: 7, description: "Buono" };
    if (score >= 6.0) return { letter: "6+", points: 6.5, description: "Sufficiente plus" };
    if (score >= 5.5) return { letter: "6", points: 6, description: "Sufficiente" };
    if (score >= 5.0) return { letter: "5+", points: 5.5, description: "Insufficiente lieve" };
    return { letter: "5", points: 5, description: "Insufficiente" };
  } else {
    // Sistema 18-30 per università/magistrale/dottorato
    if (score >= 29.5) return { letter: "30L", points: 30, description: "30 e Lode" };
    if (score >= 29.0) return { letter: "30", points: 30, description: "Eccellente" };
    if (score >= 28.0) return { letter: "29", points: 29, description: "Ottimo" };
    if (score >= 27.0) return { letter: "28", points: 28, description: "Ottimo" };
    if (score >= 26.0) return { letter: "27", points: 27, description: "Buono" };
    if (score >= 25.0) return { letter: "26", points: 26, description: "Buono" };
    if (score >= 24.0) return { letter: "25", points: 25, description: "Buono" };
    if (score >= 23.0) return { letter: "24", points: 24, description: "Discreto" };
    if (score >= 22.0) return { letter: "23", points: 23, description: "Discreto" };
    if (score >= 21.0) return { letter: "22", points: 22, description: "Discreto" };
    if (score >= 20.0) return { letter: "21", points: 21, description: "Sufficiente" };
    if (score >= 19.0) return { letter: "20", points: 20, description: "Sufficiente" };
    if (score >= 18.0) return { letter: "19", points: 19, description: "Sufficiente" };
    return { letter: "18", points: 18, description: "Appena sufficiente" };
  }
}

// 📊 Calcolo percentile reale da database
async function calculateRealPercentile(
  finalScore: number, 
  materia: string, 
  difficulty: string
): Promise<number> {
  try {
    // Query per ottenere tutti i punteggi della stessa materia e livello
    const { data: similarResults, error } = await supabase
      .from("simulazione_results")
      .select("final_score")
      .eq("comparison_cohort", `${materia}_${difficulty}`)
      .not("final_score", "is", null);

    if (error || !similarResults || similarResults.length < 5) {
      // Se non ci sono abbastanza dati, ritorna percentile basato su score
      return Math.min(95, Math.max(5, finalScore * 3.2)); // Approssimazione ragionevole
    }

    // Calcola percentile reale
    const scores = similarResults.map(r => r.final_score).sort((a, b) => a - b);
    const lowerScores = scores.filter(score => score < finalScore).length;
    const percentile = (lowerScores / scores.length) * 100;
    
    return Math.round(percentile);
    
  } catch (error) {
    console.error("❌ Errore calcolo percentile:", error);
    // Fallback
    return Math.min(95, Math.max(5, finalScore * 3.2));
  }
}

// 🧠 Prompt per analisi finale completa
function generateFinalAnalysisPrompt(
  materia: string,
  argomento: string,
  difficulty: string,
  persona: string,
  questionsAndAnswers: Array<{
    question: string;
    answer: string;
    evaluation: any;
    score: number;
  }>
): string {
  
  const qaContext = questionsAndAnswers.map((qa, i) => 
    `DOMANDA ${i+1}: ${qa.question}
RISPOSTA STUDENTE: ${qa.answer}
VALUTAZIONE: ${JSON.stringify(qa.evaluation, null, 2)}
PUNTEGGIO: ${qa.score}

`).join('\n');

  const personaContext = {
    professore_universitario: "Come professore universitario esperto, fornisci un'analisi accademica equilibrata e costruttiva.",
    esaminatore_severo: "Come esaminatore rigoroso, mantieni standard elevati ma riconosci i meriti dimostrati.",
    tutor_amichevole: "Come tutor di supporto, evidenzia i progressi e guida verso miglioramenti specifici."
  };

  // Sistema di valutazione adattato
  const scoringSystem = difficulty === "liceo" ? {
    scale: "0-10",
    description: "scala 0-10 tipica delle scuole superiori italiane"
  } : {
    scale: "18-30", 
    description: "scala 18-30 tipica delle università italiane"
  };

  return `Sei un ${persona.replace('_', ' ')} che deve fornire una valutazione finale completa di un esame orale.

CONTESTO ESAME:
- Materia: ${materia}
- Argomento: ${argomento}
- Livello: ${difficulty}
- Sistema di valutazione: ${scoringSystem.description}
- Approccio: ${personaContext[persona as keyof typeof personaContext]}

PERFORMANCE COMPLETA DELLO STUDENTE:
${qaContext}

ISTRUZIONI PER ANALISI FINALE:

1. Calcola i punteggi medi per ogni criterio basandoti sulle valutazioni individuali
2. Identifica 3-5 punti di forza principali dimostrati
3. Identifica 2-4 aree di miglioramento specifiche
4. Fornisci 3-5 suggerimenti pratici e actionable
5. Scrivi un feedback finale professionale di 4-6 frasi
6. Suggerisci 3-4 argomenti correlati per approfondimento
7. Raccomanda 2-3 aree di studio specifiche

FORMATO RISPOSTA RICHIESTO (JSON):
{
  "scores_analysis": {
    "contenuto_medio": 7.8,
    "chiarezza_media": 8.1,
    "approfondimento_medio": 7.2,
    "linguaggio_medio": 7.9,
    "tendenza_performance": "crescente|decrescente|stabile",
    "punto_piu_forte": "Descrizione del miglior aspetto",
    "punto_piu_debole": "Descrizione dell'aspetto da migliorare"
  },
  "strengths": [
    "Punto di forza specifico 1",
    "Punto di forza specifico 2",
    "Punto di forza specifico 3"
  ],
  "weaknesses": [
    "Area miglioramento 1",
    "Area miglioramento 2"
  ],
  "improvement_suggestions": [
    "Suggerimento pratico 1",
    "Suggerimento pratico 2",
    "Suggerimento pratico 3"
  ],
  "final_feedback": "Feedback finale professionale e costruttivo di 4-6 frasi che riassume la performance complessiva e incoraggia lo studente.",
  "recommended_study_areas": [
    "Area di studio 1",
    "Area di studio 2",
    "Area di studio 3"
  ],
  "suggested_next_topics": [
    "Argomento correlato 1",
    "Argomento correlato 2", 
    "Argomento correlato 3"
  ],
  "study_plan": {
    "immediate_actions": ["Azione 1", "Azione 2"],
    "weekly_goals": ["Goal 1", "Goal 2"],
    "resources_suggested": ["Risorsa 1", "Risorsa 2"]
  }
}

Rispondi SOLO con il JSON valido, senza testo aggiuntivo.`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metodo non consentito" });
  }

  // 🔐 Autenticazione JWT
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

  const simulationId = req.query.id as string;
  if (!simulationId) {
    return res.status(400).json({ error: "ID simulazione mancante" });
  }

  const userId = user.user?.id;

  try {
    console.log(`🏁 Finalizzazione simulazione: ${simulationId}`);

    // 📊 Verifica simulazione esistente e permessi
    const { data: simulation, error: simError } = await supabase
      .from("simulazioni_orali")
      .select("*")
      .eq("id", simulationId)
      .eq("user_id", userId)
      .single();

    if (simError || !simulation) {
      return res.status(404).json({ error: "Simulazione non trovata o accesso negato" });
    }

    if (simulation.status !== "completed" && simulation.status !== "in_progress") {
      return res.status(400).json({ error: "Simulazione non può essere finalizzata" });
    }

    // Verifica se già finalizzata
    const { data: existingResults, error: existingError } = await supabase
      .from("simulazione_results")
      .select("id")
      .eq("simulazione_id", simulationId)
      .single();

    if (existingResults) {
      return res.status(400).json({ 
        error: "Simulazione già finalizzata",
        results_id: existingResults.id 
      });
    }

    // 📋 Recupera tutti i chunks per analisi completa
    const { data: allChunks, error: chunksError } = await supabase
      .from("simulazione_chunks")
      .select("*")
      .eq("simulazione_id", simulationId)
      .order("chunk_order", { ascending: true });

    if (chunksError || !allChunks || allChunks.length === 0) {
      return res.status(400).json({ error: "Dati simulazione incompleti" });
    }

    // 🔄 Raggruppa chunks per domanda
    const questionsData: Array<{
      question: string;
      answer: string;
      evaluation: any;
      score: number;
    }> = [];

    // Raggruppa per question_number
    const groupedByQuestion = allChunks.reduce((acc: any, chunk) => {
      const qNum = chunk.question_number || 0;
      if (!acc[qNum]) acc[qNum] = {};
      
      if (chunk.chunk_type === "ai_question") {
        acc[qNum].question = chunk.ai_content;
      } else if (chunk.chunk_type === "user_transcript") {
        acc[qNum].answer = chunk.transcript_cleaned || chunk.transcript_raw;
      } else if (chunk.chunk_type === "ai_evaluation") {
        acc[qNum].evaluation = chunk.evaluation_data;
        acc[qNum].score = chunk.partial_score || 0;
      }
      
      return acc;
    }, {});

    // Costruisci array ordinato
    for (const qNum of Object.keys(groupedByQuestion).sort((a, b) => parseInt(a) - parseInt(b))) {
      const qData = groupedByQuestion[qNum];
      if (qData.question && qData.answer && qData.evaluation && qData.score) {
        questionsData.push(qData);
      }
    }

    if (questionsData.length === 0) {
      return res.status(400).json({ error: "Nessuna domanda completa trovata" });
    }

    // 🧮 Calcolo punteggi aggregati
    const allScores = questionsData.map(q => q.evaluation?.scores || {});
    const avgScores = {
      contenuto: allScores.reduce((sum, s) => sum + (s.contenuto || 0), 0) / allScores.length,
      chiarezza: allScores.reduce((sum, s) => sum + (s.chiarezza || 0), 0) / allScores.length,
      approfondimento: allScores.reduce((sum, s) => sum + (s.approfondimento || 0), 0) / allScores.length,
      linguaggio: allScores.reduce((sum, s) => sum + (s.linguaggio || 0), 0) / allScores.length,
    };

    // Calcolo punteggio finale ponderato
    const finalScore = (
      avgScores.contenuto * 0.40 +      // 40% contenuto
      avgScores.chiarezza * 0.25 +      // 25% chiarezza  
      avgScores.approfondimento * 0.25 + // 25% approfondimento
      avgScores.linguaggio * 0.10        // 10% linguaggio
    );

    const grade = calculateGrade(finalScore, simulation.difficulty_level);

    // 🧠 Analisi finale con AI per insights avanzati
    const finalAnalysisPrompt = generateFinalAnalysisPrompt(
      simulation.materia,
      simulation.argomento,
      simulation.difficulty_level,
      simulation.ai_persona,
      questionsData
    );

    const startTime = Date.now();
    const analysisResponse = await groqClient.chat.completions.create({
      model: "meta-llama/llama-4-maverick-17b-128e-instruct",
      messages: [
        { role: "system", content: finalAnalysisPrompt },
        { role: "user", content: "Fornisci l'analisi finale completa della performance dello studente." }
      ],
      temperature: 0.3,
      max_tokens: 1500,
    });

    const latencyMs = Date.now() - startTime;
    const analysisText = analysisResponse.choices[0]?.message?.content || "";
    const analysisUsage = analysisResponse.usage ?? { prompt_tokens: 0, completion_tokens: 0 };

    // Parse analisi AI
    let aiAnalysis;
    try {
      aiAnalysis = JSON.parse(analysisText);
    } catch (e) {
      console.error("❌ Errore parsing analisi finale:", analysisText);
      // Fallback analisi base
      aiAnalysis = {
        scores_analysis: {
          tendenza_performance: "stabile",
          punto_piu_forte: "Partecipazione attiva",
          punto_piu_debole: "Necessario maggiore approfondimento"
        },
        strengths: ["Conoscenza di base solida", "Capacità espositiva"],
        weaknesses: ["Approfondimento teorico", "Collegamenti interdisciplinari"],
        improvement_suggestions: ["Studiare esempi pratici", "Approfondire teoria"],
        final_feedback: "Performance complessiva soddisfacente con potenziale di miglioramento.",
        recommended_study_areas: [simulation.argomento],
        suggested_next_topics: ["Argomenti correlati"],
        study_plan: {
          immediate_actions: ["Rivedere teoria"],
          weekly_goals: ["Praticare esposizione"],
          resources_suggested: ["Libri di testo"]
        }
      };
    }

    // 📊 Calcolo percentile reale
    const percentileRank = await calculateRealPercentile(
      finalScore, 
      simulation.materia, 
      simulation.difficulty_level
    );

    // 🎯 Costruzione risultati finali
    const finalResults: FinalResults = {
      final_score: Math.round(finalScore * 100) / 100,
      grade_letter: grade.letter,
      grade_points: grade.points,
      grade_description: grade.description,
      scores_breakdown: {
        ...avgScores,
        overall: finalScore
      },
      strengths: aiAnalysis.strengths || [],
      weaknesses: aiAnalysis.weaknesses || [],
      improvement_suggestions: aiAnalysis.improvement_suggestions || [],
      final_feedback_text: aiAnalysis.final_feedback || `Simulazione completata con voto ${grade.letter} (${grade.description}).`,
      recommended_study_areas: aiAnalysis.recommended_study_areas || [],
      suggested_next_topics: aiAnalysis.suggested_next_topics || []
    };

    // 🔊 FASE: Text-to-Speech per risultati finali (stream diretto)
    let finalTTSAudioData = null;
    const finalTTSText = `Complimenti! Hai completato la simulazione di ${simulation.materia} su ${simulation.argomento}. 
Il tuo voto finale è ${finalResults.grade_letter} - ${finalResults.grade_description}. 
${finalResults.final_feedback_text}`;

    try {
      const ttsResponse = await togetherClient.audio.speech.create({
        model: "cartesia-sonic-2",
        input: finalTTSText,
        voice: "voice-italian-professional",
        response_format: "mp3",
        speed: 1.0
      });

      // ✅ Stream diretto - converte in base64 per frontend
      const audioBuffer = await ttsResponse.arrayBuffer();
      const audioBase64 = Buffer.from(audioBuffer).toString('base64');
      finalTTSAudioData = `data:audio/mp3;base64,${audioBase64}`;
      
    } catch (ttsError) {
      console.error("❌ Errore TTS risultati finali:", ttsError);
      // Continua senza TTS se fallisce
    }

    // Calcolo metriche performance
    const totalDuration = questionsData.length * (simulation.time_per_answer || 3);
    const avgResponseTime = totalDuration / questionsData.length;

    // 💾 Salvataggio risultati nel database
    const { data: savedResults, error: saveError } = await supabase
      .from("simulazione_results")
      .insert({
        simulazione_id: simulationId,
        user_id: userId,
        final_score: finalResults.final_score,
        grade_letter: finalResults.grade_letter,
        grade_points: finalResults.grade_points,
        scores_breakdown: finalResults.scores_breakdown,
        strengths: finalResults.strengths,
        weaknesses: finalResults.weaknesses,
        improvement_suggestions: finalResults.improvement_suggestions,
        final_feedback_text: finalResults.final_feedback_text,
        recommended_study_areas: finalResults.recommended_study_areas,
        suggested_next_topics: finalResults.suggested_next_topics,
        percentile_rank: percentileRank,
        comparison_cohort: `${simulation.materia}_${simulation.difficulty_level}`,
        total_duration_minutes: totalDuration,
        average_response_time: avgResponseTime,
        study_plan_generated: aiAnalysis.study_plan || null
      })
      .select("*")
      .single();

    if (saveError) {
      console.error("❌ Errore salvataggio risultati:", saveError);
      return res.status(500).json({ error: "Errore nel salvataggio dei risultati" });
    }

    // 💰 Update costi finali con TTS
    const finalAnalysisCost = calcolaCosto(
      "meta-llama/llama-4-maverick-17b-128e-instruct",
      analysisUsage.prompt_tokens,
      analysisUsage.completion_tokens
    );
    const finalTTSCost = calcolaCostiCartesia(finalTTSText.length);
    const finalCostEur = ((finalAnalysisCost || 0) + finalTTSCost) * 0.92; // USD to EUR

    // 🏁 Update simulazione come completata
    const { error: updateError } = await supabase
      .from("simulazioni_orali")
      .update({
        status: "completed",
        quality_score: finalResults.final_score,
        total_cost_eur: (simulation.total_cost_eur || 0) + finalCostEur,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", simulationId);

    if (updateError) {
      console.error("❌ Errore update simulazione:", updateError);
    }

    console.log(`✅ Simulazione finalizzata: Voto ${finalResults.grade_letter} (${finalResults.grade_description})`);

    // 🎉 Risposta di successo
    return res.status(200).json({
      success: true,
      results: finalResults,
      tts_audio_data: finalTTSAudioData, // ✅ Stream diretto base64
      tts_text: finalTTSText, // Fallback per browser TTS
      simulation_summary: {
        id: simulationId,
        materia: simulation.materia,
        argomento: simulation.argomento,
        total_questions: questionsData.length,
        duration_minutes: totalDuration,
        difficulty_level: simulation.difficulty_level
      },
      performance_metrics: {
        percentile_rank: percentileRank,
        questions_answered: questionsData.length,
        average_score_per_question: questionsData.reduce((sum, q) => sum + q.score, 0) / questionsData.length,
        improvement_trend: aiAnalysis.scores_analysis?.tendenza_performance || "stabile"
      },
      next_actions: {
        view_detailed_analysis: true,
        schedule_next_simulation: true,
        access_study_plan: Boolean(aiAnalysis.study_plan)
      }
    });

  } catch (error: any) {
    console.error("❌ Errore finalizzazione simulazione:", error);

    // Update simulazione con errore
    await supabase
      .from("simulazioni_orali")
      .update({ 
        status: "error",
        error_logs: [{ error: error.message, timestamp: new Date().toISOString() }],
        updated_at: new Date().toISOString()
      })
      .eq("id", simulationId);

    const errorMessage = error.response?.data?.error?.message || error.message || "Errore sconosciuto";
    return res.status(500).json({ 
      error: "Errore durante la finalizzazione della simulazione", 
      details: errorMessage 
    });
  }
}
