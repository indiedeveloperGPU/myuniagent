import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";
import DashboardLayout from "@/components/DashboardLayout";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import { useMemo } from "react";
import toast, { Toaster } from 'react-hot-toast';


interface ContenutoLight {
  id: string;
  argomento: string;
  ordine?: number;
}

interface ContenutoCompleto extends ContenutoLight {
  contenuto: string;
  quiz: any[];
}

const livelli = ["A1", "A2", "B1", "B2", "C1", "C2"];

export default function TeoriaGrammaticale() {
  const router = useRouter();
  const [lingua, setLingua] = useState<string>("");
  const [livello, setLivello] = useState<string>(() => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("fox-livello") || "A1";
  }
  return "A1";
});
  const [contenuti, setContenuti] = useState<ContenutoLight[]>([]);
  const [completati, setCompletati] = useState<Set<string>>(new Set());
  const [selezionato, setSelezionato] = useState<string | null>(null);
  const [contenutoSelezionato, setContenutoSelezionato] = useState<ContenutoCompleto | null>(null);
  const [loadingModulo, setLoadingModulo] = useState<boolean>(false);
  const [risposte, setRisposte] = useState<Record<string, Record<string, string>>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [faseCaricamento, setFaseCaricamento] = useState(0);
  const [messaggi, setMessaggi] = useState<Record<string, string>>({});
  const frasiCaricamento = [
  "🧠 Analisi del tuo livello in corso…",
  "📚 Selezione dei contenuti migliori…",
  "🔍 Personalizzazione dell'esperienza…",
  "🚀 Preparazione modulo finale…",
];

  useEffect(() => {
    const fetchLinguaPreferita = async () => {
      const { data: session } = await supabase.auth.getUser();
      if (!session.user) return;
      const { data: profilo } = await supabase
        .from("profiles")
        .select("lingua_preferita")
        .eq("id", session.user.id)
        .single();
      if (profilo?.lingua_preferita) {
        setLingua(profilo.lingua_preferita);
      }
    };
    fetchLinguaPreferita();
  }, []);

useEffect(() => {
  if (livello) {
    localStorage.setItem("fox-livello", livello);
  }
}, [livello]);

useEffect(() => {
  if (!loadingModulo) {
    setFaseCaricamento(0);
    return;
  }

  const fasiTotali = 4;
  const interval = setInterval(() => {
    setFaseCaricamento((prev) => (prev + 1) % fasiTotali);
  }, 1000); // una fase al secondo

  return () => clearInterval(interval);
}, [loadingModulo]);


  useEffect(() => {
    if (!lingua) return;

    const fetchData = async () => {
      setLoading(true);
      const session = await supabase.auth.getUser();
      const user = session.data?.user;
      if (!user) return;

      const [{ data: contenutiData }, { data: completatiData }] = await Promise.all([
        supabase
          .from("teoria_contenuti")
          .select("id, argomento, ordine")
          .eq("lingua", lingua)
          .eq("livello", livello)
          .order("ordine", { ascending: true }),

        supabase
          .from("teoria_quiz_risposte")
          .select("contenuto_id")
          .eq("user_id", user.id)
          .eq("stato", "corretto")
      ]);

      if (contenutiData) setContenuti(contenutiData);
      if (completatiData) {
        const ids = completatiData.map((c) => c.contenuto_id);
        setCompletati(new Set(ids));
      }

      setLoading(false);
    };

    fetchData();
  }, [lingua, livello]);

  const selezionaModulo = async (id: string) => {
  setSelezionato(id);
  setLoadingModulo(true);
  setContenutoSelezionato(null); // reset visivo del modulo precedente

  setTimeout(async () => {
    const { data, error } = await supabase
      .from("teoria_contenuti")
      .select("id, argomento, contenuto, quiz, ordine")
      .eq("id", id)
      .single();

    if (data) setContenutoSelezionato(data);
    setLoadingModulo(false);
  }, 4000); // 4 secondi
};


  const handleRispostaChange = (contenutoId: string, domandaIdx: number, valore: string) => {
    setRisposte((prev) => ({
      ...prev,
      [contenutoId]: {
        ...prev[contenutoId],
        [domandaIdx]: valore,
      },
    }));
  };

  const moduliDaVisualizzare = useMemo(() => {
  return Object.values(
    contenuti.reduce((acc, curr) => {
      const key = curr.argomento;
      const isCompletato = completati.has(curr.id);
      if (!acc[key]) acc[key] = [];
      acc[key].push({ ...curr, completato: isCompletato });
      return acc;
    }, {} as Record<string, Array<ContenutoLight & { completato: boolean }>>)
  )
  .map((moduli) => {
    const ordinati = [...moduli].sort((a, b) => (a.ordine ?? 0) - (b.ordine ?? 0));
    return ordinati.find((m) => !m.completato);
  })
  .filter((c): c is ContenutoLight & { completato: boolean } => c !== undefined);
}, [contenuti, completati]);


  const inviaRisposte = async (contenuto: ContenutoCompleto) => {
  const { data: session } = await supabase.auth.getUser();
  if (!session.user) return;

  const risposteUtente = Object.entries(risposte[contenuto.id] || {}).map(([idx, risposta]) => {
    const quiz = contenuto.quiz[parseInt(idx)];

    const normalizza = (val: string) => val.trim().toLowerCase();
    const rispostaCorretta = Array.isArray(quiz.risposta)
      ? quiz.risposta.map(normalizza)
      : [normalizza(quiz.risposta)];
    const rispostaUtenteNorm = normalizza(risposta);

    const corretta = rispostaCorretta.includes(rispostaUtenteNorm);

    return {
      domanda: quiz.domanda,
      tipo: quiz.tipo,
      opzioni: quiz.opzioni || [],
      risposta_corretta: quiz.risposta,
      risposta_utente: risposta,
      corretta,
    };
  });

  const corrette = risposteUtente.filter((r) => r.corretta).length;
  const totale = risposteUtente.length;
  const voto = Math.floor((corrette / totale) * 10);

  const payload = {
    user_id: session.user.id,
    contenuto_id: contenuto.id,
    lingua,
    livello,
    risposte: risposteUtente,
    stato: "corretto",
    voto,
    feedback: `Agente Fox ha corretto il tuo quiz: ${corrette} risposte corrette su ${totale}.`,
    notificato: false,
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase.from("teoria_quiz_risposte").insert(payload);

  if (!error) {
    setMessaggi((prev) => ({
      ...prev,
      [contenuto.id]: `✅ Corretto automaticamente! Hai ottenuto ${voto}/10.`,
    }));
    toast.custom((t) => (
  <div
    className={`${
      t.visible ? 'animate-enter' : 'animate-leave'
    } max-w-sm w-full bg-white dark:bg-gray-900 shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5 p-4`}
  >
    <div className="flex-shrink-0 mr-3">
      <img src="/images/3d/fox-final.png" alt="Agente Fox" className="w-10 h-10 rounded-full" />
    </div>
    <div className="flex-1 w-0">
      <p className="text-sm font-semibold text-gray-900 dark:text-white">Quiz corretto da Agente Fox!</p>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
        Hai ottenuto <strong>{voto}/10</strong>. Ottimo lavoro!
      </p>
    </div>
    <div className="ml-4 flex-shrink-0 flex items-center">
      <button
        onClick={() => toast.dismiss(t.id)}
        className="text-gray-400 hover:text-gray-600 dark:hover:text-white"
      >
        ✕
      </button>
    </div>
  </div>
), { duration: 5000 });



    setCompletati((prev) => {
      const nuovi = new Set([...prev, contenuto.id]);

      // 🔁 Seleziona automaticamente il prossimo modulo dello stesso argomento
      const moduliArgomento = contenuti
        .filter((m) => m.argomento === contenuto.argomento)
        .sort((a, b) => (a.ordine ?? 0) - (b.ordine ?? 0));

      const indexCorrente = moduliArgomento.findIndex((m) => m.id === contenuto.id);
      const prossimo = moduliArgomento[indexCorrente + 1];

      if (prossimo && !nuovi.has(prossimo.id)) {
        selezionaModulo(prossimo.id);
      }

      return nuovi;
    });
  } else {
    setMessaggi((prev) => ({
      ...prev,
      [contenuto.id]: "❌ Errore durante il salvataggio. Riprova.",
    }));
  }
};



  return (
    <DashboardLayout>
      <Toaster position="top-right" reverseOrder={false} />
      <div className="flex gap-6">
        {/* Sidebar sinistra */}
        <div className="w-1/4 border-r pr-4">
          <button
            onClick={() => router.back()}
            className="mb-4 inline-flex items-center gap-2 bg-white dark:bg-gray-900 text-blue-700 dark:text-blue-200 border border-blue-300 dark:border-gray-700 rounded-full px-4 py-2 text-sm font-medium shadow-sm hover:bg-blue-50 dark:hover:bg-gray-800 transition"
          >
            🔙 Torna alla pagina Lingue
          </button>

          <h2 className="text-lg font-semibold mb-3">📘 Moduli disponibili ({livello})</h2>
          <p className="text-sm text-gray-600 mb-4">
            Completa i moduli in ordine per costruire passo dopo passo la tua grammatica.
          </p>

          <select
            value={livello}
            onChange={(e) => setLivello(e.target.value)}
            className="w-full border px-3 py-2 mb-4 rounded"
          >
            {livelli.map((lvl) => (
              <option key={lvl} value={lvl}>{lvl}</option>
            ))}
          </select>

          <ul className="space-y-2">
  {moduliDaVisualizzare.map((c) => {
    const moduliTotali = contenuti.filter(m => m.argomento === c.argomento).length;
    return (
      <li key={c.id}>
        <button
  onClick={() => !loadingModulo && selezionaModulo(c.id)}
  disabled={loadingModulo}
  className={`w-full text-left px-3 py-2 rounded-md border flex flex-col items-start ${
    selezionato === c.id
      ? 'bg-blue-100 dark:bg-blue-900 font-semibold'
      : 'bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800'
  }`}
>
  <span className="flex items-center gap-2 text-sm font-medium">
    📘 {c.argomento}
    {completati.has(c.id) && (
      <span className="text-green-600" title="Modulo completato">✔️</span>
    )}
  </span>
  <span className="text-xs text-gray-600">Modulo {c.ordine} di {moduliTotali}</span>
</button>

      </li>
    );
  })}
</ul>

        </div>

        {/* Contenuto modulo selezionato */}
        <div className="w-3/4">
          {loading && <p className="text-gray-500">Caricamento contenuti...</p>}

          {!loading && contenuti.length === 0 && (
            <p className="text-gray-500">Nessun contenuto disponibile per questo livello.</p>
          )}

          {!loading && contenuti.length > 0 && selezionato && (
            <div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-6 rounded shadow">
              {loadingModulo && (<div className="flex flex-col items-center justify-center text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded p-6 shadow-md space-y-4 animate-pulse">
    <img
      src="/images/fox-loader.gif"
      alt="Volpe che carica"
      className="w-24 h-24"
    />
    <p className="text-lg font-medium text-center">{frasiCaricamento[faseCaricamento]}</p>
    <p className="text-sm text-gray-500 dark:text-gray-400 text-center">(attendere qualche secondo…)</p>
  </div>
)}

              {!loadingModulo && contenutoSelezionato && (
                <div>
                  <h2 className="text-xl font-bold mb-3">📘 {contenutoSelezionato.argomento}</h2>

                  <div className="prose max-w-none mb-6">
                    <div className="prose markdown-table max-w-none block dark:hidden">
                      <ReactMarkdown rehypePlugins={[rehypeRaw, rehypeSanitize]} remarkPlugins={[remarkGfm]}>
                        {contenutoSelezionato.contenuto}
                      </ReactMarkdown>
                    </div>
                    <div className="prose markdown-table max-w-none hidden dark:block dark:prose-invert">
                      <ReactMarkdown rehypePlugins={[rehypeRaw, rehypeSanitize]} remarkPlugins={[remarkGfm]}>
                        {contenutoSelezionato.contenuto}
                      </ReactMarkdown>
                    </div>
                  </div>

                  {Array.isArray(contenutoSelezionato.quiz) && contenutoSelezionato.quiz.length > 0 && (
                    <div className="mt-4">
                      <h3 className="font-semibold mb-2">📝 Quiz</h3>
                      <div className="space-y-4">
                        {contenutoSelezionato.quiz.map((q: any, idx: number) => (
                          <div key={idx} className="border p-4 rounded-lg bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700 shadow-sm">
                            <p className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-2">{q.domanda}</p>
                            {q.tipo === "multipla" ? (
                              <div className="space-y-1">
                                {q.opzioni.map((opt: string, oidx: number) => (
                                  <label key={oidx}className={`block text-sm px-2 py-1 rounded cursor-pointer transition ${risposte[contenutoSelezionato.id]?.[idx] === opt? "bg-blue-100 dark:bg-blue-800 font-semibold":"hover:bg-gray-100 dark:hover:bg-gray-800"}`}>
                                    <input
                                    type="radio"
                                    name={`quiz-${contenutoSelezionato.id}-${idx}`}
                                    value={opt}
                                    checked={risposte[contenutoSelezionato.id]?.[idx] === opt}
                                    onChange={(e) => handleRispostaChange(contenutoSelezionato.id, idx, e.target.value)}className="mr-2 accent-blue-600"/>
                                    {opt}
                                  </label>
                                ))}
                              </div>
                            ) : (
                              <textarea
                                rows={2}
                                className="w-full border mt-1 p-2 rounded bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                                placeholder="Scrivi la tua risposta"
                                value={risposte[contenutoSelezionato.id]?.[idx] || ""}
                                onChange={(e) => handleRispostaChange(contenutoSelezionato.id, idx, e.target.value)}
                              />
                            )}
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={() => inviaRisposte(contenutoSelezionato)}
                        className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                      >
                        Invia risposte
                      </button>

                      {messaggi[contenutoSelezionato.id] && (
                        <p className="text-green-600 text-sm mt-2">{messaggi[contenutoSelezionato.id]}</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

TeoriaGrammaticale.requireAuth = true;
