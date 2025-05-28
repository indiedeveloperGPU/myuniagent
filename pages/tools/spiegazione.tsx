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

// COMPONENTE
export default function Spiegazione() {
  const [input, setInput] = useState("");
  const [risposta, setRisposta] = useState("");
  const [loading, setLoading] = useState(false);
  const [userChecked, setUserChecked] = useState(false);
  const [chat, setChat] = useState<{ role: string; content: string }[]>([]);
  const [followUp, setFollowUp] = useState("");
  const [inviatoAFox, setInviatoAFox] = useState(false);
  const [fade, setFade] = useState(false); 
  const [livello, setLivello] = useState("superiori"); 
  const concetto = chat[0]?.role === "user" ? chat[0].content : "Argomento della spiegazione";
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    const interval = setInterval(() => {
      if (input) checkRispostaFox(input);
    }, 30000);
    return () => clearInterval(interval);
  }, [input, chat]);

  const checkRispostaFox = async (concetto: string) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) return;

    const res = await fetch("/api/fox/check", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ concetto }),
    });

    const data = await res.json();

    if (data?.risposta && !chat.some(msg => msg.content.includes(data.risposta))) {
      const nuovoMsg = {
        role: "assistant",
        content: `📥 Risposta da Agente Fox:\n${data.risposta}`
      };
      setChat((prev) => [...prev, nuovoMsg]);
      toast.success("📩 Hai ricevuto una risposta da Agente Fox!");

      // ✅ Salva nel DB
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        await supabase
          .from("chat_spiegazioni")
          .update({
            messaggi: [...chat, nuovoMsg],
            ultima_modifica: new Date().toISOString(),
          })
          .eq("user_id", user.id)
          .eq("titolo", concetto);
      }
    }
  };

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
    await checkRispostaFox(testo); // ✅ check se c'è risposta già salvata da Fox
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
  return text
    .replace(/\\\\\[/g, '\\[')  // \\[ → \[
    .replace(/\\\\\]/g, '\\]')  // \\] → \]
    .replace(/\\\\\(/g, '\\(')  // \\( → \(
    .replace(/\\\\\)/g, '\\)')  // \\) → \)
    .replace(/\\\[/g, '$$')     // \[ → $$
    .replace(/\\\]/g, '$$')     // \] → $$
    .replace(/\\\(/g, '$')      // \( → $
    .replace(/\\\)/g, '$');     // \) → $
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

  const inviaAgenteFox = async () => {
    if (!input.trim()) {
      toast.error("Inserisci prima una domanda o un concetto.");
      return;
    }
  
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) {
      toast.error("Non sei autenticato.");
      return;
    }
  
    const { error } = await supabase.from("agente_fox").insert({
      user_id: user.id,
      domanda: input,
      stato: "in_attesa",
      inviata_il: new Date().toISOString(),
    });
  
    if (!error) {
      toast.success("Richiesta inviata ad Agente Fox!");
      setInviatoAFox(true);
      setFade(true); // 🔥 attiva fade-in
  
      setTimeout(() => {
        setFade(false); // 🔥 fade-out dopo 7.5s
        setTimeout(() => setInviatoAFox(false), 500); // 🔥 togli completamente dopo fade-out
      }, 7500);
    } else {
      toast.error("Errore durante l'invio.");
    }
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

  const handleSubmit = () => {
    if (!input.trim()) {
      toast.error("Inserisci un concetto prima di generare la spiegazione.");
      return;
    }
    caricaChatOGenera(input);
  };
  

  if (!userChecked) return <DashboardLayout><p>Caricamento...</p></DashboardLayout>;

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold mb-4">📘 Spiegazione completa</h1>

      {/* Box Aiuto */}
<div className="bg-blue-100 dark:bg-blue-900 border-l-4 border-blue-500 dark:border-blue-400 text-blue-900 dark:text-blue-100 p-4 rounded mb-6">
  <h2 className="font-semibold text-lg mb-2">🎯 Come funziona la sezione "Spiegazione"</h2>
  <p className="text-sm mb-2">
    In questa sezione puoi ricevere spiegazioni dettagliate e personalizzate su un concetto specifico.
  </p>
  <ul className="list-disc ml-5 text-sm mb-3">
    <li>📝 Inserisci un <strong>concetto, argomento o domanda</strong> nel campo in alto.</li>
    <li>🎓 <strong>Seleziona il tuo livello scolastico</strong> (Medie, Superiori, Università) per adattare il linguaggio e la profondità della spiegazione.</li>
    <li>📘 Clicca su <em>“Genera spiegazione”</em> per ricevere una risposta completa.</li>
    <li>🗨️ Puoi fare domande di approfondimento per continuare la conversazione con l’AI.</li>
    <li>🦊 Se non sei soddisfatto o vuoi un approfondimento da un altro agente, puoi cliccare su <strong>“Chiedi supporto all’Agente Fox”</strong> (senza livello scolastico).</li>
  </ul>
  <p className="text-sm mb-2">
    Per ottenere risultati di alta qualità, ti consigliamo di essere il più preciso possibile nella formulazione della tua richiesta:
  </p>
  <ul className="list-disc ml-5 text-sm mb-3">
    <li>❌ <span className="italic">Domanda generica:</span> “Spiegami il marketing”</li>
    <li>✅ <span className="italic">Domanda mirata:</span> “Quali sono le 4P del marketing secondo Kotler?”</li>
    <li>✅ <span className="italic">Domanda tecnica:</span> “Come si calcola il VAN in un’analisi di investimento?”</li>
    <li>✅ <span className="italic">Domanda accademica:</span> “Qual è il ruolo della giurisprudenza nella dottrina penalistica?”</li>
  </ul>
  <p className="text-sm">
    Più la tua richiesta è <strong>chiara, specifica e contestualizzata</strong>, più la spiegazione sarà utile ed efficace.
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
  onClick={handleSubmit}
  disabled={!input.trim() || loading || isSubmitting}
  className={`px-4 py-2 rounded text-white ${!input.trim() || loading? 'bg-blue-300 dark:bg-blue-700 cursor-not-allowed':'bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-800'}`}>{loading ? "Caricamento..." : "Genera spiegazione"}
        </button>
        <button onClick={inviaAgenteFox} className="bg-orange-600 hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-800 text-white px-4 py-2 rounded">
          🔎 Chiedi supporto all’Agente Fox 🦊
        </button>
        {inviatoAFox && (
  <div className={`bg-yellow-50 dark:bg-yellow-900 border-l-4 border-yellow-400 dark:border-yellow-300 text-yellow-800 dark:text-yellow-100 p-4 rounded mt-4 text-sm transition-all duration-500 ease-in-out ${fade ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}>
    <strong>🦊 L’Agente Fox sta elaborando la tua richiesta.</strong><br />
    Potrai visualizzare la risposta appena disponibile nella sezione <span className="font-medium">“Le mie richieste Agente Fox”</span>.
  </div>
)}


      </div>

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
  <ReactMarkdown
    remarkPlugins={[remarkMath]}
    rehypePlugins={[rehypeKatex, rehypeHighlight]}
  >
    {normalizeLatex(msg.content)}
  </ReactMarkdown>
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

    </DashboardLayout>
  );
}


Spiegazione.requireAuth = true;
