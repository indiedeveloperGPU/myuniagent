// IMPORT PRINCIPALI
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";
import ReactMarkdown from "react-markdown";
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import ImageModal from "@/components/ImageModal";



// COMPONENTE
export default function Spiegazione() {
  const [input, setInput] = useState("");
  const [risposta, setRisposta] = useState("");
  const [loading, setLoading] = useState(false);
  const [userChecked, setUserChecked] = useState(false);
  const [chat, setChat] = useState<{ role: string; content: string }[]>([]);
  const [followUp, setFollowUp] = useState("");
  const [livello, setLivello] = useState("superiori"); 
  const concetto = chat[0]?.role === "user" ? chat[0].content : "Argomento della spiegazione";
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [suggerimenti, setSuggerimenti] = useState<string[]>([]);
  const [mostraSuggerimenti, setMostraSuggerimenti] = useState(false);
  const [suggerimentoLoading, setSuggerimentoLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);



  const [followUpLoading, setFollowUpLoading] = useState(false);
  const [chatSalvate, setChatSalvate] = useState<{ titolo: string; data: string }[]>([]);

  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        window.location.href = "/auth";
        return;
      }
      setUserChecked(true);
    };
    checkUser();
  }, []);

  useEffect(() => {
    const concettoQuery = router.query.concetto as string;
    if (concettoQuery) {
      setInput(concettoQuery);
      caricaChatOGenera(concettoQuery);
    }
  }, [router.query]);

  useEffect(() => {
    const caricaChatSalvate = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) return;

      const { data } = await supabase
        .from("chat_spiegazioni")
        .select("titolo, ultima_modifica")
        .eq("user_id", user.id)
        .order("ultima_modifica", { ascending: false });

      if (data) {
        setChatSalvate(data.map(chat => ({
          titolo: chat.titolo,
          data: new Date(chat.ultima_modifica).toLocaleString()
        })));
      }
    };

    if (userChecked) caricaChatSalvate();
  }, [userChecked]);

  const caricaChatOGenera = async (testo: string) => {
    setInput(testo);
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) return generaSpiegazione(testo);

    const { data: chatEsistente } = await supabase
      .from("chat_spiegazioni")
      .select("messaggi")
      .eq("user_id", user.id)
      .eq("titolo", testo)
      .maybeSingle()

    if (chatEsistente?.messaggi) {
      setChat(chatEsistente.messaggi);
      const last = chatEsistente.messaggi
        .slice().reverse()
        .find((msg: any) => msg.role === "assistant")?.content;
      if (last) setRisposta(last);
    } else {
      generaSpiegazione(testo);
    }

    setLoading(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  const url = URL.createObjectURL(file);
  setImageUrl(url);
  setShowImageModal(true);
};


  const eliminaConversazione = async (titolo: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) return;
    await supabase
      .from("chat_spiegazioni")
      .delete()
      .eq("user_id", user.id)
      .eq("titolo", titolo);

    setChatSalvate(prev => prev.filter(c => c.titolo !== titolo));
    if (input === titolo) {
      setInput(""); setChat([]); setRisposta("");
    }
  };

  const normalizeLatex = (text: string): string => {
  let normalized = text
    .replace(/\\\\\[/g, '\\[')
    .replace(/\\\\\]/g, '\\]')
    .replace(/\\\\\(/g, '\\(')
    .replace(/\\\\\)/g, '\\)')
    .replace(/\\\[/g, '$$')
    .replace(/\\\]/g, '$$')
    .replace(/\\\(/g, '$')
    .replace(/\\\)/g, '$');
  normalized = normalized.replace(/(^|[^$\\])([a-zA-Z0-9]+)\^(\([^)]+\)|[a-zA-Z0-9]+)/g, (match, before, base, exp) => {
    return `${before}$${base}^{${exp.replace(/^\(|\)$/g, '')}}$`;
  });

  return normalized;
};




  const generaSpiegazione = async (testo: string) => {
    if (!testo || isSubmitting) return;

    setIsSubmitting(true);
    setLoading(true);
    setRisposta(""); // Pulisci la risposta precedente
    // Aggiungi subito il messaggio dell'utente e un segnaposto per l'assistente
    const userMessage = { role: "user" as const, content: testo };
    const assistantPlaceholder = { role: "assistant" as const, content: "" }; // Inizia vuoto
    setChat([userMessage, assistantPlaceholder]);

    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;

    try {
      const res = await fetch("/api/spiegazione", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          concetto: testo,
          livelloStudente: livello, // Assicurati che 'livello' sia lo stato corretto
        }),
      });

      if (!res.ok || !res.body) {
        // Se la risposta non è ok (es. errore 500, 400 prima dello stream)
        // o se non c'è un corpo della risposta, gestisci l'errore.
        const errorData = await res.json().catch(() => ({ error: "Errore sconosciuto nel leggere la risposta" }));
        toast.error(errorData.error || "Errore durante la generazione della spiegazione.");
        setChat(prevChat => prevChat.slice(0, prevChat.length -1)); // Rimuovi il placeholder dell'assistente
        setLoading(false);
        setIsSubmitting(false);
        return;
      }

      // 🔥 Inizio gestione dello stream
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedResponse = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break; // Lo stream è terminato

        const chunk = decoder.decode(value, { stream: true });
        accumulatedResponse += chunk;

        // Aggiorna l'ultimo messaggio (quello dell'assistente) nella chat
        setChat(prevChat => {
          const newChat = [...prevChat];
          if (newChat.length > 0 && newChat[newChat.length - 1].role === "assistant") {
            newChat[newChat.length - 1].content = accumulatedResponse;
          }
          return newChat;
        });
        setRisposta(accumulatedResponse); // Aggiorna anche lo stato 'risposta' se lo usi per display separato
      }
      // Assicurati che l'ultimo pezzetto sia processato se il decoder ha bufferizzato qualcosa
      const finalChunk = decoder.decode();
       if (finalChunk) {
           accumulatedResponse += finalChunk;
           setChat(prevChat => {
               const newChat = [...prevChat];
               if (newChat.length > 0 && newChat[newChat.length - 1].role === "assistant") {
                   newChat[newChat.length - 1].content = accumulatedResponse;
               }
               return newChat;
           });
           setRisposta(accumulatedResponse);
       }
      // 🔥 Fine gestione dello stream

    } catch (error) {
      console.error("Errore nel fetch o nello streaming:", error);
      toast.error("Si è verificato un errore durante la richiesta.");
      // Potresti voler rimuovere il placeholder dell'assistente anche qui
       setChat(prevChat => {
           if (prevChat.length > 0 && prevChat[prevChat.length -1].role === "assistant" && prevChat[prevChat.length -1].content === "") {
               return prevChat.slice(0, prevChat.length -1);
           }
           return prevChat;
       });
    } finally {
      setLoading(false);
      setIsSubmitting(false);
    }
  };

  const ottimizzaPrompt = async () => {
  if (!input.trim()) {
    toast.error("Inserisci una domanda prima.");
    return;
  }

  setSuggerimentoLoading(true);
  toast.loading("Analisi in corso... ✨", { id: "ottimizza" });
  setMostraSuggerimenti(false);

  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;

  try {
    const res = await fetch("/api/ottimizzaPrompt", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ domanda: input }),
    });

    const data = await res.json();
    if (res.ok && data.suggestions) {
      if (Array.isArray(data.suggestions)) {
  const suggeriti = data.suggestions
    .map((s: string) => s.trim())
    .filter((s: string) => s.length > 10);
  const filtrati = suggeriti.filter((s: string) => !s.toLowerCase().startsWith("ecco alcune"));
setSuggerimenti(filtrati.slice(0, 3));
} else {
  console.warn("Suggerimenti in formato inatteso:", data.suggestions);
  toast.error("Errore nel ricevere i suggerimenti.");
}

      setMostraSuggerimenti(true);
    } else {
      toast.error("Nessun suggerimento disponibile.");
    }
  } catch (error) {
    console.error("Errore ottimizzazione:", error);
    toast.error("Errore durante l'analisi della domanda.");
  } finally {
    setSuggerimentoLoading(false);
    toast.dismiss("ottimizza");
  }
};


  const generaSpiegazioneFox = async (testo: string) => {
  if (!testo || isSubmitting) return;

  setIsSubmitting(true);
  setLoading(true);
  setRisposta("");
  const userMessage = { role: "user" as const, content: testo };
  const assistantPlaceholder = { role: "assistant" as const, content: "" };
  setChat([userMessage, assistantPlaceholder]);

  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;

  try {
    const res = await fetch("/api/spiegazione", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        concetto: testo,
        livelloStudente: livello,
      }),
    });

    if (!res.ok || !res.body) {
      const errorData = await res.json().catch(() => ({ error: "Errore sconosciuto nel leggere la risposta" }));
      toast.error(errorData.error || "Errore durante la richiesta ad Agente Fox.");
      setChat(prevChat => prevChat.slice(0, prevChat.length - 1));
      setLoading(false);
      setIsSubmitting(false);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let accumulatedResponse = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      accumulatedResponse += chunk;
      setChat(prevChat => {
        const newChat = [...prevChat];
        if (newChat.length > 0 && newChat[newChat.length - 1].role === "assistant") {
          newChat[newChat.length - 1].content = accumulatedResponse;
        }
        return newChat;
      });
      setRisposta(accumulatedResponse);
    }

    const finalChunk = decoder.decode();
    if (finalChunk) {
      accumulatedResponse += finalChunk;
      setChat(prevChat => {
        const newChat = [...prevChat];
        if (newChat.length > 0 && newChat[newChat.length - 1].role === "assistant") {
          newChat[newChat.length - 1].content = accumulatedResponse;
        }
        return newChat;
      });
      setRisposta(accumulatedResponse);
    }

  } catch (error) {
    console.error("Errore con Fox:", error);
    toast.error("Errore durante la richiesta ad Agente Fox.");
    setChat(prevChat => {
      if (prevChat.length > 0 && prevChat[prevChat.length - 1].role === "assistant" && prevChat[prevChat.length - 1].content === "") {
        return prevChat.slice(0, prevChat.length - 1);
      }
      return prevChat;
    });
  } finally {
    setLoading(false);
    setIsSubmitting(false);
  }
};


  const inviaAgenteFox = async () => {
  if (!input.trim()) {
    toast.error("Inserisci prima una domanda o un concetto.");
    return;
  }

  toast.success("🦊 Agente Fox sta generando la spiegazione...");
  await generaSpiegazioneFox(input);
};

  

  const inviaFollowUp = async () => {
    if (!followUp.trim() || isSubmitting || followUpLoading) return; // Aggiunto followUpLoading al controllo

    setIsSubmitting(true);
    setFollowUpLoading(true);

    const userMessageContent = followUp;
    // Aggiungi subito il messaggio dell'utente alla chat
    const newChatWithMessage = [...chat, { role: "user" as const, content: userMessageContent }];
    // Aggiungi un segnaposto per la risposta dell'assistente
    const assistantPlaceholder = { role: "assistant" as const, content: "" };
    setChat([...newChatWithMessage, assistantPlaceholder]);
    setFollowUp(""); // Svuota l'input del follow-up
    setRisposta(""); // Pulisci la risposta precedente

    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;

    try {
      const res = await fetch("/api/spiegazione", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          concetto: chat[0]?.content || "Argomento sconosciuto", // Usa il primo messaggio come concetto base
          followUp: newChatWithMessage, // Invia la cronologia fino al messaggio dell'utente corrente
          livelloStudente: livello,
        }),
      });

      if (!res.ok || !res.body) {
        const errorData = await res.json().catch(() => ({ error: "Errore sconosciuto nel leggere la risposta del follow-up" }));
        toast.error(errorData.error || "Errore durante l'invio del follow-up.");
        setChat(prevChat => prevChat.slice(0, prevChat.length -1)); // Rimuovi il placeholder dell'assistente
        setFollowUpLoading(false);
        setIsSubmitting(false);
        return;
      }

      // 🔥 Inizio gestione dello stream per follow-up
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedResponse = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        accumulatedResponse += chunk;

        setChat(prevChat => {
          const newChat = [...prevChat];
          if (newChat.length > 0 && newChat[newChat.length - 1].role === "assistant") {
            newChat[newChat.length - 1].content = accumulatedResponse;
          }
          return newChat;
        });
        setRisposta(accumulatedResponse);
      }
      
      const finalChunk = decoder.decode();
      if (finalChunk) {
          accumulatedResponse += finalChunk;
          setChat(prevChat => {
              const newChat = [...prevChat];
              if (newChat.length > 0 && newChat[newChat.length - 1].role === "assistant") {
                  newChat[newChat.length - 1].content = accumulatedResponse;
              }
              return newChat;
          });
          setRisposta(accumulatedResponse);
      }
      // 🔥 Fine gestione dello stream per follow-up

    } catch (error) {
      console.error("Errore nel fetch o nello streaming del follow-up:", error);
      toast.error("Si è verificato un errore durante la richiesta di follow-up.");
       setChat(prevChat => {
           if (prevChat.length > 0 && prevChat[prevChat.length -1].role === "assistant" && prevChat[prevChat.length -1].content === "") {
               return prevChat.slice(0, prevChat.length -1);
           }
           return prevChat;
       });
    } finally {
      setFollowUpLoading(false);
      setIsSubmitting(false);
    }
  };
  
  if (!userChecked) return <DashboardLayout><p>Caricamento...</p></DashboardLayout>;

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold mb-4">📘 Spiegazione completa</h1>

      {/* Box Aiuto */}
<div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 border-l-4 border-blue-500 text-blue-900 dark:text-blue-100 p-6 rounded-xl shadow-md transition-transform hover:scale-[1.01] space-y-4 mb-6">
  <h2 className="text-lg font-bold flex items-center gap-2">
    🎯 <span>Come funziona la sezione <span className="italic">"Spiegazione"</span></span>
  </h2>

  <p className="text-sm leading-relaxed">
    In questa sezione puoi ricevere <strong>spiegazioni personalizzate, dettagliate e intelligenti</strong> su qualunque argomento. Puoi inserire testo manualmente oppure <strong>caricare immagini</strong> per estrarre automaticamente il contenuto (OCR incluso).
  </p>

  <ul className="list-disc ml-5 text-sm space-y-1 leading-relaxed">
    <li>📝 <strong>Scrivi un concetto, argomento o domanda</strong> nel campo apposito.</li>
    <li>🎓 <strong>Seleziona il tuo livello scolastico</strong>: il linguaggio si adatterà (Medie, Superiori, Università).</li>
    <li>📎 <strong>Carica una foto</strong> per ottenere spiegazioni a partire dal testo contenuto nell’immagine.</li>
    <li>🔁 <strong>Continua la conversazione</strong>: puoi chiedere chiarimenti, esempi o confronti.</li>
  </ul>

  <div className="border-t border-blue-300 dark:border-blue-700 pt-3">
    <p className="text-sm font-semibold">💡 Esempi di domande efficaci:</p>
    <ul className="list-disc ml-5 text-sm space-y-1 leading-relaxed mt-1">
      <li>❌ <span className="italic text-red-700 dark:text-red-300">Domanda troppo generica:</span> “Spiegami il diritto”</li>
      <li>✅ <span className="italic text-green-700 dark:text-green-300">Domanda mirata:</span> “Qual è la differenza tra diritto oggettivo e soggettivo nel sistema italiano?”</li>
      <li>✅ <span className="italic text-green-700 dark:text-green-300">Domanda tecnica:</span> “Come si calcola l'elasticità della domanda rispetto al prezzo?”</li>
      <li>✅ <span className="italic text-green-700 dark:text-green-300">Domanda accademica:</span> “Qual è l'approccio di Rawls alla giustizia distributiva?”</li>
    </ul>
  </div>

  <p className="text-sm leading-relaxed">
    🎓 Più la tua richiesta è <strong>chiara, precisa e ben contestualizzata</strong>, migliore sarà la spiegazione. Questo strumento è pensato per aiutarti concretamente nello studio, negli esami e nel colmare lacune.
  </p>
</div>


      <div className="flex flex-col gap-3 mb-4">
        <textarea className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded p-2"
          placeholder="Inserisci il concetto da spiegare..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />

        <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-2 items-start sm:items-center">
  <label htmlFor="livello" className="text-sm font-medium text-gray-700 dark:text-gray-300">
    🎓 Seleziona il livello:
  </label>
  <select
    id="livello"
    value={livello}
    onChange={(e) => setLivello(e.target.value)}
    className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded p-2"
  >
    <option value="medie">Medie</option>
    <option value="superiori">Superiori</option>
    <option value="universita">Università</option>
  </select>
</div>

        <button
  onClick={() => generaSpiegazioneFox(input)}
  disabled={!input.trim() || isSubmitting}
  className={`relative bg-orange-600 hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-800 text-white px-4 py-2 rounded transition flex items-center justify-center ${
    isSubmitting ? "opacity-50 cursor-not-allowed" : ""
  }`}
>
  {isSubmitting ? (
    <>
      <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8v8H4z"
        />
      </svg>
      Attendi, Fox sta pensando...
    </>
  ) : (
    <>
      🦊 Chiedi supporto all’Agente Fox
    </>
  )}
</button>

        <button
  onClick={ottimizzaPrompt}
  disabled={!input.trim() || suggerimentoLoading}
  className="bg-purple-600 hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-800 text-white px-4 py-2 rounded relative group transition-all"
  title="Analizza e migliora la tua domanda per ottenere spiegazioni più precise"
>
  ✨ Ottimizza domanda
  <span className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-max text-xs text-white bg-gray-900 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200">
    Ricevi 1–3 versioni migliorate
  </span>
</button>
<div className="flex items-center gap-3">
  <label htmlFor="image-upload" className="flex items-center gap-2 cursor-pointer px-4 py-2 rounded bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-100 border border-blue-300 dark:border-blue-600 hover:bg-blue-200 dark:hover:bg-blue-700 transition-all text-sm">
    🖼️ Carica immagine
    <input
      id="image-upload"
      type="file"
      accept="image/*"
      onChange={handleImageUpload}
      className="hidden"
    />
  </label>
  <span className="text-sm text-muted-foreground">Puoi caricare una foto di un testo stampato o scritto</span>
</div>

      </div>
      {mostraSuggerimenti && suggerimenti.length > 0 && (
  <div className="relative bg-white/80 dark:bg-[#1e1e1e]/80 backdrop-blur-md border border-gray-200 dark:border-gray-700 p-6 rounded-xl shadow-lg mb-6 transition-all">
    <button
      onClick={() => setMostraSuggerimenti(false)}
      className="absolute top-3 right-3 text-gray-400 hover:text-red-500 text-sm transition"
      title="Chiudi suggerimenti"
    >
      ✖
    </button>
    <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
      <span className="text-blue-500">💡</span>
      <span>Migliora la tua domanda</span>
    </h2>

    <div className="grid gap-4">
      {suggerimenti.map((sugg, i) => (
        <div
          key={i}
          className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-800 shadow-sm transition hover:shadow-md flex justify-between items-start"
        >
          <p className="text-sm text-gray-800 dark:text-gray-100 max-w-[80%]">{sugg}</p>
          <button
            className="text-sm bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-3 py-1.5 rounded-md shadow-sm transition"
            onClick={() => {
              setInput(sugg);
              setMostraSuggerimenti(false);
              toast.success("Domanda ottimizzata selezionata.");
            }}
          >
            Usa
          </button>
        </div>
      ))}
    </div>
  </div>
)}

      {chatSalvate.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">🗂️ Le mie conversazioni salvate</h2>
          <div className="flex flex-col gap-2">
            {chatSalvate.map((c, i) => (
              <div key={i} className="flex justify-between items-center bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 p-2 rounded">
                <div onClick={() => caricaChatOGenera(c.titolo)} className="cursor-pointer flex-1">
                <div className="font-medium text-blue-700 dark:text-blue-300">{c.titolo}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Ultima modifica: {c.data}</div>
                </div>
                <button onClick={() => eliminaConversazione(c.titolo)} className="text-red-500 hover:text-red-700 text-sm ml-4">
                  🗑
                </button>
              </div>
            ))}
          </div>
        </div>
      )}


<div className="mb-4">{loading && (
  <div className="mb-4 transition-opacity duration-500 opacity-100">
    <div className="flex items-center gap-3 bg-gray-100 dark:bg-gray-800 p-4 rounded shadow">
      <svg className="animate-spin h-5 w-5 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
      </svg>
      <span className="text-sm text-gray-700 dark:text-gray-200">
        Sto elaborando la spiegazione…
      </span>
    </div>
  </div>
)}
</div>
      {chat.length > 0 && (
  <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded shadow">
    <h2 className="font-semibold mb-4 text-xl text-gray-800 dark:text-gray-100">📄 Conversazione:</h2>
    <div className="flex flex-col gap-4 max-h-[400px] overflow-y-auto">
      {chat.map((msg, i) => (
        <div
          key={i}
          className={`w-full p-4 rounded-md border text-base leading-relaxed shadow-sm ${
            msg.role === "user"
              ? "bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700"
              : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"
          }`}
        >
          <div className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">
            {msg.role === "user" ? "🙋‍♂️ Tu" : "🎓 MyUniAgent"}
          </div>
          <div className="max-w-none text-base leading-relaxed text-gray-900 dark:text-gray-100">
<div className="prose prose-sm md:prose-base lg:prose-lg dark:prose-invert max-w-none markdown-table">
  <ReactMarkdown
   remarkPlugins={[remarkMath, remarkGfm]}
   rehypePlugins={[rehypeKatex, rehypeHighlight]}
  >
    {normalizeLatex(msg.content)}
  </ReactMarkdown>
  </div>
</div>


        </div>
      ))}
    </div>

    {/* Campo follow-up */}
    <div className="flex gap-2 mt-4">
      <input
        type="text"
        className="flex-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded p-2"
        placeholder="Fai una domanda di approfondimento..."
        value={followUp}
        onChange={(e) => setFollowUp(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && inviaFollowUp()}
      />
      <button
        onClick={inviaFollowUp}
        disabled={!followUp.trim() || followUpLoading || isSubmitting}
        className={`bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 transition ${
          followUpLoading || isSubmitting ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        {followUpLoading || isSubmitting ? "⏳ Invio in corso..." : "✉️ Invia"}
      </button>
    </div>
  </div>
)}

{showImageModal && imageUrl && (
  <ImageModal
    open={showImageModal}
    onClose={() => setShowImageModal(false)}
    imageUrl={imageUrl}
    onExtractedText={(text) => {
      setInput((prev) => `${prev ? prev + "\n\n" : ""}${text}`);
      setShowImageModal(false);
    }}
  />
)}


    </DashboardLayout>
  );
}


Spiegazione.requireAuth = true;
