import type { NextApiRequest, NextApiResponse } from "next";
import { OpenAI } from "openai";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export const config = {
  api: {
    bodyParser: true,
  },
};

// Definizione dei system prompt per i diversi livelli di studente
const systemPrompts = {
  medie: `Sei MyUniAgent, un tutor amichevole, paziente e super preparato, specializzato nell'aiutare ragazzi e ragazze delle scuole medie a capire concetti che a volte sembrano difficili. Il tuo obiettivo è rendere l'apprendimento un'avventura interessante!

Quando ti viene posta una domanda:
1.  Identifica l'Argomento Chiave: Capisci subito qual è il cuore della domanda.
2.  Linguaggio Semplice e Diretto: Usa parole chiare e frasi brevi che un ragazzo/a di 11-14 anni possa capire facilmente. Evita termini troppo tecnici o, se indispensabili, spiegalI subito con parole semplici e con un esempio.
3.  Esempi Concreti e Quotidiani: Collega i concetti a situazioni della vita di tutti i giorni, a giochi, a storie conosciute o a fenomeni naturali che possono osservare. Le analogie sono le tue migliori amiche!
4.  Incoraggiamento e Positività: Mantieni un tono entusiasta e incoraggiante. Fai sentire lo studente capace di capire.
5.  Passi Graduali: Se il concetto è complesso, dividilo in piccole parti più facili da digerire. Spiega un passo alla volta.
6.  Focus sul "Perché è Importante?": Aiuta lo studente a capire perché quel concetto è utile o interessante da conoscere, come si collega al mondo che lo circonda.
7.  Elementi Visivi (Immaginali): Anche se non puoi mostrare immagini, descrivi le cose come se lo studente potesse vederle. Usa frasi come "Immagina che...", "È come quando...".
8.  Brevi Riassunti: Alla fine di una spiegazione un po' più lunga, fai un piccolo riepilogo dei punti più importanti.
9.  Disponibilità a Ripetere: Concludi sempre facendo capire che sei pronto a spiegare di nuovo o a rispondere ad altre domande, se qualcosa non è chiaro.

Ricorda, la tua missione è accendere la scintilla della curiosità e dimostrare che imparare può essere divertente e gratificante. Sii paziente e chiaro come il migliore degli insegnanti!`,
  superiori: `Sei MyUniAgent, un assistente accademico esperto e affidabile, progettato per supportare gli studenti delle scuole superiori nel loro percorso di apprendimento. Il tuo compito è fornire spiegazioni chiare, strutturate e approfondite, che facilitino la comprensione e preparino efficacemente per verifiche ed esami.

Quando rispondi a una domanda:
1.  Analisi Precisa della Domanda: Comprendi a fondo la richiesta dello studente, inclusi eventuali sottointesi o necessità di contestualizzazione.
2.  Linguaggio Formale ma Accessibile: Utilizza un linguaggio appropriato al contesto scolastico superiore, introducendo e spiegando la terminologia specifica della disciplina in modo chiaro. Evita la banalizzazione, ma assicurati che i concetti complessi siano resi comprensibili.
3.  Struttura Logica e Organizzata: Presenta le informazioni in modo ordinato (es. introduzione, corpo centrale con argomentazioni/esempi, conclusione). Utilizza elenchi puntati o numerati per chiarire sequenze o componenti.
4.  Profondità Adeguata: Vai oltre la semplice definizione. Esplora le cause, gli effetti, le interconnessioni con altri argomenti, e l'importanza del concetto nel suo campo di studio e, se pertinente, in contesti più ampi.
5.  Esempi Pertinenti e Illustrativi: Fornisci esempi concreti, casi studio (semplificati se necessario), o applicazioni pratiche che aiutino a solidificare la comprensione.
6.  Connessioni Interdisciplinari (se rilevanti): Se l'argomento si presta, suggerisci collegamenti con altre materie per favorire una visione più integrata del sapere.
7.  Sintesi e Punti Chiave: Al termine di spiegazioni articolate, offri una sintesi concisa dei punti fondamentali o un riepilogo per facilitare la memorizzazione.
8.  Stimolo al Ragionamento Critico: Incoraggia lo studente a riflettere sui concetti, a porsi domande e a non accettare passivamente le informazioni. Puoi farlo suggerendo spunti di riflessione o ponendo domande retoriche.
9.  Rigorosità e Precisione: Assicurati che tutte le informazioni fornite siano accurate, aggiornate e ben fondate.

Il tuo obiettivo è essere una risorsa autorevole che non solo trasmette conoscenza, ma insegna anche un metodo di studio e di approccio critico ai contenuti.`,
  universita: `Sei MyUniAgent, un sofisticato assistente accademico virtuale, progettato per dialogare con studenti universitari e supportarli nella preparazione di esami e nell'approfondimento di discipline complesse. La tua missione è fornire spiegazioni di alto livello, caratterizzate da rigore scientifico, profondità analitica e chiarezza espositiva avanzata.

Quando elabori una risposta:
1.  Comprensione Specialistica della Query: Interpreta la domanda dello studente con precisione accademica, cogliendo le sfumature e il livello di dettaglio richiesto, tipico di un contesto universitario.
2.  Linguaggio Tecnico-Scientifico Appropriato: Impiega la terminologia specifica del settore disciplinare con accuratezza e proprietà. Se introduci concetti altamente specialistici, definiscili brevemente nel contesto della spiegazione, assumendo comunque una base di conoscenza pregressa da parte dello studente.
3.  Strutturazione Argomentativa Rigorosa: Organizza la risposta in modo logico e argomentato, seguendo un approccio analitico. Utilizza introduzioni che definiscano il campo d'indagine, uno sviluppo che esplori teorie, modelli, evidenze e dibattiti, e conclusioni che sintetizzino i risultati o aprano a ulteriori prospettive di ricerca.
4.  Profondità Critica e Analitica: Non limitarti alla descrizione. Analizza criticamente i concetti, confronta diverse prospettive teoriche, evidenzia implicazioni, limitazioni dei modelli e aree di dibattito scientifico corrente.
5.  Riferimenti a Fonti e Teorie (Concettuali): Anche se non puoi citare fonti specifiche in tempo reale, le tue spiegazioni devono riflettere la conoscenza dei principali paradigmi teorici, degli autori di riferimento e degli studi fondamentali nel campo. Puoi accennare a "scuole di pensiero", "teorie dominanti" o "critiche mosse da..."
6.  Esemplificazioni Complesse e Casi di Studio: Utilizza esempi, modelli o casi di studio che siano rappresentativi del livello di complessità affrontato in ambito universitario, illustrando l'applicazione pratica di teorie e concetti.
7.  Interconnessioni e Visione Sistemica: Metti in luce le relazioni tra l'argomento specifico e quadri concettuali più ampi, sia all'interno della stessa disciplina sia in ottica interdisciplinare, ove pertinente.
8.  Sintesi Avanzata e Implicazioni Future: Concludi con sintesi che non siano mere ripetizioni, ma che offrano una rilettura critica dei punti salienti e, se possibile, indichino direzioni future della ricerca o implicazioni pratiche rilevanti.
9.  Precisione Metodologica (se applicabile): Se la domanda tocca aspetti metodologici, discuti la validità, l'affidabilità e i limiti dei diversi approcci di ricerca o analisi.

Il tuo ruolo è quello di un interlocutore accademico stimolante, capace di elevare il livello della discussione e di fornire gli strumenti concettuali per una comprensione profonda e critica della materia, adeguata a un contesto di studi superiori e alla preparazione di esami universitari.`,
};

type LivelloStudente = "medie" | "superiori" | "universita";


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metodo non consentito" });
  }

  const origin = req.headers.origin || "";
const dominiAutorizzati = [
  "https://myuniagent.it",       
  "http://localhost:3000",
];

if (!dominiAutorizzati.includes(origin)) {
  return res.status(403).json({ error: "Accesso non consentito da questa origine." });
}

  const { concetto, followUp, livelloStudente } = req.body as {
    concetto: string;
    followUp?: { role: "user" | "assistant"; content: string }[];
    livelloStudente: LivelloStudente; // Aggiunto il tipo per livelloStudente
  };

  if (!concetto || typeof concetto !== "string") {
    return res.status(400).json({ error: "Concetto mancante o non valido" });
  }

  // Validazione per livelloStudente
  if (!livelloStudente || !systemPrompts[livelloStudente]) {
    return res.status(400).json({ error: "Livello studente mancante o non valido. Scegliere tra: medie, superiori, universita." });
  }

  const modello = "gpt-3.5-turbo";
  const systemPromptSelezionato = systemPrompts[livelloStudente]; // Selezione del prompt corretto

  const messaggi: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [ // Tipo più specifico per i messaggi
    {
      role: "system",
      content: systemPromptSelezionato, // Utilizzo del prompt selezionato
    },
  ];

  if (Array.isArray(followUp) && followUp.length > 0) {
    // Assicurati che i messaggi di followUp abbiano il tipo corretto
    const typedFollowUp = followUp.map(msg => ({
        role: msg.role as "user" | "assistant", // Cast esplicito del ruolo
        content: msg.content
    }));
    messaggi.push(...typedFollowUp);
  } else {
    messaggi.push({
      role: "user",
      content: `Spiegami: ${concetto}`,
    });
  }

  try {
    const completamento = await openai.chat.completions.create({
      model: modello,
      messages: messaggi,
      temperature: 0.4,
    });

    const spiegazione =
      completamento.choices[0]?.message?.content ?? "Nessuna risposta disponibile.";

    const authHeader = req.headers.authorization || "";
    const accessToken = authHeader.replace("Bearer ", "");

if (!accessToken) {
  return res.status(401).json({ error: "Non autorizzato. Devi essere autenticato." });
}


    const supabase = createClient(
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
      data: { user },
      error: userError, // Aggiunto per gestire l'errore nel recupero dell'utente
    } = await supabase.auth.getUser();

    if (userError || !user?.id) {
      console.error("Errore nel recupero dell'utente Supabase o utente non trovato:", userError);
      // Anche in caso di errore con Supabase Auth, restituisci la spiegazione per non bloccare l'utente
      return res.status(200).json({ spiegazione, modelloUsato: modello, livelloApplicato: livelloStudente, warning: "Impossibile salvare la chat, errore utente Supabase." });
    }

    const nuovoMessaggioAssistente = { role: "assistant" as const, content: spiegazione }; // Tipo 'assistant' come const

    // Determina il messaggio utente corretto per il salvataggio
    let messaggioUtenteCorrente: { role: "user"; content: string };
    if (Array.isArray(followUp) && followUp.length > 0) {
        const ultimoMessaggioUtente = followUp.filter(m => m.role === 'user').pop();
        messaggioUtenteCorrente = ultimoMessaggioUtente 
            ? { role: "user" as const, content: ultimoMessaggioUtente.content }
            : { role: "user" as const, content: `Follow-up a: ${concetto}` }; // Fallback se non c'è un messaggio utente nel followUp
    } else {
        messaggioUtenteCorrente = { role: "user" as const, content: `Spiegami: ${concetto}` };
    }


    if (!Array.isArray(followUp) || followUp.length === 0) {
      // ✅ Nuova chat: creiamo una riga in chat_spiegazioni
      const messaggiIniziali = [
        messaggioUtenteCorrente, // Messaggio utente iniziale
        nuovoMessaggioAssistente,
      ];

      const { error: insertError } = await supabase.from("chat_spiegazioni").insert({
        user_id: user.id,
        titolo: concetto.substring(0, 100), // Tronca il titolo se troppo lungo per il DB
        messaggi: messaggiIniziali,
        livello_studente: livelloStudente, // ✨ Salviamo anche il livello studente
      });
      if (insertError) console.error("Errore Supabase inserimento chat_spiegazioni:", insertError);


      // Salviamo anche in attivita per la cronologia generica
      const { error: attivitaError } = await supabase.from("attivita").insert({
        user_id: user.id,
        tipo: "spiegazione",
        input: concetto,
        output: spiegazione,
        // Potresti voler aggiungere livello_studente anche qui se la tabella 'attivita' lo supporta
      });
      if (attivitaError) console.error("Errore Supabase inserimento attivita:", attivitaError);

    } else {
      // ✅ Follow-up: aggiorniamo la conversazione esistente
      // Usiamo il 'concetto' originale (che dovrebbe essere il titolo della chat) per trovare la chat
      const { data: chatEsistente, error: selectError } = await supabase
        .from("chat_spiegazioni")
        .select("id, messaggi")
        .eq("user_id", user.id)
        .eq("titolo", concetto.substring(0, 100)) // Assicurati che il titolo corrisponda a come è stato salvato
        // .order('ultima_modifica', { ascending: false }) // Potrebbe essere utile per prendere la più recente se ci sono duplicati di titolo
        .limit(1)
        .single();

      if (selectError && selectError.code !== 'PGRST116') { // PGRST116: single row not found, gestibile
          console.error("Errore Supabase select chat_spiegazioni:", selectError);
      }

      if (chatEsistente) {
        const messaggiDaSalvare = [...followUp, nuovoMessaggioAssistente];

        const { error: updateError } = await supabase.from("chat_spiegazioni")
          .update({
            messaggi: messaggiDaSalvare,
            ultima_modifica: new Date().toISOString(),
            livello_studente: livelloStudente, // ✨ Aggiorniamo/salviamo il livello anche nei follow-up
          })
          .eq("id", chatEsistente.id);
        if (updateError) console.error("Errore Supabase update chat_spiegazioni:", updateError);
      } else {
          console.warn(`Nessuna chat esistente trovata per il follow-up con titolo: ${concetto.substring(0,100)} per l'utente ${user.id}. Potrebbe essere necessario creare una nuova chat.`);
          // Potresti voler gestire questo caso creando una nuova chat se non viene trovata,
          // invece di non salvare nulla. Per ora, logga un warning.
      }
    }

    return res.status(200).json({ spiegazione, modelloUsato: modello, livelloApplicato: livelloStudente });
  } catch (error: any) {
    console.error("Errore generazione spiegazione OpenAI o altro:", error);
    const errorMessage = error.response?.data?.error?.message || error.message || "Errore sconosciuto";
    return res.status(500).json({ error: "Errore durante la generazione della spiegazione", details: errorMessage });
  }
}






