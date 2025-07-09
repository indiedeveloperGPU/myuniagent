import type { NextApiRequest, NextApiResponse } from "next";
import { OpenAI } from "openai";
import { createClient } from "@supabase/supabase-js";
import formidable from 'formidable';
import fs from 'fs';

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
    bodyParser: false, // Necessario per gestire file upload
    sizeLimit: '50mb', // Limite per file audio
  },
};

// 💰 Calcolo costi AI providers
const calcolaCostiGroq = (model: string, promptTokens: number | null, completionTokens: number | null): number => {
  const prezzi = {
    "meta-llama/llama-4-maverick-17b-128e-instruct": { in: 0.00020, out: 0.00060 },
    "distil-whisper-large-v3-en": { in: 0.00002, out: 0 } // $0.02/ora, convertito per token
  };
  const p = prezzi[model as keyof typeof prezzi];
  if (!p || promptTokens == null || completionTokens == null) return 0;
  return (promptTokens * p.in) + (completionTokens * p.out);
};

const calcolaCostiCartesia = (characters: number): number => {
  // $65 per 1M token, ~4 caratteri per token = $65/250k caratteri
  return (characters / 250000) * 65;
};

// 🎯 Sistema di valutazione intelligente
function generateEvaluationPrompt(
  materia: string,
  argomento: string, 
  domanda: string,
  trascrizione: string,
  questionNumber: number,
  difficulty: string,
  persona: string
): string {
  
  const personaStyles = {
    professore_universitario: "Valuta con approccio accademico equilibrato, riconoscendo sia punti di forza che aree di miglioramento.",
    esaminatore_severo: "Valuta con standard elevati, focalizzandoti su precisione, completezza e rigore della risposta.",
    tutor_amichevole: "Valuta incoraggiando lo studente, evidenziando progressi e guidando verso miglioramenti costruttivi."
  };

  // Sistema di valutazione adattato al livello italiano
  const scoringSystem = difficulty === "liceo" ? {
    scale: "0-10",
    description: "Usa la scala 0-10 tipica delle scuole superiori italiane",
    thresholds: "10=eccellente, 8-9=ottimo, 7=buono, 6=sufficiente, 5=insufficiente, <5=gravemente insufficiente"
  } : {
    scale: "18-30",
    description: "Usa la scala 18-30 tipica delle università italiane", 
    thresholds: "30=eccellente, 28-29=ottimo, 25-27=buono, 22-24=discreto, 18-21=sufficiente, <18=insufficiente"
  };

  return `Sei un ${persona.replace('_', ' ')} che sta valutando una risposta orale di esame.

CONTESTO VALUTAZIONE:
- Materia: ${materia}
- Argomento: ${argomento}
- Domanda ${questionNumber}: "${domanda}"
- Livello: ${difficulty}
- Sistema di valutazione: ${scoringSystem.scale} (${scoringSystem.description})

RISPOSTA STUDENTE TRASCRITTA:
"${trascrizione}"

ISTRUZIONI VALUTAZIONE:
${personaStyles[persona as keyof typeof personaStyles]}

Valuta la risposta secondo questi criteri (punteggio ${scoringSystem.scale} per ogni aspetto):

1. CONTENUTO (40%): Correttezza, completezza, precisione delle informazioni
2. CHIAREZZA (25%): Organizzazione logica, chiarezza espositiva, struttura
3. APPROFONDIMENTO (25%): Livello di analisi, collegamenti, esempi pertinenti  
4. LINGUAGGIO (10%): Terminologia appropriata, registro linguistico adeguato

SCALA DI VALUTAZIONE:
${scoringSystem.thresholds}

FORMATO RISPOSTA RICHIESTO (JSON):
{
  "scores": {
    "contenuto": ${difficulty === "liceo" ? "7.5" : "25"},
    "chiarezza": ${difficulty === "liceo" ? "8.0" : "26"}, 
    "approfondimento": ${difficulty === "liceo" ? "6.5" : "23"},
    "linguaggio": ${difficulty === "liceo" ? "7.0" : "24"}
  },
  "score_totale": ${difficulty === "liceo" ? "7.25" : "24.5"},
  "punti_forza": ["Aspetto positivo 1", "Aspetto positivo 2"],
  "aree_miglioramento": ["Area da migliorare 1", "Area da migliorare 2"],
  "feedback_breve": "Feedback costruttivo di 2-3 frasi per lo studente",
  "suggerimenti": ["Suggerimento concreto 1", "Suggerimento concreto 2"]
}

IMPORTANTE: Usa rigorosamente la scala ${scoringSystem.scale} per tutti i punteggi.
Rispondi SOLO con il JSON valido, senza testo aggiuntivo.`;
}

// 🧠 Generazione domanda successiva
function generateNextQuestionPrompt(
  materia: string,
  argomento: string,
  questionNumber: number,
  previousQA: Array<{question: string, answer: string, score: number}>,
  difficulty: string,
  persona: string
): string {

  const contextPrevious = previousQA.map((qa, i) => 
    `Domanda ${i+1}: ${qa.question}\nRisposta: ${qa.answer}\nPunteggio: ${qa.score}/10`
  ).join('\n\n');

  return `Sei un ${persona.replace('_', ' ')} che sta conducendo un esame orale.

CONTESTO:
- Materia: ${materia}
- Argomento: ${argomento}  
- Questa è la domanda numero ${questionNumber}
- Livello: ${difficulty}

DOMANDE E RISPOSTE PRECEDENTI:
${contextPrevious}

ISTRUZIONI PER DOMANDA ${questionNumber}:
1. Basa la prossima domanda sull'andamento dell'esame finora
2. Se lo studente ha risposto bene, approfondisci o colleghi ad aspetti correlati
3. Se ha avuto difficoltà, riprendi concetti base o offri un'altra prospettiva
4. Mantieni progressione logica e coerenza tematica
5. La domanda deve durare circa 3 minuti di risposta

Genera UNA SOLA domanda chiara e appropriata per il livello ${difficulty}.
Non aggiungere introduzioni o commenti.

Domanda ${questionNumber}:`;
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

    if (simulation.status !== "in_progress") {
      return res.status(400).json({ error: "Simulazione non è in corso" });
    }

    // 📝 Parse del file audio con formidable
    const form = formidable({ 
      maxFileSize: 50 * 1024 * 1024, // 50MB
      allowEmptyFiles: false,
    });

    const [fields, files] = await form.parse(req);
    
    const audioFile = Array.isArray(files.audio) ? files.audio[0] : files.audio;
    if (!audioFile || !audioFile.filepath) {
      return res.status(400).json({ error: "File audio mancante" });
    }

    const currentQuestionNumber = Math.ceil(simulation.current_step / 2);
    console.log(`🎤 Processing audio per domanda ${currentQuestionNumber}, step ${simulation.current_step}`);

    // 🎤 FASE 1: Trascrizione con Distil-Whisper (Groq)
    const audioBuffer = fs.readFileSync(audioFile.filepath);
    const audioBase64 = audioBuffer.toString('base64');
    
    const transcriptionStartTime = Date.now();
    
    // Crea un file temporaneo per Whisper
    const tempAudioPath = `/tmp/audio_${Date.now()}.webm`;
    fs.writeFileSync(tempAudioPath, audioBuffer);

    const transcription = await groqClient.audio.transcriptions.create({
      file: fs.createReadStream(tempAudioPath),
      model: "distil-whisper-large-v3-en", // Modello Groq Whisper
      language: "it", // Italiano
      response_format: "verbose_json"
    });

    const transcriptionLatency = Date.now() - transcriptionStartTime;
    const transcriptText = transcription.text || "";
    const confidence = (transcription as any).confidence || 0.95;

    // Cleanup file temporaneo
    fs.unlinkSync(tempAudioPath);
    fs.unlinkSync(audioFile.filepath);

    if (!transcriptText || transcriptText.trim().length < 10) {
      return res.status(400).json({ 
        error: "Trascrizione audio troppo breve o non valida. Riprova con un audio più chiaro.",
        transcript: transcriptText 
      });
    }

    // 💾 Salva chunk trascrizione
    const { data: transcriptChunk, error: transcriptError } = await supabase
      .from("simulazione_chunks")
      .insert({
        simulazione_id: simulationId,
        chunk_type: "user_transcript",
        chunk_order: simulation.current_step,
        question_number: currentQuestionNumber,
        transcript_raw: transcriptText,
        transcript_cleaned: transcriptText.trim(),
        transcript_confidence: confidence,
        transcript_language: "it-IT",
        audio_duration_seconds: audioFile.size ? (audioFile.size / 16000) : null, // Stima
        processing_status: "completed",
        processing_completed_at: new Date().toISOString()
      })
      .select("*")
      .single();

    if (transcriptError) {
      console.error("❌ Errore salvataggio trascrizione:", transcriptError);
    }

    // 📊 FASE 2: Recupera domanda corrente per valutazione
    const { data: currentQuestion, error: questionError } = await supabase
      .from("simulazione_chunks")
      .select("ai_content")
      .eq("simulazione_id", simulationId)
      .eq("chunk_type", "ai_question")
      .eq("question_number", currentQuestionNumber)
      .single();

    if (questionError || !currentQuestion?.ai_content) {
      return res.status(400).json({ error: "Domanda corrente non trovata" });
    }

    // 🧠 FASE 3: Valutazione risposta con Llama-4
    const evaluationPrompt = generateEvaluationPrompt(
      simulation.materia,
      simulation.argomento,
      currentQuestion.ai_content,
      transcriptText,
      currentQuestionNumber,
      simulation.difficulty_level,
      simulation.ai_persona
    );

    const evaluationStartTime = Date.now();
    const evaluationResponse = await groqClient.chat.completions.create({
      model: "meta-llama/llama-4-maverick-17b-128e-instruct",
      messages: [
        { role: "system", content: evaluationPrompt },
        { role: "user", content: `Valuta questa risposta: "${transcriptText}"` }
      ],
      temperature: 0.2,
      max_tokens: 1000,
    });

    const evaluationLatency = Date.now() - evaluationStartTime;
    const evaluationText = evaluationResponse.choices[0]?.message?.content || "";
    const evaluationUsage = evaluationResponse.usage ?? { prompt_tokens: 0, completion_tokens: 0 };

    // Parse valutazione JSON
    let evaluationData;
    try {
      evaluationData = JSON.parse(evaluationText);
    } catch (e) {
      console.error("❌ Errore parsing valutazione JSON:", evaluationText);
      // Fallback valutazione base
      evaluationData = {
        scores: { contenuto: 7.0, chiarezza: 7.0, approfondimento: 6.5, linguaggio: 7.0 },
        score_totale: 6.9,
        punti_forza: ["Risposta fornita"],
        aree_miglioramento: ["Maggiore dettaglio"],
        feedback_breve: "Risposta ricevuta e valutata.",
        suggerimenti: ["Continua così"]
      };
    }

    // 💾 Salva chunk valutazione
    const { data: evaluationChunk, error: evalError } = await supabase
      .from("simulazione_chunks")
      .insert({
        simulazione_id: simulationId,
        chunk_type: "ai_evaluation",
        chunk_order: simulation.current_step + 1,
        question_number: currentQuestionNumber,
        ai_content: evaluationText,
        ai_model_used: "meta-llama/llama-4-maverick-17b-128e-instruct",
        ai_tokens_input: evaluationUsage.prompt_tokens ?? null,
        ai_tokens_output: evaluationUsage.completion_tokens ?? null,
        ai_latency_ms: evaluationLatency,
        evaluation_data: evaluationData,
        partial_score: evaluationData.score_totale,
        processing_status: "completed",
        processing_completed_at: new Date().toISOString()
      })
      .select("*")
      .single();

    if (evalError) {
      console.error("❌ Errore salvataggio valutazione:", evalError);
    }

    // 🎯 FASE 4: Genera prossima domanda (se non è l'ultima)
    let nextQuestion = null;
    let nextQuestionChunk = null;
    let isLastQuestion = currentQuestionNumber >= simulation.total_questions;

    if (!isLastQuestion) {
      // Recupera storico domande/risposte per contesto
      const { data: previousQA, error: historyError } = await supabase
        .from("simulazione_chunks")
        .select("ai_content, transcript_cleaned, partial_score, question_number, chunk_type")
        .eq("simulazione_id", simulationId)
        .in("chunk_type", ["ai_question", "user_transcript", "ai_evaluation"])
        .order("chunk_order", { ascending: true });

      const qaHistory = [];
      if (previousQA) {
        // Raggruppa per question_number
        const grouped = previousQA.reduce((acc: any, chunk) => {
          const qNum = chunk.question_number || 0;
          if (!acc[qNum]) acc[qNum] = {};
          
          if (chunk.chunk_type === "ai_question") acc[qNum].question = chunk.ai_content;
          if (chunk.chunk_type === "user_transcript") acc[qNum].answer = chunk.transcript_cleaned;
          if (chunk.chunk_type === "ai_evaluation") acc[qNum].score = chunk.partial_score;
          
          return acc;
        }, {});

        for (const qNum of Object.keys(grouped)) {
          const qa = grouped[qNum];
          if (qa.question && qa.answer && qa.score) {
            qaHistory.push(qa);
          }
        }
      }

      // Genera domanda successiva
      const nextQuestionPrompt = generateNextQuestionPrompt(
        simulation.materia,
        simulation.argomento,
        currentQuestionNumber + 1,
        qaHistory,
        simulation.difficulty_level,
        simulation.ai_persona
      );

      const nextQuestionResponse = await groqClient.chat.completions.create({
        model: "meta-llama/llama-4-maverick-17b-128e-instruct",
        messages: [
          { role: "system", content: nextQuestionPrompt },
          { role: "user", content: `Genera la domanda ${currentQuestionNumber + 1}` }
        ],
        temperature: 0.4,
        max_tokens: 300,
      });

      nextQuestion = nextQuestionResponse.choices[0]?.message?.content?.trim();
      const nextQuestionUsage = nextQuestionResponse.usage ?? { prompt_tokens: 0, completion_tokens: 0 };

      if (nextQuestion) {
        // Salva prossima domanda
        const { data: questionChunk, error: qError } = await supabase
          .from("simulazione_chunks")
          .insert({
            simulazione_id: simulationId,
            chunk_type: "ai_question",
            chunk_order: simulation.current_step + 2,
            question_number: currentQuestionNumber + 1,
            ai_content: nextQuestion,
            ai_model_used: "meta-llama/llama-4-maverick-17b-128e-instruct",
            ai_tokens_input: nextQuestionUsage.prompt_tokens ?? null,
            ai_tokens_output: nextQuestionUsage.completion_tokens ?? null,
            processing_status: "completed",
            processing_completed_at: new Date().toISOString()
          })
          .select("*")
          .single();

        nextQuestionChunk = questionChunk;
        if (qError) {
          console.error("❌ Errore salvataggio prossima domanda:", qError);
        }
      }
    }

    // 🔊 FASE 5: Text-to-Speech con Cartesia (per valutazione + prossima domanda)
    let ttsAudioData = null;
    let ttsText = evaluationData.feedback_breve || "Valutazione completata.";
    if (nextQuestion) {
      ttsText += ` \n\nProssima domanda: ${nextQuestion}`;
    } else {
      ttsText += " \n\nSimulazione completata. Ottimo lavoro!";
    }

    try {
      const ttsResponse = await togetherClient.audio.speech.create({
        model: "cartesia-sonic-2", // Cartesia su Together.ai
        input: ttsText,
        voice: "voice-italian-professional", // Voice italiana professionale
        response_format: "mp3",
        speed: 1.0
      });

      // ✅ Stream diretto - converte in base64 per frontend
      const audioBuffer = await ttsResponse.arrayBuffer();
      const audioBase64 = Buffer.from(audioBuffer).toString('base64');
      ttsAudioData = `data:audio/mp3;base64,${audioBase64}`;
      
    } catch (ttsError) {
      console.error("❌ Errore TTS:", ttsError);
      // Continua anche senza TTS
    }

    // 📊 FASE 6: Update simulazione progress
    const newCurrentStep = isLastQuestion ? simulation.total_steps : simulation.current_step + 2;
    const newStatus = isLastQuestion ? "completed" : "in_progress";

    // Calcola costi totali
    const transcriptionCost = 0; // Whisper su Groq è gratis al momento
    const evaluationCost = calcolaCostiGroq(
      "meta-llama/llama-4-maverick-17b-128e-instruct", 
      evaluationUsage.prompt_tokens,
      evaluationUsage.completion_tokens
    );
    const ttsCost = calcolaCostiCartesia(ttsText.length);
    const stepCostEur = (transcriptionCost + evaluationCost + ttsCost) * 0.92; // USD to EUR

    const { error: updateError } = await supabase
      .from("simulazioni_orali")
      .update({
        current_step: newCurrentStep,
        status: newStatus,
        total_cost_eur: (simulation.total_cost_eur || 0) + stepCostEur,
        completed_at: isLastQuestion ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq("id", simulationId);

    if (updateError) {
      console.error("❌ Errore update simulazione:", updateError);
    }

    console.log(`✅ Audio processato: Q${currentQuestionNumber}, Score: ${evaluationData.score_totale}`);

    // 🎉 Risposta di successo
    return res.status(200).json({
      success: true,
      transcript: transcriptText,
      transcript_confidence: confidence,
      evaluation: evaluationData,
      next_question: nextQuestion,
      tts_audio_data: ttsAudioData, // ✅ Stream diretto base64
      tts_text: ttsText, // Fallback per browser TTS
      is_completed: isLastQuestion,
      current_step: newCurrentStep,
      total_steps: simulation.total_steps,
      next_action: isLastQuestion ? "view_final_results" : "record_next_answer"
    });

  } catch (error: any) {
    console.error("❌ Errore process-audio:", error);

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
      error: "Errore durante l'elaborazione dell'audio", 
      details: errorMessage 
    });
  }
}
