import type { NextApiRequest, NextApiResponse } from "next";
import { OpenAI } from "openai";
import { createClient } from "@supabase/supabase-js";
import { TokenEstimationService } from "@/lib/tokenEstimation";
import { createHITLPrompt } from "@/lib/prompt";

const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY!,
  baseURL: "https://api.groq.com/openai/v1",
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 🎯 LIMITI PER QUALITÀ OTTIMALE
const MAX_CHARS = 20000; // ~5k token
const HARD_LIMIT = 25000;

// 🧮 STIMA TOKEN
const estimateTokens = (text: string): number => {
  return Math.ceil(text.length / 4); // Approssimazione: 4 caratteri = 1 token
};

// 🧠 GENERAZIONE TITOLO INTELLIGENTE - DEPRECATED (ora viene dal front-end)
const generateSmartTitle = (userTitle: string): string => {
  // Pulisci il titolo dell'utente
  return userTitle.trim().slice(0, 200); // Limite DB
};

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

  // 🚧 CONTROLLO LIMITI GIORNALIERI
  const oggiInizio = new Date();
  oggiInizio.setHours(0, 0, 0, 0);

  const { count, error: countError } = await supabase
    .from("attivita")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("tipo", "riassunto")
    .gte("creato_il", oggiInizio.toISOString());

  if (countError) {
    console.error("Errore conteggio riassunti:", countError);
    return res.status(500).json({ error: "Errore controllo limite giornaliero" });
  }

  const LIMITE_GIORNALIERO = 5; // Aumentato per HITL
  if ((count ?? 0) >= LIMITE_GIORNALIERO) {
    return res.status(429).json({
      error: `Hai raggiunto il limite di ${LIMITE_GIORNALIERO} riassunti al giorno.`,
    });
  }

  // 🛡️ VALIDAZIONE ORIGINE
  const origin = req.headers.origin || "";
  const dominiAutorizzati = ["https://myuniagent.it", "http://localhost:3000"];
  if (!dominiAutorizzati.includes(origin)) {
    return res.status(403).json({ error: "Accesso non consentito da questa origine." });
  }

  // 📝 VALIDAZIONE INPUT - MODIFICATA PER SUPPORTARE MODALITÀ PROGETTO
  const { text, facolta, materia, titolo, sessionId, chunkNumber } = req.body;

  if (!text || typeof text !== "string" || !text.trim()) {
    return res.status(400).json({ error: "Testo mancante o non valido" });
  }

  if (!facolta || typeof facolta !== "string" || !facolta.trim()) {
    return res.status(400).json({ error: "Facoltà mancante o non valida" });
  }

  if (!materia || typeof materia !== "string" || !materia.trim()) {
    return res.status(400).json({ error: "Materia mancante o non valida" });
  }

  if (!titolo || typeof titolo !== "string" || !titolo.trim()) {
    return res.status(400).json({ error: "Titolo mancante o non valido" });
  }

  // 🔍 VALIDAZIONE MODALITÀ PROGETTO
  const isProjectMode = Boolean(sessionId);
  
  if (isProjectMode && (!chunkNumber || chunkNumber < 1)) {
    return res.status(400).json({ error: "Numero chunk non valido per modalità progetto" });
  }

  const cleanText = text.trim();
  const inputLength = cleanText.length;

  // 📏 CONTROLLO LUNGHEZZA
  if (inputLength > HARD_LIMIT) {
    return res.status(400).json({ 
      error: `Testo troppo lungo: ${inputLength.toLocaleString()} caratteri. Massimo consentito: ${HARD_LIMIT.toLocaleString()}. Usa SmartPdfReader per selezionare solo le sezioni necessarie.` 
    });
  }

  if (inputLength < 100) {
    return res.status(400).json({ 
      error: "Testo troppo breve per generare un riassunto significativo. Minimo 100 caratteri." 
    });
  }

  try {
    // 📡 SETUP STREAMING
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Transfer-Encoding", "chunked");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    // 🧮 ANALISI TOKEN AVANZATA
    const tokenService = new TokenEstimationService("meta-llama/llama-4-maverick-17b-128e-instruct");
    const tokenEstimate = tokenService.estimateRiassuntoTokens(cleanText, facolta.trim(), materia.trim());
    const limits = tokenService.checkLimits(tokenEstimate);

    // 🚦 CONTROLLO LIMITI INTELLIGENTE
    if (!limits.isValid) {
      return res.status(400).json({ 
        error: `Testo troppo lungo per il modello: ${tokenEstimate.totalInputTokens.toLocaleString()} token totali. Massimo consentito: 32768 token.`,
        suggestions: limits.suggestions 
      });
    }

    console.log(`🎯 HITL Riassunto: ${inputLength} chars (${tokenEstimate.inputTokens} input + ${tokenEstimate.promptTokens} prompt = ${tokenEstimate.totalInputTokens} totali) → max ${tokenEstimate.maxOutputTokens} output per ${facolta}/${materia}${isProjectMode ? ` [PROGETTO: chunk ${chunkNumber}]` : ''}`);

    // Log avvisi se presenti
    if (limits.warnings.length > 0) {
      console.log(`⚠️ Avvisi: ${limits.warnings.join(', ')}`);
    }
    
    // 🧠 CREAZIONE PROMPT
    const prompt = createHITLPrompt(cleanText, facolta.trim(), materia.trim());

    // 🚀 CHIAMATA GROQ
    const stream = await openai.chat.completions.create({
      model: "meta-llama/llama-4-maverick-17b-128e-instruct", // Modello più affidabile per HITL
      messages: [
        { 
          role: "system", 
          content: "Sei MyUniAgent, l'assistente accademico più avanzato. Segui sempre le istruzioni ricevute con precisione assoluta." 
        },
        { 
          role: "user", 
          content: prompt 
        }
      ],
      temperature: 0.1, // Temperatura molto bassa per consistenza
      top_p: 0.82,
      max_tokens: Math.min(tokenEstimate.maxOutputTokens, 4000), // Limite sicuro basato su stima avanzata
      stream: true,
    });

    let accumulatedResult = "";
    let tokenCount = 0;

    // 📡 STREAMING RESPONSE
    for await (const chunk of stream) {
      const content = (chunk as any).choices?.[0]?.delta?.content || "";
      if (content) {
        accumulatedResult += content;
        tokenCount++;
        res.write(content);
        
        // Safety check per evitare output troppo lunghi
        if (tokenCount > tokenEstimate.maxOutputTokens) {
          console.log("⚠️ Raggiunto limite token, terminazione stream");
          break;
        }
      }
    }

    res.end();

    const outputLength = accumulatedResult.length;
    const compressionRatio = outputLength / inputLength;
    
    console.log(`✅ HITL completato${isProjectMode ? ` (chunk ${chunkNumber})` : ''}: ${outputLength} chars generati, ratio: ${(compressionRatio * 100).toFixed(1)}%`);

    // 💾 SALVATAGGIO ASINCRONO - MODIFICATO PER SUPPORTARE MODALITÀ PROGETTO
    setImmediate(async () => {
      try {
        const supabaseAuth = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
            global: {
              headers: { Authorization: `Bearer ${token}` },
            },
          }
        );

        const { data: { user: authUser }, error: userError } = await supabaseAuth.auth.getUser();

        if (userError || !authUser?.id) {
          console.error("Errore nel recupero utente per salvataggio:", userError);
          return;
        }

        if (isProjectMode) {
          // 📦 MODALITÀ PROGETTO: Salva come chunk privato
          console.log(`💾 Salvando chunk ${chunkNumber} per sessione ${sessionId}`);
          
          const { error: chunkError } = await supabaseAuth.from("summary_chunks").insert({
            session_id: sessionId,
            chunk_number: chunkNumber,
            input_text: cleanText.slice(0, 60000), // Limit per DB
            output_summary: accumulatedResult,
            processing_metadata: {
              method: "HITL",
              input_length: inputLength,
              output_length: outputLength,
              compression_ratio: compressionRatio,
              input_tokens: tokenEstimate.inputTokens,
              prompt_tokens: tokenEstimate.promptTokens,
              total_input_tokens: tokenEstimate.totalInputTokens,
              output_tokens: tokenCount,
              estimated_cost: tokenEstimate.estimatedCost,
              model: tokenEstimate.model,
              human_selected: true,
              smart_pdf_reader: true,
              chunk_info: {
                chunk_number: chunkNumber,
                session_id: sessionId,
                is_final: false
              }
            }
          });

          if (chunkError) {
            console.error("Errore salvataggio chunk HITL:", chunkError);
          } else {
            console.log(`✅ Chunk ${chunkNumber} salvato per progetto multi-parte`);
          }

          // Registra attività per il chunk
          await supabaseAuth.from("attivita").insert({
            user_id: authUser.id,
            tipo: "riassunto",
            dettagli: `Chunk ${chunkNumber} completato per progetto: ${titolo}`,
            creato_il: new Date().toISOString()
          });

        } else {
          // 📚 MODALITÀ SINGOLA: Comportamento originale
          console.log("💾 Salvando riassunto singolo in biblioteca");
          
          const smartTitle = generateSmartTitle(titolo.trim());

          const { error: insertError } = await supabaseAuth.from("riassunti_generati").insert({
            user_id: authUser.id,
            titolo: smartTitle,
            input: cleanText.slice(0, 60000), // Limit per DB
            output: accumulatedResult,
            facolta: facolta.trim(),
            materia: materia.trim(),
            is_public: true,
            processing_metadata: {
              method: "HITL",
              input_length: inputLength,
              output_length: outputLength,
              compression_ratio: compressionRatio,
              input_tokens: tokenEstimate.inputTokens,
              prompt_tokens: tokenEstimate.promptTokens,
              total_input_tokens: tokenEstimate.totalInputTokens,
              output_tokens: tokenCount,
              estimated_cost: tokenEstimate.estimatedCost,
              model: tokenEstimate.model,
              human_selected: true,
              smart_pdf_reader: true,
              project_mode: false,
              token_analysis: {
                content_type: 'academic', // Assumiamo sempre accademico per HITL
                warnings: limits.warnings,
                context_usage: (tokenEstimate.totalInputTokens / 32768 * 100).toFixed(1) + '%'
              }
            }
          });

          if (insertError) {
            console.error("Errore salvataggio riassunto HITL:", insertError);
          } else {
            console.log("✅ Riassunto HITL salvato su Supabase");
          }

          // Registra attività per riassunto singolo
          await supabaseAuth.from("attivita").insert({
            user_id: authUser.id,
            tipo: "riassunto",
            dettagli: `Riassunto HITL: ${smartTitle}`,
            creato_il: new Date().toISOString()
          });
        }

      } catch (err) {
        console.error("Errore nel salvataggio asincrono HITL:", err);
      }
    });

  } catch (err: any) {
    console.error("Errore durante la generazione del riassunto HITL:", err);
    const errorMessage = err.response?.data?.error?.message || err.message || "Errore sconosciuto";
    res.status(500).json({ 
      error: "Errore generazione riassunto HITL", 
      details: errorMessage 
    });
  }
}