// File: pages/api/thesis-analysis.ts
// API principale per l'elaborazione di analisi tesi con AgenteFox

import type { NextApiRequest, NextApiResponse } from "next";
import { OpenAI } from "openai";
import { createClient } from "@supabase/supabase-js";
import { TokenEstimationService } from "@/lib/tokenEstimation";

// 🎯 ENTERPRISE TYPESCRIPT INTERFACES
interface AnalysisRequest {
  text: string;
  faculty: string;
  thesis_topic: string;
  level: 'triennale' | 'magistrale' | 'dottorato';
  analysis_type: string;
  session_id: string;
  chunk_number: number;
  project_title: string;
}

interface ProcessingMetadata {
  method: string;
  analysis_type: string;
  level: string;
  input_length: number;
  output_length: number;
  compression_ratio: number;
  input_tokens: number;
  prompt_tokens: number;
  total_input_tokens: number;
  output_tokens: number;
  estimated_cost: number | null;
  model: string;
  human_selected: boolean;
  smart_pdf_reader: boolean;
  chunk_info: {
    chunk_number: number;
    session_id: string;
    analysis_type: string;
    is_final: boolean;
  };
  thesis_context: {
    faculty: string;
    thesis_topic: string;
    level: string;
    project_title: string;
  };
}

const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY!,
  baseURL: "https://api.groq.com/openai/v1",
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 🎯 LIMITI PER QUALITÀ OTTIMALE
const MAX_CHARS = 20000; // ~5k token, 7-10 pagine
const HARD_LIMIT = 25000;

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
    .eq("tipo", "analisi_tesi")
    .gte("creato_il", oggiInizio.toISOString());

  if (countError) {
    console.error("Errore conteggio analisi:", countError);
    return res.status(500).json({ error: "Errore controllo limite giornaliero" });
  }

  const LIMITE_GIORNALIERO = 10; // Limite più alto per analisi tesi
  if ((count ?? 0) >= LIMITE_GIORNALIERO) {
    return res.status(429).json({
      error: `Hai raggiunto il limite di ${LIMITE_GIORNALIERO} analisi al giorno.`,
    });
  }

  // 🛡️ VALIDAZIONE ORIGINE
  const origin = req.headers.origin || "";
  const dominiAutorizzati = ["https://myuniagent.it", "http://localhost:3000"];
  if (!dominiAutorizzati.includes(origin)) {
    return res.status(403).json({ error: "Accesso non consentito da questa origine." });
  }

  // 📝 VALIDAZIONE INPUT
  const { 
    text, 
    faculty, 
    thesis_topic, 
    level, 
    analysis_type, 
    session_id, 
    chunk_number,
    project_title 
  }: AnalysisRequest = req.body;

  if (!text || typeof text !== "string" || !text.trim()) {
    return res.status(400).json({ error: "Testo mancante o non valido" });
  }

  if (!faculty || typeof faculty !== "string" || !faculty.trim()) {
    return res.status(400).json({ error: "Facoltà mancante o non valida" });
  }

  if (!thesis_topic || typeof thesis_topic !== "string" || !thesis_topic.trim()) {
    return res.status(400).json({ error: "Argomento tesi mancante o non valido" });
  }

  if (!level || !['triennale', 'magistrale', 'dottorato'].includes(level)) {
    return res.status(400).json({ error: "Livello tesi non valido" });
  }

  if (!analysis_type || typeof analysis_type !== "string" || !analysis_type.trim()) {
    return res.status(400).json({ error: "Tipo di analisi mancante o non valido" });
  }

  if (!session_id || typeof session_id !== "string" || !session_id.trim()) {
    return res.status(400).json({ error: "ID sessione mancante o non valido" });
  }

  if (!chunk_number || chunk_number < 1) {
    return res.status(400).json({ error: "Numero chunk non valido" });
  }

  if (!project_title || typeof project_title !== "string" || !project_title.trim()) {
    return res.status(400).json({ error: "Titolo progetto mancante o non valido" });
  }

  // 🔍 VALIDAZIONE SESSIONE ESISTENTE
  const { data: sessionData, error: sessionError } = await supabase
    .from("thesis_analysis_sessions")
    .select("*")
    .eq("id", session_id)
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();

  if (sessionError || !sessionData) {
    return res.status(404).json({ error: "Sessione non trovata o non attiva" });
  }

  // 🔍 VALIDAZIONE TIPO ANALISI PER LIVELLO
  const validAnalysisTypes = getValidAnalysisTypes(level);
  if (!validAnalysisTypes.includes(analysis_type)) {
    return res.status(400).json({ 
      error: `Tipo di analisi "${analysis_type}" non valido per livello ${level}`,
      valid_types: validAnalysisTypes
    });
  }

  // 🔍 CONTROLLO ANALISI DUPLICATA
  const { data: existingChunk, error: duplicateError } = await supabase
    .from("thesis_analysis_chunks")
    .select("id")
    .eq("session_id", session_id)
    .eq("analysis_type", analysis_type)
    .single();

  if (duplicateError && duplicateError.code !== 'PGRST116') {
    console.error("Errore controllo duplicato:", duplicateError);
    return res.status(500).json({ error: "Errore controllo duplicato" });
  }

  if (existingChunk) {
    return res.status(409).json({ 
      error: `Analisi "${analysis_type}" già completata per questa sessione`,
      existing_chunk_id: existingChunk.id
    });
  }

  const cleanText = text.trim();
  const inputLength = cleanText.length;

  // 📏 CONTROLLO LUNGHEZZA
  if (inputLength > HARD_LIMIT) {
    return res.status(400).json({ 
      error: `Testo troppo lungo: ${inputLength.toLocaleString()} caratteri. Massimo consentito: ${HARD_LIMIT.toLocaleString()}. Usa SmartPdfReader per selezionare solo le sezioni necessarie.` 
    });
  }

  if (inputLength < 200) {
    return res.status(400).json({ 
      error: "Testo troppo breve per generare un'analisi significativa. Minimo 200 caratteri." 
    });
  }

  try {
    // 📡 SETUP STREAMING
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Transfer-Encoding", "chunked");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    // 🧮 ANALISI TOKEN AVANZATA - Usa metodo esistente adattato per analisi
    const tokenService = new TokenEstimationService("meta-llama/llama-4-maverick-17b-128e-instruct");
    const tokenEstimate = tokenService.estimateRiassuntoTokens(cleanText, faculty.trim(), thesis_topic.trim());
    const limits = tokenService.checkLimits(tokenEstimate);

    // 🚦 CONTROLLO LIMITI INTELLIGENTE
    if (!limits.isValid) {
      return res.status(400).json({ 
        error: `Testo troppo lungo per il modello: ${tokenEstimate.totalInputTokens.toLocaleString()} token totali. Massimo consentito: 32768 token.`,
        suggestions: limits.suggestions 
      });
    }

    console.log(`🎯 Analisi Tesi: ${inputLength} chars (${tokenEstimate.inputTokens} input + ${tokenEstimate.promptTokens} prompt = ${tokenEstimate.totalInputTokens} totali) → max ${tokenEstimate.maxOutputTokens} output per ${analysis_type} (${level})`);

    // Log avvisi se presenti
    if (limits.warnings.length > 0) {
      console.log(`⚠️ Avvisi: ${limits.warnings.join(', ')}`);
    }
    
    // 🧠 CREAZIONE PROMPT SPECIALIZZATO
    const prompt = createAnalysisPrompt(
      cleanText, 
      faculty.trim(), 
      thesis_topic.trim(), 
      level, 
      analysis_type, 
      project_title.trim()
    );

    // 🚀 CHIAMATA GROQ
    const stream = await openai.chat.completions.create({
      model: "meta-llama/llama-4-maverick-17b-128e-instruct",
      messages: [
        { 
          role: "system", 
          content: "Sei AgenteFox, l'esperto relatore universitario più avanzato. Conduci analisi accademiche di altissima qualità seguendo rigorosamente le istruzioni specializzate." 
        },
        { 
          role: "user", 
          content: prompt 
        }
      ],
      temperature: 0.1, // Temperatura molto bassa per consistenza
      top_p: 0.82,
      max_tokens: Math.min(tokenEstimate.maxOutputTokens, 4000),
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
    
    console.log(`✅ Analisi ${analysis_type} completata (chunk ${chunk_number}): ${outputLength} chars generati, ratio: ${(compressionRatio * 100).toFixed(1)}%`);

    // 💾 SALVATAGGIO ASINCRONO
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

        // 💾 SALVA CHUNK ANALISI
        const processingMetadata: ProcessingMetadata = {
          method: "THESIS_ANALYSIS_HITL",
          analysis_type: analysis_type,
          level: level,
          input_length: inputLength,
          output_length: outputLength,
          compression_ratio: compressionRatio,
          input_tokens: tokenEstimate.inputTokens,
          prompt_tokens: tokenEstimate.promptTokens,
          total_input_tokens: tokenEstimate.totalInputTokens,
          output_tokens: tokenCount,
          estimated_cost: tokenEstimate.estimatedCost ?? null,
          model: tokenEstimate.model,
          human_selected: true,
          smart_pdf_reader: true,
          chunk_info: {
            chunk_number: chunk_number,
            session_id: session_id,
            analysis_type: analysis_type,
            is_final: false
          },
          thesis_context: {
            faculty: faculty.trim(),
            thesis_topic: thesis_topic.trim(),
            level: level,
            project_title: project_title.trim()
          }
        };

        console.log(`💾 Salvando chunk ${chunk_number} analisi ${analysis_type} per sessione ${session_id}`);
        
        const { error: chunkError } = await supabaseAuth.from("thesis_analysis_chunks").insert({
          session_id: session_id,
          chunk_number: chunk_number,
          analysis_type: analysis_type,
          input_text: cleanText.slice(0, 60000), // Limit per DB
          output_analysis: accumulatedResult,
          processing_metadata: processingMetadata
        });

        if (chunkError) {
          console.error("Errore salvataggio chunk analisi:", chunkError);
        } else {
          console.log(`✅ Chunk ${chunk_number} analisi ${analysis_type} salvato con successo`);
        }

        // Registra attività
        await supabaseAuth.from("attivita").insert({
          user_id: authUser.id,
          tipo: "analisi_tesi",
          dettagli: `Analisi ${analysis_type} completata per progetto: ${project_title} (chunk ${chunk_number})`,
          creato_il: new Date().toISOString()
        });

      } catch (err) {
        console.error("Errore nel salvataggio asincrono analisi:", err);
      }
    });

  } catch (err: any) {
    console.error("Errore durante la generazione dell'analisi:", err);
    const errorMessage = err.response?.data?.error?.message || err.message || "Errore sconosciuto";
    res.status(500).json({ 
      error: "Errore generazione analisi", 
      details: errorMessage 
    });
  }
}

// 🎯 HELPER: Tipi di analisi validi per livello
function getValidAnalysisTypes(level: 'triennale' | 'magistrale' | 'dottorato'): string[] {
  const analysisTypes = {
    triennale: [
      'analisi_strutturale',
      'analisi_metodologica',
      'analisi_contenuti',
      'analisi_bibliografica',
      'analisi_formale',
      'analisi_coerenza_argomentativa',
      'analisi_originalita_contributo',
      'analisi_rilevanza_disciplinare'
    ],
    magistrale: [
      'analisi_strutturale_avanzata',
      'analisi_metodologica_rigorosa',
      'analisi_contenuti_specialistici',
      'analisi_critica_sintetica',
      'analisi_bibliografica_completa',
      'analisi_empirica_sperimentale',
      'analisi_implicazioni',
      'analisi_innovazione_metodologica',
      'analisi_validita_statistica',
      'analisi_applicabilita_pratica',
      'analisi_limiti_criticita',
      'analisi_posizionamento_teorico'
    ],
    dottorato: [
      'analisi_originalita_scientifica',
      'analisi_metodologica_frontiera',
      'analisi_stato_arte_internazionale',
      'analisi_framework_teorico',
      'analisi_empirica_avanzata',
      'analisi_critica_profonda',
      'analisi_impatto_scientifico',
      'analisi_riproducibilita',
      'analisi_standard_internazionali',
      'analisi_significativita_statistica',
      'analisi_etica_ricerca',
      'analisi_sostenibilita_metodologica',
      'analisi_interdisciplinarieta',
      'analisi_scalabilita_risultati',
      'analisi_pubblicabilita_internazionale',
      'analisi_gap_conoscenza_colmato'
    ]
  };

  return analysisTypes[level] || [];
}

// 🧠 CREAZIONE PROMPT SPECIALIZZATO PER ANALISI TESI
function createAnalysisPrompt(
  text: string, 
  faculty: string, 
  thesis_topic: string, 
  level: 'triennale' | 'magistrale' | 'dottorato', 
  analysis_type: string,
  project_title: string
): string {
  const inputLength = text.length;
  const targetLength = Math.ceil(inputLength * 0.5); // 50% per analisi più approfondite
  
  const basePrompt = `Agisci come AgenteFox, l'esperto relatore universitario più avanzato al mondo specializzato in valutazione di tesi accademiche.

CONTESTO ACCADEMICO:
- Facoltà: ${faculty}
- Argomento tesi: ${thesis_topic}
- Livello: ${level.toUpperCase()}
- Progetto: ${project_title}
- Tipo analisi: ${analysis_type}
- Input: ${inputLength.toLocaleString()} caratteri
- Target output: ~${targetLength.toLocaleString()} caratteri

## OBIETTIVO SPECIALIZZATO

Devi condurre un'analisi "${analysis_type}" approfondita e professionale del materiale di tesi fornito, secondo gli standard accademici più elevati per il livello ${level}.

---

## REGOLE FONDAMENTALI

1. **Rigore Accademico:** Mantieni sempre il massimo rigore scientifico e la precisione terminologica
2. **Aderenza al Testo:** Basati ESCLUSIVAMENTE sul contenuto fornito, senza aggiungere informazioni esterne
3. **Professionalità:** Adotta il tono e l'approccio di un relatore esperto e autorevole
4. **Completezza:** Fornisci un'analisi completa che copra tutti gli aspetti rilevanti per questo tipo di valutazione

---

${getSpecializedAnalysisInstructions(analysis_type, level, faculty)}

---

## STRUTTURA DELL'ANALISI

La tua analisi deve seguire questa struttura professionale:

### 1. INQUADRAMENTO GENERALE
- Contestualizzazione dell'argomento nel campo di studio
- Rilevanza del tema trattato

### 2. ANALISI SPECIALIZZATA
- Sviluppo completo dell'analisi richiesta secondo le istruzioni specifiche
- Osservazioni dettagliate e motivate
- Riferimenti puntuali al testo

### 3. VALUTAZIONE CRITICA
- Punti di forza identificati
- Aree di miglioramento o criticità
- Suggerimenti costruttivi

### 4. CONCLUSIONI
- Sintesi dei risultati dell'analisi
- Valutazione complessiva secondo i criteri specifici del tipo di analisi

---

## IMPORTANTE

Ricorda che stai valutando una tesi di livello ${level} in ${faculty}. Le tue osservazioni devono essere:
- Appropriate al livello accademico
- Costruttive e formative
- Basate su evidenze concrete dal testo
- Orientate al miglioramento della qualità accademica

TESTO DA ANALIZZARE:
${text}

Procedi con l'analisi "${analysis_type}" seguendo rigorosamente le istruzioni specializzate per ${level} in ${faculty}.`;

  return basePrompt;
}

// 🎯 ISTRUZIONI SPECIALIZZATE PER TIPO DI ANALISI
function getSpecializedAnalysisInstructions(
  analysis_type: string, 
  level: 'triennale' | 'magistrale' | 'dottorato', 
  faculty: string
): string {
  
  const instructions: Record<string, Record<string, string>> = {
    // TRIENNALE
    'analisi_strutturale': {
      triennale: `## ISTRUZIONI SPECIALIZZATE: ANALISI STRUTTURALE (TRIENNALE)

Valuta l'organizzazione logica e la struttura del lavoro:
- **Coerenza strutturale**: Verifica la sequenza logica delle argomentazioni
- **Chiarezza espositiva**: Analizza la capacità di presentare idee in modo ordinato
- **Equilibrio delle parti**: Valuta la proporzione tra le diverse sezioni
- **Transizioni**: Esamina i collegamenti tra i capitoli/paragrafi
- **Gerarchia informativa**: Verifica l'organizzazione gerarchica dei contenuti

Criteri di valutazione per livello triennale:
- Struttura semplice ma efficace
- Logica consequenziale chiara
- Capacità di organizzare il pensiero accademico`
    },
    
    'analisi_metodologica': {
      triennale: `## ISTRUZIONI SPECIALIZZATE: ANALISI METODOLOGICA (TRIENNALE)

Valuta l'approccio metodologico adottato:
- **Appropriatezza del metodo**: Verifica l'adeguatezza del metodo scelto rispetto agli obiettivi
- **Descrizione metodologica**: Analizza la chiarezza nella presentazione del metodo
- **Applicazione pratica**: Valuta l'implementazione concreta del metodo
- **Limiti metodologici**: Identifica eventuali limitazioni nell'approccio
- **Giustificazione delle scelte**: Esamina la motivazione delle decisioni metodologiche

Criteri di valutazione per livello triennale:
- Comprensione base dei principi metodologici
- Applicazione corretta di metodi standard
- Consapevolezza delle limitazioni metodologiche`
    },

    // MAGISTRALE
    'analisi_strutturale_avanzata': {
      magistrale: `## ISTRUZIONI SPECIALIZZATE: ANALISI STRUTTURALE AVANZATA (MAGISTRALE)

Conduci un'analisi approfondita della struttura complessa:
- **Architettura argomentativa**: Esamina la costruzione logica avanzata delle argomentazioni
- **Interdipendenze concettuali**: Valuta i collegamenti tra concetti complessi
- **Progressione teorica**: Analizza lo sviluppo teorico attraverso i capitoli
- **Bilanciamento contenuti**: Verifica l'equilibrio tra teoria, analisi e applicazione
- **Sofisticazione strutturale**: Valuta la complessità organizzativa appropriata al livello

Criteri di valutazione per livello magistrale:
- Struttura articolata e sofisticata
- Capacità di gestire complessità concettuale
- Originalità nell'organizzazione del pensiero critico`
    },

    // DOTTORATO
    'analisi_originalita_scientifica': {
      dottorato: `## ISTRUZIONI SPECIALIZZATE: ANALISI ORIGINALITÀ SCIENTIFICA (DOTTORATO)

Valuta il contributo originale alla conoscenza scientifica:
- **Novità teorica**: Identifica gli elementi di innovazione teorica
- **Contributo empirico**: Valuta l'originalità dei dati e delle scoperte
- **Avanzamento della conoscenza**: Analizza come il lavoro fa progredire il campo
- **Significatività scientifica**: Valuta l'impatto potenziale sulla disciplina
- **Originalità metodologica**: Esamina innovazioni negli approcci di ricerca

Criteri di valutazione per livello dottorato:
- Contributo significativo e originale alla conoscenza
- Rilevanza scientifica internazionale
- Potenziale di influenzare lo sviluppo futuro del campo`
    }
  };

  // Ottieni istruzioni specifiche o fallback generico
  const levelInstructions = instructions[analysis_type]?.[level] || 
    generateGenericInstructions(analysis_type, level, faculty);

  return levelInstructions;
}

// 🎯 GENERAZIONE ISTRUZIONI GENERICHE
function generateGenericInstructions(
  analysis_type: string, 
  level: 'triennale' | 'magistrale' | 'dottorato', 
  faculty: string
): string {
  const analysisName = analysis_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  
  const levelGuidelines = {
    triennale: "Valuta secondo standard di base universitari, focalizzandoti su comprensione e applicazione corretta dei concetti.",
    magistrale: "Applica criteri avanzati di valutazione, considerando approfondimento critico e capacità di sintesi specialistica.",
    dottorato: "Usa standard di eccellenza scientifica internazionale, valutando originalità, rigore metodologico e contributo alla conoscenza."
  };

  return `## ISTRUZIONI SPECIALIZZATE: ${analysisName.toUpperCase()} (${level.toUpperCase()})

Conduci un'analisi completa di "${analysisName}" secondo i più alti standard accademici per ${faculty}.

${levelGuidelines[level]}

Fornisci una valutazione approfondita che consideri:
- Aspetti teorici e metodologici rilevanti
- Qualità del contenuto in relazione al tipo di analisi
- Appropriatezza per il livello accademico ${level}
- Contributo specifico nell'ambito di ${faculty}

La tua analisi deve essere costruttiva, dettagliata e orientata al miglioramento della qualità accademica.`;
}
