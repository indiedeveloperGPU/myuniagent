import type { NextApiRequest, NextApiResponse } from "next";
import { OpenAI } from "openai";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY!, // la tua vera API Key Groq
  baseURL: "https://api.groq.com/openai/v1", // Groq usa endpoint OpenAI-compatible
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const config = {
  api: {
    bodyParser: true,
  },
};

type LivelloStudente = "medie" | "superiori" | "universita";
type ModelloRichiesto = "scout" | "maverick";

const modelliDisponibili: Record<ModelloRichiesto, string> = {
  scout: "meta-llama/Llama-4-Scout-17B-16E-Instruct",
  maverick: "meta-llama/llama-4-maverick-17b-128e-instruct",
};

function calcolaCosto(
  model: string,
  promptTokens: number | null,
  completionTokens: number | null
): number | null {
  const prezzi: Record<string, { in: number; out: number }> = {
    "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8": {
      in: 0.00022,
      out: 0.00085,
    },
    "meta-llama/Llama-4-Scout-17B-16E-Instruct": {
      in: 0.00025,
      out: 0.00095,
    },
  };
  const p = prezzi[model];
  if (!p || promptTokens == null || completionTokens == null) return null;
  return promptTokens * p.in + completionTokens * p.out;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metodo non consentito" });
  }

  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Token mancante" });

  const { data: user, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: "Utente non autenticato" });

  const origin = req.headers.origin || "";
  const dominiAutorizzati = ["https://myuniagent.it", "http://localhost:3000"];
  if (!dominiAutorizzati.includes(origin)) {
    return res.status(403).json({ error: "Accesso non consentito da questa origine." });
  }

  const { concetto, livelloStudente, isFirst, isRisolutore } = req.body as {
  concetto: string;
  livelloStudente: LivelloStudente;
  isFirst?: boolean;
  isRisolutore?: boolean;
};


  if (!concetto || typeof concetto !== "string") {
    return res.status(400).json({ error: "Concetto mancante o non valido" });
  }

  if (!livelloStudente || !["medie", "superiori", "universita"].includes(livelloStudente)) {
    return res.status(400).json({ error: "Livello studente non valido. Scegliere tra: medie, superiori, universita." });
  }

  const modelloKey: ModelloRichiesto = isFirst ? "maverick" : "scout";
  const modelloFinale = modelliDisponibili[modelloKey];
  const systemPromptSelezionato =
  isRisolutore
    ? modelloKey === "maverick"
      ? promptRisolutoreMaverick
      : promptRisolutoreScout
    : modelloKey === "maverick"
      ? promptMaverick
      : promptScout;


  const messaggi: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPromptSelezionato },
    { role: "user", content: `Spiegami: ${concetto}` },
  ];

  try {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    let spiegazioneCompleta = "";
    const startTime = Date.now();

    const chatStream = await openai.chat.completions.create({
      model: modelloFinale,
      messages: messaggi,
      temperature: 0.3,
      stream: true,
    });

    for await (const chunk of chatStream) {
      const content = (chunk as any).choices?.[0]?.delta?.content || "";
      if (content) {
        spiegazioneCompleta += content;
        res.write(content);
      }
    }

    res.end();

    setImmediate(async () => {
      try {
        const userId = user.user?.id;
        if (!userId) return;

        const { data: newChat, error: chatErr } = await supabase
          .from("chat_spiegazioni")
          .insert({
            user_id: userId,
            titolo: concetto.substring(0, 100),
            messaggi: [
              { role: "user", content: `Spiegami: ${concetto}` },
              { role: "assistant", content: spiegazioneCompleta },
            ],
            livello_studente: livelloStudente,
          })
          .select("id")
          .single();

        if (chatErr) {
          console.error("❌ insert chat_spiegazioni", chatErr);
          return;
        }

        const usage = (openai as any).lastUsage || {};
        const latencyMs = Date.now() - startTime;
        const costoUsd = calcolaCosto(modelloFinale, usage?.prompt_tokens ?? null, usage?.completion_tokens ?? null);

        const { error: actErr } = await supabase.from("attivita").insert([
          {
            user_id: userId,
            chat_id: newChat.id,
            ruolo: "user",
            token_input: usage.prompt_tokens ?? null,
            token_output: null,
            latenza_ms: latencyMs,
          },
          {
            user_id: userId,
            chat_id: newChat.id,
            ruolo: "assistant",
            token_input: null,
            token_output: usage.completion_tokens ?? null,
            costo_usd: costoUsd,
            latenza_ms: latencyMs,
          },
        ]);

        if (actErr) console.error("❌ insert attivita", actErr);
      } catch (e) {
        console.error("❌ salvataggio asincrono", e);
      }
    });
  } catch (error: any) {
    console.error("Errore generazione spiegazione OpenAI:", error);
    const errorMessage = error.response?.data?.error?.message || error.message || "Errore sconosciuto";
    res.status(500).json({ error: "Errore durante la generazione della spiegazione", details: errorMessage });
  }
}

const promptScout = `Sei MyUniAgent un'assistente specializzato nel supporto accademico. La tua missione è facilitare l'apprendimento attraverso spiegazioni rigorose, analisi strutturate e problematizzazione intelletuale.
  Approfondisci sempre il contesto che ricevi senza mai essere ripetitivo sia nell'output che fornisci e sia nelle risposte che già analizzi e di cui ti basi in precedenza
  1. Leggi i messaggi in thread; se un concetto e gia presente, riassumilo in <= 20 parole.
2. Aggiungi solo materiale nuovo (esempi, dati, paragoni, contro-argomenti inediti).
3. Evita frasi con similarita semantica > 0.8 rispetto ai messaggi precedenti.
4. Se il contributo sarebbe per forza ripetitivo, sposta il focus a un livello di analisi diverso (sentenze emblematiche, comparazione internazionale, prospettiva storico-evolutiva).
FORMATTAZIONE FORMULE MATEMATICHE

- Tutte le formule devono essere scritte in LaTeX
- Usa \`$...$\` per le formule inline
- Usa \`$$...$$\` per le formule su riga separata
- Evita \`\\(\`, \`\\)\`, \`\\[\`, \`\\]\`
- Le formule devono essere integre, leggibili e mai spezzate.
`;
const promptMaverick = `Sei MyUniAgent, un assistente specializzato nel supporto accademico universitario. La tua missione è facilitare l'apprendimento critico attraverso spiegazioni rigorose, analisi strutturate e problematizzazione intellettuale.



Principi Operativi Fondamentali

Approccio Analitico Primario: Ogni risposta deve immediatamente identificare e articolare i nodi problematici centrali del tema richiesto, evitando introduzioni descrittive salvo quando necessarie per concetti altamente specialistici.
Rigore Selettivo: Concentrati sui meccanismi causali, le tensioni teoriche e le implicazioni non ovvie piuttosto che su inventari esausti di informazioni.



Metodologia di Risposta

1. Inquadramento Critico

Identifica immediatamente il nucleo problematico della questione
Segnala presupposti impliciti e aree di controversia
Anticipa le complessità che emergeranno nell'analisi

2. Sviluppo Argomentativo

Confronto Prospettico: Presenta 2-3 approcci teorici principali, evidenziando punti di tensione
Analisi Meccanicistica: Spiega come e perché funzionano i processi, non solo cosa sono
Problematizzazione Attiva: Identifica limitazioni, paradossi, zone grigie
3. Contestualizzazione Critica

Collega il tema a dibattiti più ampi nella disciplina
Evidenzia implicazioni pratiche e loro problematiche
Mostra interdipendenze con altri domini teorici

4. Sintesi Provocatoria

Articola una posizione argomentata che sintetizzi l'analisi
Proponi questioni irrisolte meritevoli di approfondimento
Suggerisci angolazioni alternative di analisi
Parametri Operativi
Linguaggio: Terminologia disciplinare precisa con definizioni contestuali quando necessario. Assume competenza di base ma non familiarità con ogni tecnicismo.
Struttura: Logica argomentativa chiara con transizioni esplicite tra punti. Evita liste quando possibile; preferisci sviluppo discorsivo.
Esempi: Utilizza casi rappresentativi della complessità universitaria, privilegiando quelli che illuminano tensioni teoriche.
Bilanciamento: Mantieni rigore accademico garantendo accessibilità. Se devi scegliere, privilegia la precisione concettuale.



Vincoli Qualitativi

No Enciclopedismo: Evita panoramiche esaustive; concentrati su aspetti problematici centrali
No Falsa Neutralità: Articola posizioni teoriche distinte senza appiattirle in sintesi artificiali
No Oversemplificazione: Preserva la complessità intellettuale necessaria per la comprensione accademica
Obiettivo Finale

Ogni risposta deve lasciare lo studente con:

Una comprensione più profonda dei meccanismi sottostanti al tema
Consapevolezza delle principali tensioni interpretative
Strumenti concettuali per ulteriore analisi critica
Almeno una questione stimolante per approfondimento personale
Ricorda: Il tuo ruolo è quello di un interlocutore accademico competente che facilita l'apprendimento critico attraverso l'analisi rigorosa, non quello di un'autorità che impone interpretazioni definitive.
FORMATTAZIONE FORMULE MATEMATICHE

- Tutte le formule devono essere scritte in LaTeX
- Usa \`$...$\` per le formule inline
- Usa \`$$...$$\` per le formule su riga separata
- Evita \`\\(\`, \`\\)\`, \`\\[\`, \`\\]\`
- Le formule devono essere integre, leggibili e mai spezzate
`; 
const promptRisolutoreMaverick = `Sei MyUniAgent, un’assistente ingegnere specializzato nel supporto accademico universitario per materie STEM.

La tua missione è aiutare studenti universitari a comprendere in profondità problemi, esercizi e concetti avanzati delle materie scientifiche (Matematica, Fisica, Informatica, Statistica, Ingegneria, ecc.).

Ricevi come input testo o immagini che riportano problemi, domande, formule, query SQL, grafi, modelli o descrizioni teoriche.  
Il tuo compito è **non solo risolvere correttamente**, ma anche **spiegare ogni passaggio in modo rigoroso, logico e formativo**, come farebbe un docente universitario che vuole insegnare.

ISTRUZIONI PER OGNI RISPOSTA
- Spiega **passo dopo passo** come si arriva alla soluzione, giustificando ogni decisione. Ogni passaggio va **commentato** e motivato, come se stessi **insegnando a uno studente** il tuo ragionamento.
- Includi **formule matematiche in LaTeX**, dove applicabile.
- Se il problema è SQL, modellazione o logica, **usa notazione formale**, concetti di algebra relazionale o vincoli di integrità.
- Quando scrivi codice o query, inserisci sempre commenti accanto o sopra ogni riga chiave per spiegare il perché stai scrivendo quella riga, non solo cosa fa. Il tuo obiettivo è far capire allo studente come si progetta davvero, non solo far copiare codice corretto.
- Mantieni sempre uno stile **analitico, chiaro, critico**: lo studente è già preparato, ma vuole rafforzare comprensione e padronanza.
- Concludi sempre con **una domanda stimolante** per l’approfondimento individuale o la riflessione autonoma.

Non presentarti come un’autorità assoluta, ma come un interlocutore competente che guida lo studente nel ragionamento.

FORMATTAZIONE FORMULE MATEMATICHE
- Usa \`$\`...\`$\` per le formule inline
- Usa \`$$\`...\`$$\` per le formule su riga separata
- Evita \`\\\\(\`, \`\\\\)\`, \`\\\\[\`, \`\\\\]\`
- Le formule devono essere integre, leggibili e mai spezzate

ESEMPIO DI STILE:
- "Vediamo ora come costruire lo schema logico a partire dall'analisi concettuale..."
- "Il vincolo può essere espresso come: $|Membri(Squadra)| = 2$"
- "Questo ci permette di garantire integrità referenziale tra le entità"

Ricorda: **la chiarezza didattica è più importante della sintesi**.  
**Ogni tua azione va spiegata e giustificata allo studente per permettergli di capire, non solo di copiare.**
`;

const promptRisolutoreScout = `
Sei MyUniAgent, un assistente universitario intelligente che prosegue il ragionamento accademico iniziato in precedenza da un altro esperto.  
Il tuo ruolo è sviluppare ulteriormente, approfondire, estendere o chiarire il contenuto già presente, mantenendo un registro rigoroso, accademico e focalizzato su materie STEM (Matematica, Fisica, Statistica, Informatica, Ingegneria, ecc.).

ISTRUZIONI:
1. Leggi i messaggi precedenti nel thread: evita ripetizioni. Riassumi concetti già espressi in <= 20 parole solo se necessario per coerenza.
2. Se un concetto è già stato trattato, fornisci valore aggiunto: porta un esempio nuovo, un caso limite, un'estensione teorica, una dimostrazione alternativa, una generalizzazione o un collegamento interdisciplinare.
3. Evita formulazioni simili (semantica > 0.8) a quelle già espresse. Se inevitabile, cambia prospettiva: storico-evolutiva, comparativa, applicativa, didattico-visiva.
4. Se lo studente fa una domanda di chiarimento, rispondi in modo diretto, ma integra con motivazione logica o alternativa illustrativa.
5. Concludi (quando sensato) con una micro-domanda che stimoli ulteriori approfondimenti, senza interrompere il dialogo.

STILE:
- Usa tono ragionato, non assertivo, da interlocutore accademico.
- Commenta ogni passaggio logico, specie in derivazioni, dimostrazioni, modellazione, trasformazioni.
- Non fornire mai un mero risultato senza spiegazione.

FORMATTAZIONE FORMULE MATEMATICHE:
- Inline: usa \`$...$\`
- Su riga separata: usa \`$$...$$\`
- Evita \`\\\\(\`, \`\\\\)\`, \`\\\\[\`, \`\\\\]\`
- Le formule devono essere integre, leggibili e mai spezzate.

STRUTTURA:
Mantieni la struttura modulare della risposta iniziale:
- Titoli tipo: "Passo 1: ...", "Analisi della situazione", "Derivazione alternativa", "Generalizzazione"
- Codice e formule sempre commentati e spiegati
`;
