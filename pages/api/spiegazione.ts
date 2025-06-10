import type { NextApiRequest, NextApiResponse } from "next";
import { OpenAI } from "openai";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({
  apiKey: process.env.TOGETHER_API_KEY!,
  baseURL: "https://api.together.xyz/v1",
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
  maverick: "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
};

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

  const { concetto, followUp, livelloStudente } = req.body as {
  concetto: string;
  followUp?: { role: "user" | "assistant"; content: string }[];
  livelloStudente: LivelloStudente;
};

  if (!concetto || typeof concetto !== "string") {
    return res.status(400).json({ error: "Concetto mancante o non valido" });
  }

  if (!livelloStudente || !["medie", "superiori", "universita"].includes(livelloStudente)) {
  return res.status(400).json({ error: "Livello studente non valido. Scegliere tra: medie, superiori, universita." });
}


  const modelloKey: ModelloRichiesto = followUp && followUp.length > 0 ? "scout" : "maverick";
  const modelloFinale = modelliDisponibili[modelloKey];
  const promptScout = `Sei MyUniAgent un'assistente specializzato nel supporto accademico. La tua missione è facilitare l'apprendimento attraverso spiegazioni rigorose, analisi strutturate e problematizzazione intelletuale.
  Approfondisci sempre il contesto che ricevi senza mai essere ripetitivo sia nell'output che fornisci e sia nelle risposte che già analizzi e di cui ti basi in precedenza
  1. Leggi i messaggi in thread; se un concetto e gia presente, riassumilo in <= 20 parole.
2. Aggiungi solo materiale nuovo (esempi, dati, paragoni, contro-argomenti inediti).
3. Evita frasi con similarita semantica > 0.8 rispetto ai messaggi precedenti.
4. Se il contributo sarebbe per forza ripetitivo, sposta il focus a un livello di analisi diverso (sentenze emblematiche, comparazione internazionale, prospettiva storico-evolutiva).`;

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
Ricorda: Il tuo ruolo è quello di un interlocutore accademico competente che facilita l'apprendimento critico attraverso l'analisi rigorosa, non quello di un'autorità che impone interpretazioni definitive.`;

// Usa il prompt corretto in base al modello
const systemPromptSelezionato = modelloKey === "maverick" ? promptMaverick : promptScout;
console.log(`🧠 Modello usato: ${modelloKey}`);
console.log(`📚 Prompt selezionato:\n${systemPromptSelezionato}`);



  const messaggi: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPromptSelezionato },
  ];

  if (Array.isArray(followUp) && followUp.length > 0) {
    messaggi.push(...followUp.map(msg => ({ role: msg.role, content: msg.content })));
  } else {
    messaggi.push({ role: "user", content: `Spiegami: ${concetto}` });
  }

  try {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Transfer-Encoding", "chunked");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    let stream;

let spiegazioneCompleta = "";

if (modelloKey === "maverick") {
  // Modello instruct (LLaMA): usare completions.create con prompt string
  const messaggiPrompt = messaggi
    .map(m => `${m.role === "system" ? "Sistema" : m.role === "user" ? "Utente" : "Assistente"}: ${m.content}`)
    .join("\n") + "\nAssistente:";

  const instructStream = await openai.completions.create({
    model: modelloFinale,
    prompt: messaggiPrompt,
    temperature: 0.2,
    max_tokens: 2000,
    stream: true,
  });

  for await (const chunk of instructStream) {
    const content = (chunk as any).choices?.[0]?.text || "";
    if (content) {
      spiegazioneCompleta += content;
      res.write(content);
    }
  }
} else {
  // Modello chat (es. GPT): usare chat.completions.create con messages[]
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
}


    res.end();

    // 🔥 SALVATAGGIO ASINCRONO: Ora salviamo i dati dopo aver completato lo streaming
    // Questo evita di rallentare la risposta all'utente
    setImmediate(async () => {
      try {
        const authHeader = req.headers.authorization || "";
        const accessToken = authHeader.replace("Bearer ", "");

        if (!accessToken) {
          console.error("Token mancante per il salvataggio asincrono");
          return;
        }

        const supabaseAuth = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
            global: {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            },
          }
        );

        const {
          data: { user: authUser },
          error: userError,
        } = await supabaseAuth.auth.getUser();

        if (userError || !authUser?.id) {
          console.error("Errore nel recupero dell'utente per salvataggio:", userError);
          return;
        }

        const nuovoMessaggioAssistente = { role: "assistant" as const, content: spiegazioneCompleta };

        let messaggioUtenteCorrente: { role: "user"; content: string };
        if (Array.isArray(followUp) && followUp.length > 0) {
            const ultimoMessaggioUtente = followUp.filter(m => m.role === 'user').pop();
            messaggioUtenteCorrente = ultimoMessaggioUtente 
                ? { role: "user" as const, content: ultimoMessaggioUtente.content }
                : { role: "user" as const, content: `Follow-up a: ${concetto}` };
        } else {
            messaggioUtenteCorrente = { role: "user" as const, content: `Spiegami: ${concetto}` };
        }

        if (!Array.isArray(followUp) || followUp.length === 0) {
          // Nuova chat
          const messaggiIniziali = [
            messaggioUtenteCorrente,
            nuovoMessaggioAssistente,
          ];

          const { error: insertError } = await supabaseAuth.from("chat_spiegazioni").insert({
            user_id: authUser.id,
            titolo: concetto.substring(0, 100),
            messaggi: messaggiIniziali,
            livello_studente: livelloStudente,
          });
          if (insertError) console.error("Errore Supabase inserimento chat_spiegazioni:", insertError);

          const { error: attivitaError } = await supabaseAuth.from("attivita").insert({
            user_id: authUser.id,
            tipo: "spiegazione",
            input: concetto,
            output: spiegazioneCompleta,
          });
          if (attivitaError) console.error("Errore Supabase inserimento attivita:", attivitaError);

        } else {
          // Follow-up
          const { data: chatEsistente, error: selectError } = await supabaseAuth
            .from("chat_spiegazioni")
            .select("id, messaggi")
            .eq("user_id", authUser.id)
            .eq("titolo", concetto.substring(0, 100))
            .limit(1)
            .single();

          if (selectError && selectError.code !== 'PGRST116') {
              console.error("Errore Supabase select chat_spiegazioni:", selectError);
          }

          if (chatEsistente) {
            const messaggiDaSalvare = [...followUp, nuovoMessaggioAssistente];

            const { error: updateError } = await supabaseAuth.from("chat_spiegazioni")
              .update({
                messaggi: messaggiDaSalvare,
                ultima_modifica: new Date().toISOString(),
                livello_studente: livelloStudente,
              })
              .eq("id", chatEsistente.id);
            if (updateError) console.error("Errore Supabase update chat_spiegazioni:", updateError);
          } else {
              console.warn(`Nessuna chat esistente trovata per il follow-up con titolo: ${concetto.substring(0,100)} per l'utente ${authUser.id}`);
          }
        }
      } catch (saveError) {
        console.error("Errore durante il salvataggio asincrono:", saveError);
      }
    });

  } catch (error: any) {
    console.error("Errore generazione spiegazione OpenAI:", error);
    const errorMessage = error.response?.data?.error?.message || error.message || "Errore sconosciuto";
    res.status(500).json({ error: "Errore durante la generazione della spiegazione", details: errorMessage });
  }
}
