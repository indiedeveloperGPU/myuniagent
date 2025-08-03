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
    }, 1000);

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
    setContenutoSelezionato(null);

    setTimeout(async () => {
      const { data, error } = await supabase
        .from("teoria_contenuti")
        .select("id, argomento, contenuto, quiz, ordine")
        .eq("id", id)
        .single();

      if (data) setContenutoSelezionato(data);
      setLoadingModulo(false);
    }, 4000);
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
        <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-sm w-full bg-white dark:bg-gray-900 shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5 p-4`}>
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
            <button onClick={() => toast.dismiss(t.id)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white">
              ✕
            </button>
          </div>
        </div>
      ), { duration: 5000 });

      setCompletati((prev) => {
        const nuovi = new Set([...prev, contenuto.id]);

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

  // Calcolo statistiche
  const statistiche = useMemo(() => {
    const totaleModuli = contenuti.length;
    const moduliCompletati = completati.size;
    const progressoPercentuale = totaleModuli > 0 ? Math.round((moduliCompletati / totaleModuli) * 100) : 0;
    
    const argomentiUnici = [...new Set(contenuti.map(c => c.argomento))];
    const argomentiCompletati = argomentiUnici.filter(argomento => {
      const moduliArgomento = contenuti.filter(c => c.argomento === argomento);
      return moduliArgomento.every(modulo => completati.has(modulo.id));
    }).length;

    return {
      totaleModuli,
      moduliCompletati,
      progressoPercentuale,
      argomentiTotali: argomentiUnici.length,
      argomentiCompletati
    };
  }, [contenuti, completati]);

  return (
    <DashboardLayout>
      <Toaster position="top-right" reverseOrder={false} />
      
      {/* 🎓 HEADER ENTERPRISE */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
            🦊 Agente Fox - Teoria Grammaticale
          </h1>
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white border border-transparent rounded-full px-6 py-3 text-sm font-medium shadow-lg hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105"
          >
            🔙 Torna alle Lingue
          </button>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-red-100 dark:from-orange-900 dark:to-red-800 border-l-4 border-orange-500 text-orange-900 dark:text-orange-100 p-6 rounded-xl shadow-md">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="font-bold text-xl flex items-center gap-2 mb-3">
                🎯 Sistema di Apprendimento Adattivo
              </h2>
              <p className="text-sm leading-relaxed">
                <strong>Percorso personalizzato per {lingua?.toUpperCase()} - Livello {livello}</strong> • Agente Fox ti guida attraverso moduli progressivi di grammatica
                <br />
                <strong>Correzione automatica</strong> • <strong>Avanzamento intelligente</strong> • <strong>Feedback istantaneo</strong>
              </p>
            </div>
            <div className="hidden md:block">
              <img src="/images/3d/fox-final.png" alt="Agente Fox" className="w-16 h-16 rounded-full border-2 border-orange-300" />
            </div>
          </div>
        </div>
      </div>

      {/* 📊 STATISTICHE DASHBOARD */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900 dark:to-cyan-900 p-6 rounded-xl border border-blue-200 dark:border-blue-700 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center text-white text-2xl shadow-lg">
              📚
            </div>
            <div>
              <div className="font-semibold text-blue-800 dark:text-blue-200 text-sm">Moduli Totali</div>
              <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">{statistiche.totaleModuli}</div>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900 dark:to-emerald-900 p-6 rounded-xl border border-green-200 dark:border-green-700 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center text-white text-2xl shadow-lg">
              ✅
            </div>
            <div>
              <div className="font-semibold text-green-800 dark:text-green-200 text-sm">Completati</div>
              <div className="text-3xl font-bold text-green-900 dark:text-green-100">{statistiche.moduliCompletati}</div>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900 dark:to-pink-900 p-6 rounded-xl border border-purple-200 dark:border-purple-700 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white text-2xl shadow-lg">
              📈
            </div>
            <div>
              <div className="font-semibold text-purple-800 dark:text-purple-200 text-sm">Progresso</div>
              <div className="text-3xl font-bold text-purple-900 dark:text-purple-100">{statistiche.progressoPercentuale}%</div>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-900 dark:to-yellow-900 p-6 rounded-xl border border-orange-200 dark:border-orange-700 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-xl flex items-center justify-center text-white text-2xl shadow-lg">
              🎯
            </div>
            <div>
              <div className="font-semibold text-orange-800 dark:text-orange-200 text-sm">Argomenti</div>
              <div className="text-3xl font-bold text-orange-900 dark:text-orange-100">{statistiche.argomentiCompletati}/{statistiche.argomentiTotali}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 🎯 CONTENUTO PRINCIPALE */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* 🎮 SIDEBAR MODULI ENTERPRISE */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden sticky top-6">
            
            {/* Header Sidebar */}
            <div className="p-6 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-3">
                📘 Percorso {livello}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Completa i moduli in sequenza per un apprendimento ottimale
              </p>
              
              {/* Selettore Livello */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  🎚️ Cambia Livello
                </label>
                <select
                  value={livello}
                  onChange={(e) => setLivello(e.target.value)}
                  className="w-full p-3 border rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 transition-all"
                >
                  {livelli.map((lvl) => (
                    <option key={lvl} value={lvl}>{lvl}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Lista Moduli */}
            <div className="p-6">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent mb-3"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Caricamento moduli...</span>
                </div>
              ) : contenuti.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-3">📚</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Nessun modulo disponibile per questo livello
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {moduliDaVisualizzare.map((c) => {
                    const moduliTotali = contenuti.filter(m => m.argomento === c.argomento).length;
                    const moduliCompletatiArgomento = contenuti.filter(m => 
                      m.argomento === c.argomento && completati.has(m.id)
                    ).length;
                    
                    return (
                      <button
                        key={c.id}
                        onClick={() => !loadingModulo && selezionaModulo(c.id)}
                        disabled={loadingModulo}
                        className={`group w-full text-left p-4 rounded-xl border transition-all transform hover:scale-[1.02] hover:shadow-lg ${
                          selezionato === c.id
                            ? 'bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900 dark:to-purple-900 border-blue-300 dark:border-blue-600 shadow-md'
                            : 'bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
                        } ${loadingModulo ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                              completati.has(c.id) 
                                ? 'bg-green-500 text-white' 
                                : 'bg-blue-500 text-white'
                            }`}>
                              {completati.has(c.id) ? '✓' : '📘'}
                            </div>
                            <div className="flex-1">
                              <span className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                {c.argomento}
                              </span>
                            </div>
                          </div>
                          {completati.has(c.id) && (
                            <span className="text-green-600 dark:text-green-400 text-lg">✅</span>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                          <span>Modulo {c.ordine} di {moduliTotali}</span>
                          <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                            {moduliCompletatiArgomento}/{moduliTotali}
                          </span>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                          <div 
                            className="bg-gradient-to-r from-blue-500 to-purple-500 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${(moduliCompletatiArgomento / moduliTotali) * 100}%` }}
                          ></div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 📖 CONTENUTO MODULO ENTERPRISE */}
        <div className="lg:col-span-3">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden">
            
            {loading && (
              <div className="p-8">
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mb-4"></div>
                  <span className="text-lg font-medium text-gray-600 dark:text-gray-400">🔄 Caricamento contenuti...</span>
                </div>
              </div>
            )}

            {!loading && contenuti.length === 0 && (
              <div className="p-8">
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📚</div>
                  <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Nessun contenuto disponibile
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Non ci sono moduli disponibili per questo livello al momento.
                  </p>
                </div>
              </div>
            )}

            {!loading && contenuti.length > 0 && !selezionato && (
              <div className="p-8">
                <div className="text-center py-12">
                  <img src="/images/3d/fox-final.png" alt="Agente Fox" className="w-24 h-24 mx-auto mb-4 rounded-full border-4 border-orange-300" />
                  <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Seleziona un modulo per iniziare
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Agente Fox ti guiderà attraverso il percorso di apprendimento personalizzato
                  </p>
                </div>
              </div>
            )}

            {!loading && contenuti.length > 0 && selezionato && (
              <div>
                {loadingModulo ? (
                  <div className="p-8">
                    <div className="flex flex-col items-center justify-center text-orange-700 dark:text-orange-300 bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-900 dark:to-yellow-900 border border-orange-200 dark:border-orange-700 rounded-xl p-8 shadow-lg space-y-6">
                      <img
                        src="/images/fox-loader.gif"
                        alt="Volpe che carica"
                        className="w-32 h-32 rounded-full border-4 border-orange-300 shadow-lg"
                      />
                      <div className="text-center">
                        <p className="text-xl font-bold mb-2">{frasiCaricamento[faseCaricamento]}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Agente Fox sta preparando il contenuto perfetto per te...</p>
                      </div>
                      <div className="w-64 bg-orange-200 dark:bg-orange-800 rounded-full h-2">
                        <div className="bg-gradient-to-r from-orange-500 to-yellow-500 h-2 rounded-full animate-pulse" style={{ width: `${((faseCaricamento + 1) / 4) * 100}%` }}></div>
                      </div>
                    </div>
                  </div>
                ) : contenutoSelezionato && (
                  <div>
                    {/* Header Modulo */}
                    <div className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900 dark:to-purple-900 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3 mb-2">
                            📘 {contenutoSelezionato.argomento}
                          </h2>
                          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                            <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full">
                              Livello {livello}
                            </span>
                            <span className="bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-3 py-1 rounded-full">
                              Modulo {contenutoSelezionato.ordine}
                            </span>
                            {completati.has(contenutoSelezionato.id) && (
                              <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-3 py-1 rounded-full flex items-center gap-1">
                                ✅ Completato
                              </span>
                            )}
                          </div>
                        </div>
                        <img src="/images/3d/fox-final.png" alt="Agente Fox" className="w-16 h-16 rounded-full border-2 border-blue-300" />
                      </div>
                    </div>

                    {/* Contenuto Teoria */}
                    <div className="p-8">
                      <div className="prose prose-lg max-w-none mb-8">
                        <div className="prose markdown-table max-w-none block dark:hidden bg-gradient-to-br from-gray-50 to-white p-6 rounded-xl border border-gray-200 shadow-sm">
                          <ReactMarkdown rehypePlugins={[rehypeRaw, rehypeSanitize]} remarkPlugins={[remarkGfm]}>
                            {contenutoSelezionato.contenuto}
                          </ReactMarkdown>
                        </div>
                        <div className="prose markdown-table max-w-none hidden dark:block dark:prose-invert bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-xl border border-gray-700 shadow-sm">
                          <ReactMarkdown rehypePlugins={[rehypeRaw, rehypeSanitize]} remarkPlugins={[remarkGfm]}>
                            {contenutoSelezionato.contenuto}
                          </ReactMarkdown>
                        </div>
                      </div>

                      {/* Quiz Section */}
                      {Array.isArray(contenutoSelezionato.quiz) && contenutoSelezionato.quiz.length > 0 && (
                        <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900 dark:to-blue-900 border border-purple-200 dark:border-purple-700 rounded-xl p-6 shadow-lg">
                          <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center text-white text-xl shadow-lg">
                              📝
                            </div>
                            <div>
                              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Quiz di Verifica</h3>
                              <p className="text-sm text-gray-600 dark:text-gray-400">Dimostra la tua comprensione del modulo</p>
                            </div>
                          </div>
                          
                          <div className="space-y-6">
                            {contenutoSelezionato.quiz.map((q: any, idx: number) => (
                              <div key={idx} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6 rounded-xl shadow-sm hover:shadow-md transition-all">
                                <div className="flex items-start gap-3 mb-4">
                                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-white text-sm font-bold shadow-sm">
                                    {idx + 1}
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-lg font-semibold text-gray-800 dark:text-gray-100 leading-relaxed">
                                      {q.domanda}
                                    </p>
                                  </div>
                                </div>
                                
                                <div className="ml-11">
                                  {q.tipo === "multipla" ? (
                                    <div className="space-y-3">
                                      {q.opzioni.map((opt: string, oidx: number) => (
                                        <label 
                                          key={oidx}
                                          className={`group flex items-center gap-3 p-4 rounded-lg cursor-pointer transition-all border ${
                                            risposte[contenutoSelezionato.id]?.[idx] === opt
                                              ? "bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900 dark:to-purple-900 border-blue-300 dark:border-blue-600 shadow-md"
                                              : "bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                                          }`}
                                        >
                                          <input
                                            type="radio"
                                            name={`quiz-${contenutoSelezionato.id}-${idx}`}
                                            value={opt}
                                            checked={risposte[contenutoSelezionato.id]?.[idx] === opt}
                                            onChange={(e) => handleRispostaChange(contenutoSelezionato.id, idx, e.target.value)}
                                            className="w-5 h-5 text-blue-600 border-gray-300 focus:ring-blue-500 focus:ring-2"
                                          />
                                          <span className={`flex-1 text-sm font-medium ${
                                            risposte[contenutoSelezionato.id]?.[idx] === opt
                                              ? "text-blue-900 dark:text-blue-100"
                                              : "text-gray-700 dark:text-gray-300"
                                          }`}>
                                            {opt}
                                          </span>
                                        </label>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="space-y-2">
                                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        La tua risposta:
                                      </label>
                                      <textarea
                                        rows={3}
                                        className="w-full p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
                                        placeholder="Scrivi qui la tua risposta..."
                                        value={risposte[contenutoSelezionato.id]?.[idx] || ""}
                                        onChange={(e) => handleRispostaChange(contenutoSelezionato.id, idx, e.target.value)}
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Submit Button */}
                          <div className="mt-8 flex items-center justify-between">
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              💡 Agente Fox correggerà automaticamente le tue risposte
                            </div>
                            <button
                              onClick={() => inviaRisposte(contenutoSelezionato)}
                              className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-3 rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all transform hover:scale-105 font-semibold shadow-lg flex items-center gap-2"
                            >
                              🚀 Invia per Correzione
                            </button>
                          </div>

                          {/* Feedback Message */}
                          {messaggi[contenutoSelezionato.id] && (
                            <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900 dark:to-blue-900 border border-green-200 dark:border-green-700 rounded-xl">
                              <div className="flex items-center gap-3">
                                <img src="/images/3d/fox-final.png" alt="Agente Fox" className="w-10 h-10 rounded-full border-2 border-green-300" />
                                <div>
                                  <p className="font-semibold text-green-800 dark:text-green-200">Feedback di Agente Fox</p>
                                  <p className="text-sm text-green-700 dark:text-green-300">{messaggi[contenutoSelezionato.id]}</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 🎯 BARRA PROGRESSO GLOBALE */}
      {!loading && contenuti.length > 0 && (
        <div className="mt-8 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                📈 Progresso Generale - Livello {livello}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {statistiche.moduliCompletati} di {statistiche.totaleModuli} moduli completati
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {statistiche.progressoPercentuale}%
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                completamento
              </div>
            </div>
          </div>
          
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 shadow-inner">
            <div 
              className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 h-4 rounded-full transition-all duration-1000 ease-out shadow-lg"
              style={{ width: `${statistiche.progressoPercentuale}%` }}
            >
              <div className="h-full w-full bg-white bg-opacity-20 rounded-full animate-pulse"></div>
            </div>
          </div>
          
          <div className="flex justify-between items-center mt-3">
            <span className="text-xs text-gray-500 dark:text-gray-400">Inizio</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">Obiettivo: 100%</span>
          </div>
        </div>
      )}

      {/* 🏆 SEZIONE ACHIEVEMENTS (se ci sono moduli completati) */}
      {statistiche.moduliCompletati > 0 && (
        <div className="mt-8 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900 dark:to-orange-900 border border-yellow-200 dark:border-yellow-700 rounded-xl p-6 shadow-lg">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center text-white text-2xl shadow-lg">
              🏆
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                Traguardi Raggiunti
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                I tuoi successi nel percorso di apprendimento
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {statistiche.moduliCompletati >= 1 && (
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-yellow-200 dark:border-yellow-700 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">🎯</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">Primo Modulo</span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Hai completato il tuo primo modulo!</p>
              </div>
            )}
            
            {statistiche.progressoPercentuale >= 50 && (
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-yellow-200 dark:border-yellow-700 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">🚀</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">A Metà Strada</span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Hai raggiunto il 50% del percorso!</p>
              </div>
            )}
            
            {statistiche.argomentiCompletati > 0 && (
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-yellow-200 dark:border-yellow-700 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">📚</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">Esperto Argomento</span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Hai masterizzato {statistiche.argomentiCompletati} argomento/i!</p>
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

TeoriaGrammaticale.requireAuth = true;