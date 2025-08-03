import { useEffect, useState, useMemo, useCallback, memo } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";
import DashboardLayout from "@/components/DashboardLayout";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import toast, { Toaster } from 'react-hot-toast';

interface Parola {
  parola: string;
  traduzione: string;
  esempio: string;
}

interface VocabolarioLight {
  id: string;
  tema: string;
  ordine: number;
}

interface VocabolarioCompleto extends VocabolarioLight {
  introduzione?: string;
  parole: Parola[];
  quiz: any[];
}

interface VocabolarioWithCompletato extends VocabolarioLight {
  completato: boolean;
}

interface Statistiche {
  temiTotali: number;
  temiCompletati: number;
  paroleTotali: number;
  progressoPercentuale: number;
}

const livelli = ["A1", "A2", "B1", "B2", "C1", "C2"];

// 🎯 COMPONENT MEMOIZZATO PER STATISTICHE
const StatisticheCard = memo(({ 
  title, 
  value, 
  icon, 
  gradientFrom, 
  gradientTo, 
  borderColor 
}: {
  title: string;
  value: string | number;
  icon: string;
  gradientFrom: string;
  gradientTo: string;
  borderColor: string;
}) => (
  <div className={`bg-gradient-to-br ${gradientFrom} ${gradientTo} p-6 rounded-xl border ${borderColor} shadow-lg`}>
    <div className="flex items-center gap-4">
      <div className={`w-14 h-14 bg-gradient-to-br ${gradientFrom.replace('from-', 'from-').replace('-50', '-500')} ${gradientTo.replace('to-', 'to-').replace('-50', '-500')} rounded-xl flex items-center justify-center text-white text-2xl shadow-lg`}>
        {icon}
      </div>
      <div>
        <div className={`font-semibold text-sm ${borderColor.replace('border-', 'text-').replace('-200', '-800')} dark:${borderColor.replace('border-', 'text-').replace('-200', '-200')}`}>
          {title}
        </div>
        <div className={`text-3xl font-bold ${borderColor.replace('border-', 'text-').replace('-200', '-900')} dark:${borderColor.replace('border-', 'text-').replace('-200', '-100')}`}>
          {value}
        </div>
      </div>
    </div>
  </div>
));

// 🎯 COMPONENT MEMOIZZATO PER TEMA
const TemaCard = memo(({ 
  tema, 
  variantiTotali, 
  variantiCompletate, 
  isSelected, 
  isLoading, 
  onSelect 
}: {
  tema: VocabolarioWithCompletato;
  variantiTotali: number;
  variantiCompletate: number;
  isSelected: boolean;
  isLoading: boolean;
  onSelect: (id: string) => void;
}) => {
  const handleClick = useCallback(() => {
    if (!isLoading) onSelect(tema.id);
  }, [isLoading, onSelect, tema.id]);

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={`group w-full text-left p-4 rounded-xl border transition-all transform hover:scale-[1.02] hover:shadow-lg ${
        isSelected
          ? 'bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900 dark:to-pink-900 border-purple-300 dark:border-purple-600 shadow-md'
          : 'bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600'
      } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
            tema.completato 
              ? 'bg-green-500 text-white' 
              : 'bg-purple-500 text-white'
          }`}>
            {tema.completato ? '✓' : '📌'}
          </div>
          <div className="flex-1">
            <span className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
              {tema.tema}
            </span>
          </div>
        </div>
        {tema.completato && (
          <span className="text-green-600 dark:text-green-400 text-lg">✅</span>
        )}
      </div>
      
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>Modulo {tema.ordine} di {variantiTotali}</span>
        <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
          {variantiCompletate}/{variantiTotali}
        </span>
      </div>
      
      <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
        <div 
          className="bg-gradient-to-r from-purple-500 to-pink-500 h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${(variantiCompletate / variantiTotali) * 100}%` }}
        ></div>
      </div>
    </button>
  );
});

// 🎯 COMPONENT MEMOIZZATO PER PAROLA
const ParolaCard = memo(({ parola, indice }: { parola: Parola; indice: number }) => (
  <div className="group bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5 hover:shadow-lg transition-all transform hover:scale-[1.01]">
    <div className="flex items-start gap-4">
      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-sm">
        {indice + 1}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{parola.parola}</span>
          <span className="text-gray-500 dark:text-gray-400">→</span>
          <span className="text-lg font-medium text-purple-600 dark:text-purple-400">{parola.traduzione}</span>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 border-l-3 border-purple-400">
          <span className="text-sm text-gray-700 dark:text-gray-300 italic">"{parola.esempio}"</span>
        </div>
      </div>
    </div>
  </div>
));

export default function Vocabolario() {
  const router = useRouter();
  const [lingua, setLingua] = useState<string>("");
  const [livello, setLivello] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("fox-livello") || "A1";
    }
    return "A1";
  });
  
  const [vocabolario, setVocabolario] = useState<VocabolarioLight[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [completati, setCompletati] = useState<Set<string>>(new Set());
  const [selezionato, setSelezionato] = useState<string | null>(null);
  const [risposte, setRisposte] = useState<Record<string, Record<string, string>>>({});
  const [vocabolarioSelezionato, setVocabolarioSelezionato] = useState<VocabolarioCompleto | null>(null);
  const [messaggi, setMessaggi] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingModulo, setLoadingModulo] = useState<boolean>(false);
  const [faseCaricamento, setFaseCaricamento] = useState(0);
  
  const frasiCaricamento = useMemo(() => [
    "🧠 Analisi del tuo livello in corso…",
    "📚 Selezione dei contenuti migliori…",
    "🔍 Personalizzazione dell'esperienza…",
    "🚀 Preparazione modulo finale…",
  ], []);

  // 🚀 OTTIMIZZAZIONE: Callback memoizzati
  const handleRispostaChange = useCallback((itemId: string, domandaIdx: number, valore: string) => {
    setRisposte(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [domandaIdx]: valore,
      },
    }));
  }, []);

  const selezionaModulo = useCallback(async (id: string) => {
    setSelezionato(id);
    setLoadingModulo(true);
    setVocabolarioSelezionato(null);

    setTimeout(async () => {
      try {
        const { data, error } = await supabase
          .from("vocabolario")
          .select("id, tema, ordine, introduzione, parole, quiz")
          .eq("id", id)
          .single();

        if (data && !error) {
          setVocabolarioSelezionato(data);
        } else {
          console.error("Errore caricamento tema:", error);
          toast.error("Errore nel caricamento del tema");
        }
      } catch (err) {
        console.error("Errore:", err);
        toast.error("Errore di connessione");
      } finally {
        setLoadingModulo(false);
      }
    }, 2000);
  }, []);

  // 🚀 OTTIMIZZAZIONE: Statistiche memoizzate
  const statistiche = useMemo<Statistiche>(() => {
    const temiTotali = vocabolario.length;
    const temiCompletati = completati.size;
    const progressoPercentuale = temiTotali > 0 ? Math.round((temiCompletati / temiTotali) * 100) : 0;
    
    // Calcolo parole totali dai temi caricati
    const paroleTotali = vocabolarioSelezionato ? vocabolarioSelezionato.parole.length : 0;

    return {
      temiTotali,
      temiCompletati,
      paroleTotali,
      progressoPercentuale
    };
  }, [vocabolario, completati, vocabolarioSelezionato]);

  // 🚀 OTTIMIZZAZIONE: Moduli da visualizzare
  const moduliDaVisualizzare = useMemo(() => {
    const temiMap = new Map<string, VocabolarioWithCompletato[]>();
    
    vocabolario.forEach(curr => {
      const isCompletato = completati.has(curr.id);
      const tema = { ...curr, completato: isCompletato };
      
      if (!temiMap.has(curr.tema)) {
        temiMap.set(curr.tema, []);
      }
      temiMap.get(curr.tema)!.push(tema);
    });
    
    return Array.from(temiMap.values())
      .map(temi => {
        const ordinati = temi.sort((a, b) => (a.ordine ?? 0) - (b.ordine ?? 0));
        return ordinati.find(t => !t.completato);
      })
      .filter((t): t is VocabolarioWithCompletato => t !== undefined);
  }, [vocabolario, completati]);

  // 🚀 OTTIMIZZAZIONE: Stats temi calcolati una volta
  const temiStats = useMemo(() => {
    const stats = new Map<string, { totali: number; completati: number }>();
    
    vocabolario.forEach(tema => {
      if (!stats.has(tema.tema)) {
        stats.set(tema.tema, { totali: 0, completati: 0 });
      }
      const stat = stats.get(tema.tema)!;
      stat.totali++;
      if (completati.has(tema.id)) {
        stat.completati++;
      }
    });
    
    return stats;
  }, [vocabolario, completati]);

  // Effects ottimizzati
  useEffect(() => {
    const fetchLingua = async () => {
      try {
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
      } catch (error) {
        console.error("Errore caricamento lingua:", error);
      }
    };
    fetchLingua();
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

    const interval = setInterval(() => {
      setFaseCaricamento(prev => (prev + 1) % 4);
    }, 500);

    return () => clearInterval(interval);
  }, [loadingModulo]);

  useEffect(() => {
    if (!lingua) return;
    
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const session = await supabase.auth.getUser();
        const user = session.data?.user;
        if (!user) {
          setError("Utente non autenticato.");
          return;
        }

        const [vocabolarioResult, completatiResult] = await Promise.all([
          supabase
            .from("vocabolario")
            .select("id, tema, ordine")
            .eq("lingua", lingua)
            .eq("livello", livello)
            .order("ordine", { ascending: true }),

          supabase
            .from("vocabolario_risposte")
            .select("contenuto_id")
            .eq("user_id", user.id)
            .eq("stato", "corretto")
        ]);

        if (vocabolarioResult.data) {
          setVocabolario(vocabolarioResult.data);
        }
        
        if (completatiResult.data) {
          const ids = new Set(completatiResult.data.map(c => c.contenuto_id));
          setCompletati(ids);
        }

        setError(null);
      } catch (e) {
        console.error("Errore caricamento:", e);
        setError("Errore durante il caricamento. Riprova più tardi.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [lingua, livello]);

  // 🚀 OTTIMIZZAZIONE: inviaRisposte con error handling
  const inviaRisposte = useCallback(async (item: VocabolarioCompleto) => {
    try {
      const { data: session } = await supabase.auth.getUser();
      if (!session.user) throw new Error("Utente non autenticato");

      const risposteUtente = Object.entries(risposte[item.id] || {}).map(([idx, risposta]) => {
        const quiz = item.quiz[parseInt(idx)];
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

      const corrette = risposteUtente.filter(r => r.corretta).length;
      const totale = risposteUtente.length;
      const voto = Math.floor((corrette / totale) * 10);

      const { error } = await supabase.from("vocabolario_risposte").insert({
        user_id: session.user.id,
        contenuto_id: item.id,
        lingua,
        livello,
        tema: item.tema,
        risposte: risposteUtente,
        stato: "corretto",
        voto,
        feedback: `Agente Fox ha corretto il tuo quiz: ${corrette} risposte corrette su ${totale}.`,
        notificato: false,
        updated_at: new Date().toISOString()
      });

      if (error) throw error;

      setMessaggi(prev => ({
        ...prev,
        [item.id]: `✅ Corretto automaticamente! Hai ottenuto ${voto}/10.`,
      }));

      setCompletati(prev => new Set([...prev, item.id]));

      toast.custom((t) => (
        <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-sm w-full bg-white dark:bg-gray-900 shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5 p-4`}>
          <div className="flex-shrink-0 mr-3">
            <img src="/images/3d/fox-final.png" alt="Agente Fox" className="w-10 h-10 rounded-full" />
          </div>
          <div className="flex-1 w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Quiz corretto da Agente Fox!</p>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              Hai ottenuto <strong>{voto}/10</strong>. Continua così!
            </p>
          </div>
          <div className="ml-4 flex-shrink-0 flex items-center">
            <button onClick={() => toast.dismiss(t.id)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white">
              ✕
            </button>
          </div>
        </div>
      ), { duration: 5000 });

    } catch (error) {
      console.error("Errore invio risposte:", error);
      setMessaggi(prev => ({
        ...prev,
        [item.id]: "❌ Errore durante il salvataggio. Riprova.",
      }));
      toast.error("Errore nel salvataggio delle risposte");
    }
  }, [risposte, lingua, livello]);

  return (
    <DashboardLayout>
      <Toaster position="top-right" reverseOrder={false} />
      
      {/* 🎓 HEADER ENTERPRISE */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
            🦊 Agente Fox - Vocabolario Tematico
          </h1>
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white border border-transparent rounded-full px-6 py-3 text-sm font-medium shadow-lg hover:from-purple-700 hover:to-pink-700 transition-all transform hover:scale-105"
          >
            🔙 Torna alle Lingue
          </button>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-pink-100 dark:from-purple-900 dark:to-pink-800 border-l-4 border-purple-500 text-purple-900 dark:text-purple-100 p-6 rounded-xl shadow-md">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="font-bold text-xl flex items-center gap-2 mb-3">
                📚 Sistema di Apprendimento Vocabolario
              </h2>
              <p className="text-sm leading-relaxed">
                <strong>Espansione lessicale per {lingua?.toUpperCase()} - Livello {livello}</strong> • Agente Fox ti guida attraverso temi organizzati per difficoltà crescente
                <br />
                <strong>Parole contestualizzate</strong> • <strong>Quiz interattivi</strong> • <strong>Memorizzazione progressiva</strong>
              </p>
            </div>
            <div className="hidden md:block">
              <img src="/images/3d/fox-final.png" alt="Agente Fox" className="w-16 h-16 rounded-full border-2 border-purple-300" />
            </div>
          </div>
        </div>
      </div>

      {/* 📊 STATISTICHE DASHBOARD */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatisticheCard
          title="Temi Totali"
          value={statistiche.temiTotali}
          icon="📚"
          gradientFrom="from-purple-50"
          gradientTo="to-pink-50 dark:from-purple-900 dark:to-pink-900"
          borderColor="border-purple-200 dark:border-purple-700"
        />
        <StatisticheCard
          title="Completati"
          value={statistiche.temiCompletati}
          icon="✅"
          gradientFrom="from-green-50"
          gradientTo="to-emerald-50 dark:from-green-900 dark:to-emerald-900"
          borderColor="border-green-200 dark:border-green-700"
        />
        <StatisticheCard
          title="Progresso"
          value={`${statistiche.progressoPercentuale}%`}
          icon="📈"
          gradientFrom="from-blue-50"
          gradientTo="to-cyan-50 dark:from-blue-900 dark:to-cyan-900"
          borderColor="border-blue-200 dark:border-blue-700"
        />
        <StatisticheCard
          title="Parole Studio"
          value={statistiche.paroleTotali}
          icon="🔤"
          gradientFrom="from-orange-50"
          gradientTo="to-yellow-50 dark:from-orange-900 dark:to-yellow-900"
          borderColor="border-orange-200 dark:border-orange-700"
        />
      </div>

      {/* 🎯 CONTENUTO PRINCIPALE */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* 🎮 SIDEBAR TEMI ENTERPRISE */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden sticky top-6">
            
            {/* Header Sidebar */}
            <div className="p-6 bg-gradient-to-r from-gray-50 to-purple-50 dark:from-gray-800 dark:to-purple-900 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-3">
                📌 Temi {livello}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Esplora il vocabolario organizzato per argomenti
              </p>
              
              {/* Selettore Livello */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  🎚️ Cambia Livello
                </label>
                <select
                  value={livello}
                  onChange={(e) => setLivello(e.target.value)}
                  className="w-full p-3 border rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-purple-500 transition-all"
                >
                  {livelli.map((lvl) => (
                    <option key={lvl} value={lvl}>{lvl}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Lista Temi */}
            <div className="p-6">
              {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-700 rounded-lg">
                  <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
                </div>
              )}
              
              {loading ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-4 border-purple-500 border-t-transparent mb-3"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Caricamento temi...</span>
                </div>
              ) : vocabolario.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-3">📚</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Nessun tema disponibile per questo livello
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {moduliDaVisualizzare.map((tema) => {
                    const stats = temiStats.get(tema.tema) || { totali: 0, completati: 0 };
                    
                    return (
                      <TemaCard
                        key={tema.id}
                        tema={tema}
                        variantiTotali={stats.totali}
                        variantiCompletate={stats.completati}
                        isSelected={selezionato === tema.id}
                        isLoading={loadingModulo}
                        onSelect={selezionaModulo}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 📖 CONTENUTO TEMA ENTERPRISE */}
        <div className="lg:col-span-3">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden">
            
            {!loading && vocabolario.length === 0 && !error && (
              <div className="p-8">
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📚</div>
                  <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Nessun contenuto disponibile
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Non ci sono temi disponibili per questo livello al momento.
                  </p>
                </div>
              </div>
            )}

            {!loading && vocabolario.length > 0 && !selezionato && (
              <div className="p-8">
                <div className="text-center py-12">
                  <img src="/images/3d/fox-final.png" alt="Agente Fox" className="w-24 h-24 mx-auto mb-4 rounded-full border-4 border-purple-300" />
                  <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Seleziona un tema per iniziare
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Agente Fox ti guiderà nell'apprendimento del vocabolario tematico
                  </p>
                </div>
              </div>
            )}

            {!loading && vocabolario.length > 0 && selezionato && (
              <div>
                {loadingModulo ? (
                  <div className="p-8">
                    <div className="flex flex-col items-center justify-center text-purple-700 dark:text-purple-300 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900 dark:to-pink-900 border border-purple-200 dark:border-purple-700 rounded-xl p-8 shadow-lg space-y-6">
                      <img
                        src="/images/fox-loader.gif"
                        alt="Volpe che carica"
                        className="w-32 h-32 rounded-full border-4 border-purple-300 shadow-lg"
                      />
                      <div className="text-center">
                        <p className="text-xl font-bold mb-2">{frasiCaricamento[faseCaricamento]}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Agente Fox sta preparando il vocabolario perfetto per te...</p>
                      </div>
                      <div className="w-64 bg-purple-200 dark:bg-purple-800 rounded-full h-2">
                        <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full animate-pulse" style={{ width: `${((faseCaricamento + 1) / 4) * 100}%` }}></div>
                      </div>
                    </div>
                  </div>
                ) : vocabolarioSelezionato && (
                  <div>
                    {/* Header Tema */}
                    <div className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900 dark:to-pink-900 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3 mb-2">
                            📌 {vocabolarioSelezionato.tema}
                          </h2>
                          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                            <span className="bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-3 py-1 rounded-full">
                              Livello {livello}
                            </span>
                            <span className="bg-pink-100 dark:bg-pink-900 text-pink-800 dark:text-pink-200 px-3 py-1 rounded-full">
                              Modulo {vocabolarioSelezionato.ordine}
                            </span>
                            <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full">
                              {vocabolarioSelezionato.parole.length} parole
                            </span>
                            {completati.has(vocabolarioSelezionato.id) && (
                              <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-3 py-1 rounded-full flex items-center gap-1">
                                ✅ Completato
                              </span>
                            )}
                          </div>
                        </div>
                        <img src="/images/3d/fox-final.png" alt="Agente Fox" className="w-16 h-16 rounded-full border-2 border-purple-300" />
                      </div>
                    </div>

                    {/* Contenuto Tema */}
                    <div className="p-8">
                      
                      {/* Introduzione */}
                      {vocabolarioSelezionato.introduzione && (
                        <div className="mb-8 bg-gradient-to-br from-gray-50 to-purple-50 dark:from-gray-800 dark:to-purple-900 p-6 rounded-xl border border-purple-200 dark:border-purple-700 shadow-sm">
                          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                            💡 Introduzione al Tema
                          </h3>
                          <div className="prose prose-sm max-w-none dark:prose-invert">
                            <ReactMarkdown
                              rehypePlugins={[rehypeRaw, rehypeSanitize]}
                              remarkPlugins={[remarkGfm]}
                            >
                              {vocabolarioSelezionato.introduzione}
                            </ReactMarkdown>
                          </div>
                        </div>
                      )}

                      {/* Sezione Vocabolario */}
                      <div className="mb-8">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white text-xl shadow-lg">
                            📖
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Vocabolario del Tema</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Studia le parole con esempi contestualizzati</p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {vocabolarioSelezionato.parole.map((parola, idx) => (
                            <ParolaCard key={idx} parola={parola} indice={idx} />
                          ))}
                        </div>
                      </div>

                      {/* Quiz Section */}
                      {Array.isArray(vocabolarioSelezionato.quiz) && vocabolarioSelezionato.quiz.length > 0 && (
                        <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900 dark:to-purple-900 border border-blue-200 dark:border-blue-700 rounded-xl p-6 shadow-lg">
                          <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center text-white text-xl shadow-lg">
                              📝
                            </div>
                            <div>
                              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Quiz di Verifica</h3>
                              <p className="text-sm text-gray-600 dark:text-gray-400">Testa la tua conoscenza del vocabolario appreso</p>
                            </div>
                          </div>
                          
                          <div className="space-y-6">
                            {vocabolarioSelezionato.quiz.map((q: any, idx: number) => (
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
                                            risposte[vocabolarioSelezionato.id]?.[idx] === opt
                                              ? "bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900 dark:to-blue-900 border-purple-300 dark:border-purple-600 shadow-md"
                                              : "bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                                          }`}
                                        >
                                          <input
                                            type="radio"
                                            name={`quiz-${vocabolarioSelezionato.id}-${idx}`}
                                            value={opt}
                                            checked={risposte[vocabolarioSelezionato.id]?.[idx] === opt}
                                            onChange={(e) => handleRispostaChange(vocabolarioSelezionato.id, idx, e.target.value)}
                                            className="w-5 h-5 text-purple-600 border-gray-300 focus:ring-purple-500 focus:ring-2"
                                          />
                                          <span className={`flex-1 text-sm font-medium ${
                                            risposte[vocabolarioSelezionato.id]?.[idx] === opt
                                              ? "text-purple-900 dark:text-purple-100"
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
                                        className="w-full p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all resize-none"
                                        placeholder="Scrivi qui la tua risposta..."
                                        value={risposte[vocabolarioSelezionato.id]?.[idx] || ""}
                                        onChange={(e) => handleRispostaChange(vocabolarioSelezionato.id, idx, e.target.value)}
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
                              💡 Agente Fox verificherà la tua comprensione del vocabolario
                            </div>
                            <button
                              onClick={() => inviaRisposte(vocabolarioSelezionato)}
                              className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-3 rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all transform hover:scale-105 font-semibold shadow-lg flex items-center gap-2"
                            >
                              🚀 Invia per Correzione
                            </button>
                          </div>

                          {/* Feedback Message */}
                          {messaggi[vocabolarioSelezionato.id] && (
                            <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900 dark:to-blue-900 border border-green-200 dark:border-green-700 rounded-xl">
                              <div className="flex items-center gap-3">
                                <img src="/images/3d/fox-final.png" alt="Agente Fox" className="w-10 h-10 rounded-full border-2 border-green-300" />
                                <div>
                                  <p className="font-semibold text-green-800 dark:text-green-200">Feedback di Agente Fox</p>
                                  <p className="text-sm text-green-700 dark:text-green-300">{messaggi[vocabolarioSelezionato.id]}</p>
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
      {!loading && vocabolario.length > 0 && (
        <div className="mt-8 bg-gradient-to-r from-gray-50 to-purple-50 dark:from-gray-900 dark:to-purple-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                📈 Progresso Vocabolario - Livello {livello}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {statistiche.temiCompletati} di {statistiche.temiTotali} temi completati
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                {statistiche.progressoPercentuale}%
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                completamento
              </div>
            </div>
          </div>
          
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 shadow-inner">
            <div 
              className="bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 h-4 rounded-full transition-all duration-1000 ease-out shadow-lg"
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

      {/* 🏆 SEZIONE ACHIEVEMENTS (se ci sono temi completati) */}
      {statistiche.temiCompletati > 0 && (
        <div className="mt-8 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900 dark:to-orange-900 border border-yellow-200 dark:border-yellow-700 rounded-xl p-6 shadow-lg">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center text-white text-2xl shadow-lg">
              🏆
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                Traguardi Vocabolario
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                I tuoi successi nell'espansione lessicale
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {statistiche.temiCompletati >= 1 && (
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-yellow-200 dark:border-yellow-700 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">🎯</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">Primo Tema</span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Hai completato il tuo primo tema!</p>
              </div>
            )}
            
            {statistiche.progressoPercentuale >= 50 && (
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-yellow-200 dark:border-yellow-700 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">🚀</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">Esperto Lessicale</span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Hai raggiunto il 50% del vocabolario!</p>
              </div>
            )}
            
            {statistiche.paroleTotali >= 20 && (
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-yellow-200 dark:border-yellow-700 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">📚</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">Collezionista Parole</span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Hai studiato oltre 20 parole!</p>
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

Vocabolario.requireAuth = true;