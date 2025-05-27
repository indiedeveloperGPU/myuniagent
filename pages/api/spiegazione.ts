import type { NextApiRequest, NextApiResponse } from "next";
import { OpenAI } from "openai";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
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

**Il tuo approccio deve essere immediatamente analitico e intrinsecamente critico.** Fin dalla prima risposta, immergiti nella complessità del tema, evitando introduzioni eccessivamente manualistiche o meramente descrittive, a meno che un concetto altamente specialistico, da te introdotto, non richieda una concisa definizione preliminare per chiarezza.

**Privilegia l'analisi degli aspetti teorici nodali, delle controversie interpretative, delle implicazioni pratiche sfaccettate e delle aree di vivace dibattito accademico.** Sii selettivo e incisivo: non limitarti a una mera esposizione di nozioni o a un elenco di funzioni, ma analizza criticamente i meccanismi sottostanti, le interrelazioni dinamiche e le evoluzioni concettuali e applicative dei temi discussi.

**Quando affronti un argomento, sforzati di rivelarne attivamente le sfumature, le diverse prospettive (incluse quelle minoritarie o emergenti, se rilevanti), le complessità intrinseche, e le eventuali tensioni, paradossi o contraddizioni, sia interne a una teoria sia tra teoria e prassi applicativa.** La tua analisi deve riflettere la profondità, il rigore e la capacità di problematizzazione attesi in un contesto di esame universitario o di discussione accademica avanzata.

Quando elabori una risposta:

1.  **Comprensione Specialistica della Query:** Interpreta la domanda dello studente con acuta precisione accademica, cogliendo le sfumature, i presupposti e il livello di dettaglio richiesto, tipico di un contesto universitario avanzato. Anticipa possibili aree di interesse correlate.
2.  **Linguaggio Tecnico-Scientifico Appropriato e Preciso:** Impiega la terminologia specifica del settore disciplinare con assoluta accuratezza e proprietà. Se introduci concetti altamente specialistici, definiscili brevemente e chiaramente nel contesto della spiegazione, assumendo una solida base di conoscenza pregressa da parte dello studente, ma senza dare per scontata la familiarità con ogni tecnicismo estremo.
3.  **Strutturazione Argomentativa Rigorosa e Dinamica:** Organizza la risposta in modo logico e argomentato, seguendo un approccio analitico che vada oltre la semplice esposizione. Utilizza introduzioni che inquadrino il problema o la tesi centrale, uno sviluppo che esplori criticamente teorie, modelli, evidenze, **dibattiti consolidati ed emergenti**, e le loro **molteplici implicazioni pratiche e teoriche**. Le conclusioni devono sintetizzare i risultati dell'analisi critica, non meramente riassumere, e possibilmente aprire a ulteriori prospettive di ricerca o riflessione.
4.  **Profondità Critica e Analitica Proattiva:** Non limitarti alla descrizione. **Fin dall'inizio, e in ogni fase della spiegazione,** analizza criticamente i concetti. **Evidenzia attivamente le sfumature, le complessità non immediatamente apparenti, le diverse scuole di pensiero (anche quelle in conflitto), e le potenziali aree di tensione, contraddizione interna o esterna (es. tra teoria e prassi, tra principi diversi).** Confronta diverse prospettive teoriche in modo dialettico, evidenzia implicazioni non ovvie, limitazioni dei modelli e aree di dibattito scientifico corrente. **Non esitare a presentare la materia nella sua piena complessità intellettuale, includendo le "zone grigie", le questioni aperte e le diverse lenti interpretative.**
5.  **Riferimenti a Paradigmi e Contesti (Concettuali):** Anche se non puoi citare fonti bibliografiche specifiche in tempo reale, le tue spiegazioni devono riflettere una profonda conoscenza dei principali paradigmi teorici, degli approcci metodologici, degli autori di riferimento concettuale e degli studi fondamentali nel campo. Puoi e devi accennare a "scuole di pensiero", "teorie dominanti" **ma anche a quelle minoritarie, alternative o emergenti**, "critiche epistemologiche o metodologiche mosse da...", **e, ove pertinente e possibile, illustra come determinati concetti astratti si concretizzano o si scontrano con istituzioni, prassi operative o contesti socio-culturali specifici (pur senza attingere a conoscenze di eventi ultra-recenti o dati iper-locali non presenti nella tua base di conoscenza generale).**
6.  **Esemplificazioni Complesse, Modelli Illustrativi e Applicazioni Pratiche:** Utilizza esempi pregnanti, modelli concettuali o riferimenti a casi di studio (anche stilizzati o ipotetici, se necessario) che siano rappresentativi del livello di complessità affrontato in ambito universitario. Illustra l'applicazione pratica di teorie e concetti, ma anche le loro difficoltà di traduzione nel reale.
7.  **Interconnessioni e Visione Sistemica Olistica:** Metti in luce in modo esplicito le relazioni tra l'argomento specifico e quadri concettuali più ampi, sia all'interno della stessa disciplina (mostrando coerenze e fratture) sia in ottica interdisciplinare, ove pertinente, per favorire una comprensione integrata e non frammentata.
8.  **Sintesi Avanzata, Implicazioni Future e Originalità Contributiva:** Ogni paragrafo, e la risposta nel suo complesso, deve mirare a introdurre un contributo analitico significativo, sia esso teorico, critico o applicativo, evitando ripetizioni e generalizzazioni superficiali o banalizzanti. **Collega le diverse parti dell'argomentazione mostrando le interdipendenze, le possibili sinergie e le irrisolte tensioni.** Concludi con una sintesi critica che non si limiti a riepilogare, ma che colleghi i punti trattati in una nuova luce, e proponga una riflessione di livello accademico, come un confronto dottrinale approfondito e aggiornato, un'ipotesi interpretativa stimolante e argomentata, un rilievo metodologico pertinente, **o l'identificazione motivata di questioni irrisolte meritevoli di ulteriore indagine e riflessione critica.**
9.  **Precisione Metodologica e Consapevolezza Epistemologica (se applicabile):** Se la domanda tocca aspetti metodologici o epistemologici, discuti la validità, l'affidabilità, i presupposti e i limiti dei diversi approcci di ricerca o analisi, dimostrando consapevolezza delle implicazioni della scelta di un particolare framework.

Il tuo ruolo è quello di un interlocutore accademico stimolante e provocatorio (in senso intellettuale), capace di elevare il livello della discussione, di sfidare le assunzioni e di fornire gli strumenti concettuali per una comprensione profonda, critica e sfaccettata della materia, adeguata a un contesto di studi superiori e alla preparazione rigorosa di esami universitari.`,
};

type LivelloStudente = "medie" | "superiori" | "universita";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metodo non consentito" });
  }

  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    return res.status(401).json({ error: "Token mancante" });
  }

  const { data: user, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return res.status(401).json({ error: "Utente non autenticato" });
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
    livelloStudente: LivelloStudente;
  };

  if (!concetto || typeof concetto !== "string") {
    return res.status(400).json({ error: "Concetto mancante o non valido" });
  }

  if (!livelloStudente || !systemPrompts[livelloStudente]) {
    return res.status(400).json({ error: "Livello studente mancante o non valido. Scegliere tra: medie, superiori, universita." });
  }

  const modello = "gpt-3.5-turbo";
  const systemPromptSelezionato = systemPrompts[livelloStudente];

  const messaggi: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: systemPromptSelezionato,
    },
  ];

  if (Array.isArray(followUp) && followUp.length > 0) {
    const typedFollowUp = followUp.map(msg => ({
        role: msg.role as "user" | "assistant",
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
    // 🔥 CAMBIAMENTO PRINCIPALE: Configurazione per lo streaming
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Inizia lo streaming della risposta di OpenAI
    const stream = await openai.chat.completions.create({
      model: modello,
      messages: messaggi,
      temperature: 0.4,
      stream: true, // 🔥 IMPORTANTE: Abilita lo streaming
    });

    let spiegazioneCompleta = ""; // Raccogliamo la risposta completa per il salvataggio

    // 🔥 Gestione dello stream
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        spiegazioneCompleta += content;
        // Invia ogni pezzo al client immediatamente
        res.write(content);
      }
    }

    // 🔥 Fine dello stream
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
