// IMPORT PRINCIPALI
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";

// COMPONENTE
export default function Spiegazione() {
  const [input, setInput] = useState("");
  const [risposta, setRisposta] = useState("");
  const [loading, setLoading] = useState(false);
  const [userChecked, setUserChecked] = useState(false);
  const [chat, setChat] = useState<{ role: string; content: string }[]>([]);
  const [followUp, setFollowUp] = useState("");
  const [inviatoAFox, setInviatoAFox] = useState(false);
  const [fade, setFade] = useState(false); // 🔥 aggiunto per il fade
  const [livello, setLivello] = useState("superiori"); // valore di default
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
      .single();

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

  const generaSpiegazione = async (testo: string) => {
    if (!testo) return;
    setLoading(true);
    const res = await fetch("/api/spiegazione", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    concetto: testo,
    livelloStudente: livello, // ✅ CORRETTO
  }),
  credentials: "include",
});



    const data = await res.json();
    setRisposta(data.spiegazione);
    setChat([{ role: "assistant", content: data.spiegazione }]);
    setLoading(false);
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
    if (!followUp.trim()) return;
    const newChat = [...chat, { role: "user", content: followUp }];
    setChat(newChat);
    setFollowUp(""); setFollowUpLoading(true);

    const res = await fetch("/api/spiegazione", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    concetto: input,
    followUp: newChat,
     livelloStudente: livello, // 👈 aggiunto il livello
  }),
  credentials: "include",
});


    const data = await res.json();
    setChat([...newChat, { role: "assistant", content: data.spiegazione }]);
    setFollowUpLoading(false);
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
  disabled={!input.trim() || loading}
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
        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded shadow whitespace-pre-wrap">
          <h2 className="font-semibold mb-2">📄 Conversazione:</h2>
          <div className="flex flex-col gap-3 mb-4 max-h-[400px] overflow-y-auto">
            {chat.map((msg, i) => (
              <div
              key={i}
              className={`p-2 rounded ${
                msg.role === "user"
                  ? "bg-white dark:bg-gray-700 text-right"
                  : "bg-blue-50 dark:bg-gray-600 text-left"
              }`}
            >
                <p><strong>{msg.role === "user" ? "Tu" : "MyUniAgent"}:</strong> {msg.content}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <input type="text" className="flex-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded p-2"
              placeholder="Fai una domanda di approfondimento..."
              value={followUp}
              onChange={(e) => setFollowUp(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && inviaFollowUp()}
            />
            <button onClick={inviaFollowUp} className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 text-white px-4 py-2 rounded">
              {followUpLoading ? "Attendi..." : "Invia"}
            </button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}


Spiegazione.requireAuth = true;





