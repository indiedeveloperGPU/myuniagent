import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import DashboardLayout from "@/components/DashboardLayout";
import Link from "next/link";
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { toast } from "react-hot-toast";
import { useRouter } from 'next/router';
import 'katex/dist/katex.min.css';

// 🎯 ENTERPRISE TYPESCRIPT INTERFACES
interface Simulazione {
  id: string;
  categoria: string;
  indirizzo?: string;
  facolta?: string;
  corso?: string;
  materia: string;
  argomento: string;
  tipo: 'multiple' | 'aperte' | 'misto';
  versione: string;
  contenuto_simulazione: Array<{
    domanda: string;
    opzioni?: string[];
    risposta_corretta?: string;
  }>;
  soluzione_esempio: Array<string | { soluzione: string }>;
  testo_base?: string;
  difficolta?: 'facile' | 'medio' | 'difficile';
  durata_stimata?: number;
  created_at: string;
}

type ViewMode = 'setup' | 'simulazione' | 'risultati';

export default function SimulazioniScrittePage() {
  // 🎯 STATE MANAGEMENT ENTERPRISE
  const [categoria, setCategoria] = useState<string>("superiori");
  const [indirizzo, setIndirizzo] = useState<string>("");
  const [facolta, setFacolta] = useState<string>("");
  const [materia, setMateria] = useState<string>("");
  const [argomento, setArgomento] = useState<string>("");
  const [tipoSimulazione, setTipoSimulazione] = useState<string>("");
  const [corso, setCorso] = useState<string>("");
  
  // 📊 DATI E OPZIONI
  const [materieDisponibili, setMaterieDisponibili] = useState<string[]>([]);
  const [argomentiDisponibili, setArgomentiDisponibili] = useState<string[]>([]);
  const [tipologieDisponibili, setTipologieDisponibili] = useState<string[]>([]);
  const [simulazione, setSimulazione] = useState<Simulazione | null>(null);
  
  // 📝 RISPOSTE E CORREZIONE
  const [risposteMultiple, setRisposteMultiple] = useState<Record<number, string>>({});
  const [risposteAperte, setRisposteAperte] = useState<Record<number, string>>({});
  const [correzione, setCorrezione] = useState<Array<string | { soluzione: string }>>([]);
  const [soluzioniVisibili, setSoluzioniVisibili] = useState<Record<number, boolean>>({});
  const [erroriDomande, setErroriDomande] = useState<number[]>([]);
  
  // 🎯 VOTI E VALUTAZIONE
  const [voto, setVoto] = useState<number>(0);
  const [lode, setLode] = useState<boolean>(false);
  
  // 🎨 UI STATE
  const [viewMode, setViewMode] = useState<ViewMode>('setup');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [userChecked, setUserChecked] = useState<boolean>(false);
  const [simulazioneStartTime, setSimulazioneStartTime] = useState<Date | null>(null);
  const [timeElapsed, setTimeElapsed] = useState<number>(0);
  
  const router = useRouter();

  // 🔄 AUTH CHECK
  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.push("/auth");
        return;
      }
      setUser(data.user);
      setUserChecked(true);
    };
    checkUser();
  }, [router]);

  // 🔄 TIMER SIMULAZIONE
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (simulazioneStartTime && viewMode === 'simulazione') {
      interval = setInterval(() => {
        setTimeElapsed(Math.floor((Date.now() - simulazioneStartTime.getTime()) / 1000));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [simulazioneStartTime, viewMode]);

  // 🎯 HELPER FUNCTIONS
  const getTabellaSimulazioni = () => {
    return categoria === "superiori"
      ? "simulazioni_scritti_superiori"
      : "simulazioni_scritti_universita";
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'facile': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'medio': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'difficile': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getDifficultyEmoji = (difficulty?: string) => {
    switch (difficulty) {
      case 'facile': return '🟢';
      case 'medio': return '🟡';
      case 'difficile': return '🔴';
      default: return '⚪';
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-blue-500';
    if (percentage >= 40) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  // 🔄 CARICA MATERIE
  useEffect(() => {
    const fetchMaterie = async () => {
      if (!userChecked) return;
      
      const filtro = categoria === "superiori"
        ? { categoria, indirizzo }
        : { facolta };

      if ((categoria === "superiori" && indirizzo) || (categoria === "università" && facolta)) {
        setLoading(true);
        try {
          const { data, error } = await supabase
            .from(getTabellaSimulazioni())
            .select("materia")
            .match(filtro)
            .neq("materia", null);

          if (!error && data) {
            const uniche = [...new Set(data.map((d) => d.materia))];
            setMaterieDisponibili(uniche);
          }
        } catch (error) {
          console.error('Errore caricamento materie:', error);
          toast.error("❌ Errore nel caricamento delle materie");
        } finally {
          setLoading(false);
        }
      } else {
        setMaterieDisponibili([]);
      }
      setMateria("");
      setArgomento("");
      setArgomentiDisponibili([]);
    };
    fetchMaterie();
  }, [categoria, indirizzo, facolta, userChecked]);

  // 🔄 CARICA ARGOMENTI
  useEffect(() => {
    const fetchArgomenti = async () => {
      if (materia && userChecked) {
        setLoading(true);
        try {
          const { data, error } = await supabase
            .from(getTabellaSimulazioni())
            .select("argomento")
            .eq("materia", materia)
            .neq("argomento", null);

          if (!error && data) {
            const unici = [...new Set(data.map((d) => d.argomento))];
            setArgomentiDisponibili(unici);
          }
        } catch (error) {
          console.error('Errore caricamento argomenti:', error);
          toast.error("❌ Errore nel caricamento degli argomenti");
        } finally {
          setLoading(false);
        }
      } else {
        setArgomentiDisponibili([]);
      }
      setArgomento("");
    };
    fetchArgomenti();
  }, [materia, userChecked]);

  // 🔄 CARICA TIPOLOGIE
  useEffect(() => {
    const fetchTipologie = async () => {
      if (materia && argomento && userChecked) {
        setLoading(true);
        try {
          const { data, error } = await supabase
            .from(getTabellaSimulazioni())
            .select("tipo")
            .eq("materia", materia)
            .eq("argomento", argomento);

          if (!error && data) {
            const tipiUnici = [...new Set(data.map((d) => d.tipo))];
            setTipologieDisponibili(tipiUnici);
            if (tipiUnici.length === 1) {
              setTipoSimulazione(tipiUnici[0]);
            }
          }
        } catch (error) {
          console.error('Errore caricamento tipologie:', error);
          toast.error("❌ Errore nel caricamento delle tipologie");
        } finally {
          setLoading(false);
        }
      } else {
        setTipologieDisponibili([]);
      }
    };
    fetchTipologie();
  }, [materia, argomento, userChecked]);

  // 🎯 GENERA SIMULAZIONE
  const generaSimulazione = async () => {
    if (
      !categoria ||
      (!indirizzo && !facolta) ||
      (categoria === "università" && !corso) ||
      !materia ||
      !argomento ||
      !tipoSimulazione
    ) {
      toast.error("❌ Inserisci tutti i campi richiesti");
      return;
    }

    setLoading(true);
    setSimulazione(null);
    setRisposteAperte({});
    setRisposteMultiple({});
    setCorrezione([]);

    try {
      const tabellaRisposte = categoria === "superiori"
        ? "simulazioni_scritti_risposte_superiori"
        : "simulazioni_scritti_risposte_universita";

      // Recupera versioni già svolte
      let queryRisposte = supabase
        .from(tabellaRisposte)
        .select(
          categoria === "superiori"
            ? "versione, indirizzo"
            : "versione, facolta, corso"
        )
        .eq("user_id", user.id)
        .eq("materia", materia)
        .eq("argomento", argomento)
        .eq("tipo", tipoSimulazione);

      const { data: svolteRaw, error: erroreSvolte } = await queryRisposte;

      let versioniSvolte: string[] = [];

      if (erroreSvolte) {
        console.error("Errore recupero versioni svolte:", erroreSvolte.message);
      } else if (Array.isArray(svolteRaw)) {
        versioniSvolte = svolteRaw
          .filter((r: any) =>
            categoria === "superiori"
              ? r.indirizzo === indirizzo
              : r.facolta === facolta && r.corso === corso
          )
          .map((r: any) => r.versione)
          .filter(Boolean);
      }

      // Query simulazioni escluse quelle già fatte
      let query = supabase
        .from(getTabellaSimulazioni())
        .select("*")
        .eq("materia", materia)
        .eq("argomento", argomento)
        .eq("tipo", tipoSimulazione);

      if (categoria === "superiori") {
        query = query.eq("indirizzo", indirizzo);
      } else {
        query = query.eq("facolta", facolta).eq("corso", corso);
      }

      if (versioniSvolte.length > 0) {
        query = query.not("versione", "in", `(${versioniSvolte.join(",")})`);
      }

      const { data, error } = await query;

      if (error || !data || data.length === 0) {
        throw new Error("Hai già svolto tutte le simulazioni disponibili per questo argomento.");
      }

      const randomSimulazione = data[Math.floor(Math.random() * data.length)];
      setSimulazione(randomSimulazione);
      setViewMode('simulazione');
      setSimulazioneStartTime(new Date());
      toast.success("🚀 Simulazione caricata con successo!");
      
    } catch (err: any) {
      toast.error(`❌ ${err.message || "Errore durante il caricamento della simulazione"}`);
    } finally {
      setLoading(false);
    }
  };

  // 🎯 CORREGGI RISPOSTE
  const correggiRisposte = async () => {
    const risposteFinali = tipoSimulazione === "multiple" ? risposteMultiple : risposteAperte;

    if (!simulazione) {
      toast.error("❌ Simulazione non trovata");
      return;
    }

    const totaleDomande = simulazione.contenuto_simulazione?.length || 0;
    const errori: number[] = [];

    // Validazione per multiple
    if (tipoSimulazione === "multiple") {
      for (let i = 0; i < totaleDomande; i++) {
        if (!risposteMultiple[i]) errori.push(i);
      }
    }

    // Validazione per aperte
    if (tipoSimulazione === "aperte") {
      for (let i = 0; i < totaleDomande; i++) {
        const risposta = risposteAperte[i];
        if (risposta === undefined || risposta.trim() === "") errori.push(i);
      }
    }

    if (errori.length > 0) {
      toast.error("❌ Compila tutte le domande prima di correggere");
      setErroriDomande(errori);
      const el = document.getElementById(`domanda-${errori[0]}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    if (voto === null || voto === undefined || isNaN(voto)) {
      toast.error("❌ Assegna un voto prima di correggere");
      return;
    }

    setErroriDomande([]);
    setLoading(true);

    try {
      const tabellaRisposte = categoria === "superiori"
        ? "simulazioni_scritti_risposte_superiori" 
        : "simulazioni_scritti_risposte_universita";

      const datiRisposta: any = {
        user_id: user.id,
        simulazione_id: simulazione.id,
        materia: simulazione.materia,
        argomento: simulazione.argomento,
        tipo: simulazione.tipo,
        risposte_utente: JSON.stringify(risposteFinali),
        voto,
        correzione: simulazione.soluzione_esempio,
        lode: categoria === "università" ? lode : null,
        tempo_impiegato: timeElapsed,
        ...(categoria === "superiori" && { indirizzo, categoria, versione: simulazione.versione }),
        ...(categoria === "università" && { facolta, corso, versione: simulazione.versione })
      };

      const { error } = await supabase.from(tabellaRisposte).insert(datiRisposta);

      if (error) throw new Error("Errore nel salvataggio della simulazione");

      setCorrezione(simulazione.soluzione_esempio);
      setViewMode('risultati');
      toast.success("✅ Simulazione salvata con successo!");
      
    } catch (err: any) {
      toast.error(`❌ ${err.message || "Errore durante la correzione"}`);
    } finally {
      setLoading(false);
    }
  };

  // 🔄 RESET SIMULAZIONE
  const resetSimulazione = () => {
    setSimulazione(null);
    setRisposteAperte({});
    setRisposteMultiple({});
    setCorrezione([]);
    setVoto(0);
    setLode(false);
    setErroriDomande([]);
    setSoluzioniVisibili({});
    setViewMode('setup');
    setSimulazioneStartTime(null);
    setTimeElapsed(0);
  };

  // 👁️ TOGGLE SOLUZIONE
  const toggleSoluzione = (index: number) => {
    setSoluzioniVisibili((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  if (!userChecked) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Caricamento simulazioni...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* 🎯 HEADER ENTERPRISE */}
      <div className="mb-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              ✍️ Simulazioni Esame Scritto
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Sistema enterprise per simulazioni d'esame personalizzate con tracking avanzato
            </p>
          </div>
          
          <div className="flex gap-3">
            <Link 
              href="/tools/storico-simulazioni"
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all font-medium flex items-center gap-2"
            >
              📚 Storico
            </Link>
            {viewMode !== 'setup' && (
              <button
                onClick={resetSimulazione}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all transform hover:scale-105 font-medium flex items-center gap-2"
              >
                🚀 Nuova Simulazione
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 🎯 CONTENUTO CONDIZIONALE PER VIEW MODE */}
      {viewMode === 'setup' && (
        <>
          {/* 📋 INFO PANEL ENTERPRISE */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 border border-blue-200 dark:border-blue-700 p-6 rounded-xl shadow-sm mb-6">
            <div className="flex items-start gap-4">
              <div className="text-3xl">🎯</div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Sistema Simulazioni Enterprise
                </h3>
                <p className="text-gray-700 dark:text-gray-300 mb-3">
                  Configura la tua simulazione personalizzata scegliendo categoria, materia e tipologia. 
                  Il sistema traccia automaticamente il tuo progresso e ti propone contenuti mai svolti.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm font-medium">
                    🔄 Auto-tracking
                  </span>
                  <span className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full text-sm font-medium">
                    📊 Validazione realtime
                  </span>
                  <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full text-sm font-medium">
                    🎯 Contenuti personalizzati
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 🔧 CONFIGURAZIONE SIMULAZIONE */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2">
              ⚙️ Configurazione Simulazione
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Categoria */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  📚 Categoria
                </label>
                <select
                  value={categoria}
                  onChange={(e) => {
                    setCategoria(e.target.value);
                    setIndirizzo("");
                    setFacolta("");
                    setMateria("");
                    setArgomento("");
                    setTipologieDisponibili([]);
                    setMaterieDisponibili([]);
                    setArgomentiDisponibili([]);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                >
                  <option value="superiori">🏫 Scuola Superiore</option>
                  <option value="università">🎓 Università</option>
                </select>
              </div>

              {/* Indirizzo (solo se superiori) */}
              {categoria === "superiori" && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    🎒 Indirizzo
                  </label>
                  <select
                    value={indirizzo}
                    onChange={(e) => setIndirizzo(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  >
                    <option value="">-- Seleziona Indirizzo --</option>
                    <option value="scientifico">🔬 Liceo Scientifico</option>
                    <option value="classico">📚 Liceo Classico</option>
                    <option value="linguistico">🌎 Liceo Linguistico</option>
                    <option value="scienze-umane">🧠 Liceo Scienze Umane</option>
                    <option value="artistico">🎨 Liceo Artistico</option>
                    <option value="musicale-coreutico">🎵 Liceo Musicale/Coreutico</option>
                    <option value="istituto-tecnico-economico">💼 Tecnico Economico</option>
                    <option value="istituto-tecnico-tecnologico">⚙️ Tecnico Tecnologico</option>
                    <option value="istituto-professionale">🔧 Istituto Professionale</option>
                  </select>
                </div>
              )}

              {/* Facoltà (solo se università) */}
              {categoria === "università" && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    🏛️ Facoltà
                  </label>
                  <select
                    value={facolta}
                    onChange={(e) => setFacolta(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  >
                    <option value="">-- Seleziona Facoltà --</option>
                    <option value="giurisprudenza">⚖️ Giurisprudenza</option>
                    <option value="medicina">🧬 Medicina</option>
                    <option value="ingegneria">🔧 Ingegneria</option>
                    <option value="psicologia">🧠 Psicologia</option>
                    <option value="economia">💼 Economia</option>
                    <option value="lettere">📚 Lettere</option>
                    <option value="lingue">🌍 Lingue</option>
                    <option value="scienze-politiche">🏛️ Scienze Politiche</option>
                    <option value="scienze-della-comunicazione">🗣️ Scienze Della Comunicazione</option>
                    <option value="lingue-e-comunicazione">🌐 Lingue e Comunicazione</option>
                    <option value="architettura">🏗️ Architettura</option>
                  </select>
                </div>
              )}

              {/* Corso (solo se università) */}
              {categoria === "università" && facolta && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    🎓 Corso di Laurea
                  </label>
                  <select
                    value={corso}
                    onChange={(e) => setCorso(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  >
                    <option value="">-- Seleziona Corso --</option>
                    {facolta === "economia" && (
                      <>
                        <option value="Economia e Management">📊 Economia e Management</option>
                        <option value="Economia Aziendale">📈 Economia Aziendale</option>
                      </>
                    )}
                    {facolta === "scienze-della-comunicazione" && (
                      <>
                        <option value="Media e Comunicazione Digitale">📱 Media e Comunicazione Digitale</option>
                        <option value="Comunicazione Istituzionale e d'Impresa">🏢 Comunicazione Istituzionale e d'Impresa</option>
                      </>
                    )}
                    {facolta === "lingue-e-comunicazione" && (
                      <>
                        <option value="Comunicazione D'impresa e Relazioni Pubbliche">📢 Comunicazione D'impresa e Relazioni Pubbliche</option>
                      </>
                    )}
                    {facolta === "ingegneria" && (
                      <>
                        <option value="Ingegneria Gestionale">⚙️ Ingegneria Gestionale</option>
                      </>
                    )}
                  </select>
                </div>
              )}

              {/* Materia */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  📘 Materia
                </label>
                <select
                  value={materia}
                  onChange={(e) => setMateria(e.target.value)}
                  disabled={materieDisponibili.length === 0}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">-- Seleziona Materia --</option>
                  {materieDisponibili.map((m) => (
                    <option key={m} value={m}>📚 {m}</option>
                  ))}
                </select>
                {loading && materieDisponibili.length === 0 && (
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <div className="animate-spin w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full"></div>
                    Caricamento materie...
                  </div>
                )}
              </div>

              {/* Argomento */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  📂 Argomento
                </label>
                <select
                  value={argomento}
                  onChange={(e) => setArgomento(e.target.value)}
                  disabled={argomentiDisponibili.length === 0}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">-- Seleziona Argomento --</option>
                  {argomentiDisponibili.map((a) => (
                    <option key={a} value={a}>📋 {a}</option>
                  ))}
                </select>
                {loading && materia && argomentiDisponibili.length === 0 && (
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <div className="animate-spin w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full"></div>
                    Caricamento argomenti...
                  </div>
                )}
              </div>

              {/* Tipo simulazione */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  🧪 Tipo Simulazione
                </label>
                <select
                  value={tipoSimulazione}
                  onChange={(e) => setTipoSimulazione(e.target.value)}
                  disabled={tipologieDisponibili.length === 0}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">-- Seleziona Tipo --</option>
                  {tipologieDisponibili.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {tipo === "aperte" && "📄 Domande Aperte"}
                      {tipo === "multiple" && "✅ Risposte Multiple"}
                      {tipo === "misto" && "🔀 Misto"}
                    </option>
                  ))}
                </select>
                {loading && argomento && tipologieDisponibili.length === 0 && (
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <div className="animate-spin w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full"></div>
                    Caricamento tipologie...
                  </div>
                )}
              </div>
            </div>

            {/* 📊 RIEPILOGO CONFIGURAZIONE */}
            {categoria && (indirizzo || facolta) && materia && argomento && tipoSimulazione && (
              <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/30 dark:to-blue-900/30 rounded-lg border border-purple-200 dark:border-purple-700">
                <h3 className="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  📋 Riepilogo Configurazione
                </h3>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-full text-sm font-medium text-gray-700 dark:text-gray-300">
                    {categoria === "superiori" ? "🏫 Superiori" : "🎓 Università"}
                  </span>
                  {categoria === "superiori" && indirizzo && (
                    <span className="px-3 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-full text-sm font-medium text-gray-700 dark:text-gray-300">
                      🎒 {indirizzo}
                    </span>
                  )}
                  {categoria === "università" && facolta && (
                    <span className="px-3 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-full text-sm font-medium text-gray-700 dark:text-gray-300">
                      🏛️ {facolta}
                    </span>
                  )}
                  {categoria === "università" && corso && (
                    <span className="px-3 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-full text-sm font-medium text-gray-700 dark:text-gray-300">
                      🎓 {corso}
                    </span>
                  )}
                  <span className="px-3 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-full text-sm font-medium text-gray-700 dark:text-gray-300">
                    📘 {materia}
                  </span>
                  <span className="px-3 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-full text-sm font-medium text-gray-700 dark:text-gray-300">
                    📂 {argomento}
                  </span>
                  <span className="px-3 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-full text-sm font-medium text-gray-700 dark:text-gray-300">
                    🧪 {tipoSimulazione === "multiple" ? "Risposte Multiple" : tipoSimulazione === "aperte" ? "Domande Aperte" : "Misto"}
                  </span>
                </div>
              </div>
            )}

            {/* 🚀 PULSANTE GENERA */}
            <div className="mt-6 flex justify-center">
              <button
                onClick={generaSimulazione}
                disabled={loading || !categoria || (!indirizzo && !facolta) || (categoria === "università" && !corso) || !materia || !argomento || !tipoSimulazione}
                className="px-8 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 flex items-center gap-3 font-medium text-lg shadow-lg"
              >
                {loading ? (
                  <>
                    <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                    Generazione in corso...
                  </>
                ) : (
                  <>
                    🚀 Genera Simulazione
                  </>
                )}
              </button>
            </div>
          </div>
        </>
      )}

      {/* 📝 VISUALIZZAZIONE SIMULAZIONE */}
      {viewMode === 'simulazione' && simulazione && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          {/* 📊 HEADER SIMULAZIONE */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                📝 Simulazione in Corso
              </h2>
              <div className="flex flex-wrap gap-2 text-sm">
                <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full font-medium">
                  📘 {simulazione.materia}
                </span>
                <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full font-medium">
                  📂 {simulazione.argomento}
                </span>
                <span className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full font-medium">
                  🧪 {tipoSimulazione === "multiple" ? "Multiple" : tipoSimulazione === "aperte" ? "Aperte" : "Misto"}
                </span>
                {simulazione.difficolta && (
                  <span className={`px-3 py-1 rounded-full font-medium ${getDifficultyColor(simulazione.difficolta)}`}>
                    {getDifficultyEmoji(simulazione.difficolta)} {simulazione.difficolta.charAt(0).toUpperCase() + simulazione.difficolta.slice(1)}
                  </span>
                )}
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                ⏱️ {formatTime(timeElapsed)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Tempo trascorso
              </div>
              {simulazione.durata_stimata && (
                <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Durata stimata: {simulazione.durata_stimata} min
                </div>
              )}
            </div>
          </div>

          {/* 📖 TESTO BASE */}
          {simulazione.testo_base && (
            <div className="mb-6 p-6 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-gray-100 flex items-center gap-2">
                📖 Testo da Analizzare
              </h3>
              <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                >
                  {simulazione.testo_base}
                </ReactMarkdown>
              </div>
            </div>
          )}

          {/* 📋 PROGRESS BAR DOMANDE */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Progresso Domande
              </span>
              <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                {Object.keys(tipoSimulazione === "multiple" ? risposteMultiple : risposteAperte).length}/{simulazione.contenuto_simulazione?.length || 0}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div 
                className={`h-3 rounded-full transition-all duration-300 ${getProgressColor(
                  (Object.keys(tipoSimulazione === "multiple" ? risposteMultiple : risposteAperte).length / (simulazione.contenuto_simulazione?.length || 1)) * 100
                )}`}
                style={{ 
                  width: `${(Object.keys(tipoSimulazione === "multiple" ? risposteMultiple : risposteAperte).length / (simulazione.contenuto_simulazione?.length || 1)) * 100}%` 
                }}
              ></div>
            </div>
          </div>

          {/* 📝 DOMANDE */}
          <div className="space-y-6">
            {Array.isArray(simulazione.contenuto_simulazione) &&
              simulazione.contenuto_simulazione.map((item: any, index: number) => (
                <div
                  key={index}
                  id={`domanda-${index}`}
                  className={`p-6 rounded-xl border transition-all duration-300 ${
                    erroriDomande.includes(index)
                      ? "border-red-500 bg-red-50 dark:bg-red-900/30 shadow-lg"
                      : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 hover:border-purple-300 dark:hover:border-purple-600"
                  }`}
                >
                  {/* Header Domanda */}
                  <div className="flex justify-between items-start mb-4 gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="flex items-center justify-center w-8 h-8 bg-purple-600 text-white rounded-full font-bold text-sm">
                        {index + 1}
                      </div>
                      <div className="prose prose-sm md:prose-base dark:prose-invert flex-1">
                        <ReactMarkdown>{item.domanda}</ReactMarkdown>
                      </div>
                      {(tipoSimulazione === "multiple" ? risposteMultiple[index] : risposteAperte[index]) && (
                        <div className="text-green-600 text-xl">✅</div>
                      )}
                    </div>

                    <button
                      onClick={() => toggleSoluzione(index)}
                      className="px-3 py-1 text-sm border border-blue-500 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all whitespace-nowrap"
                    >
                      {soluzioniVisibili[index] ? "🔽 Nascondi" : "🔍 Soluzione"}
                    </button>
                  </div>

                  {/* Risposte Multiple */}
                  {item.opzioni && Array.isArray(item.opzioni) ? (
                    <div className="space-y-3">
                      {item.opzioni.map((opzione: string, opIndex: number) => {
                        const rispostaUtente = risposteMultiple[index];
                        const rispostaCorretta = item.risposta_corretta;
                        const isCorretto = rispostaUtente === rispostaCorretta;
                        const isSelezionata = rispostaUtente === opzione;
                        const èRispostaCorretta = opzione === rispostaCorretta;

                        const showCorretto = correzione && isSelezionata && isCorretto;
                        const showSbagliato = correzione && isSelezionata && !isCorretto;
                        const showCorrettaNonScelta = correzione && !isSelezionata && èRispostaCorretta && !isCorretto;

                        return (
                          <label
                            key={opIndex}
                            className={`flex items-start gap-3 p-4 rounded-lg cursor-pointer transition-all hover:bg-white dark:hover:bg-gray-800 border ${
                              showCorretto ? "bg-green-100 dark:bg-green-900/30 border-green-400" :
                              showSbagliato ? "bg-red-100 dark:bg-red-900/30 border-red-400" :
                              showCorrettaNonScelta ? "bg-green-50 dark:bg-green-900/20 border-green-300" :
                              isSelezionata ? "bg-purple-50 dark:bg-purple-900/30 border-purple-300" :
                              "border-gray-200 dark:border-gray-600"
                            }`}
                          >
                            <input
                              type="radio"
                              name={`domanda-${index}`}
                              value={opzione}
                              disabled={!!correzione}
                              checked={isSelezionata}
                              onChange={(e) =>
                                setRisposteMultiple((prev) => ({
                                  ...prev,
                                  [index]: e.target.value,
                                }))
                              }
                              className="mt-1 w-4 h-4 text-purple-600 focus:ring-purple-500"
                            />
                            <div className="prose prose-sm dark:prose-invert flex-1">
                              <ReactMarkdown
                                remarkPlugins={[remarkMath]}
                                rehypePlugins={[rehypeKatex]}
                              >
                                {opzione}
                              </ReactMarkdown>
                            </div>
                            {showCorretto && <span className="text-green-600 font-bold text-sm">✅ Corretta</span>}
                            {showSbagliato && <span className="text-red-600 font-bold text-sm">❌ Sbagliata</span>}
                            {showCorrettaNonScelta && <span className="text-green-600 font-bold text-sm">✔️ Corretta</span>}
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    // Risposta Aperta
                    <div className="space-y-3">
                      <textarea
                        value={risposteAperte[index] || ""}
                        onChange={(e) =>
                          setRisposteAperte((prev) => ({
                            ...prev,
                            [index]: e.target.value,
                          }))
                        }
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-vertical"
                        rows={4}
                        placeholder="Scrivi la tua risposta dettagliata qui..."
                      />
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        💡 Suggerimento: Fornisci una risposta completa e ben strutturata
                      </div>
                    </div>
                  )}

                  {/* Soluzione */}
                  {((correzione && correzione[index]) || soluzioniVisibili[index]) && (
                    <div className="mt-4 p-4 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-300 dark:border-green-700">
                      <div className="flex items-start gap-3">
                        <div className="text-green-600 text-xl">💡</div>
                        <div className="flex-1">
                          <p className="font-bold text-green-800 dark:text-green-300 mb-2">
                            Soluzione Ideale:
                          </p>
                          <div className="prose prose-sm dark:prose-invert text-green-800 dark:text-green-300">
                            <ReactMarkdown
                              remarkPlugins={[remarkMath]}
                              rehypePlugins={[rehypeKatex]}
                            >
                              {(() => {
                                const sol = correzione && correzione[index]
                                  ? correzione[index]
                                  : simulazione?.soluzione_esempio?.[index];
                                return typeof sol === "string" ? sol : sol?.soluzione || "Nessuna soluzione disponibile.";
                              })()}
                            </ReactMarkdown>
                          </div>
                          
                          {tipoSimulazione === "multiple" && correzione[index] && (
                            <div className="mt-3">
                              <span
                                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold ${
                                  risposteMultiple[index] === item.risposta_corretta
                                    ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                                    : "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200"
                                }`}
                              >
                                {risposteMultiple[index] === item.risposta_corretta ? "✅ Risposta corretta" : "❌ Risposta errata"}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
          </div>

          {/* 🎯 SEZIONE VALUTAZIONE */}
          <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 rounded-xl border border-blue-200 dark:border-blue-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              🎯 Valutazione
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  📊 Assegna il tuo voto:
                </label>
                <input
                  type="number"
                  min={0}
                  max={categoria === "università" ? 30 : 10}
                  value={voto}
                  onChange={(e) => setVoto(Number(e.target.value))}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-lg font-semibold text-center"
                  placeholder={`0-${categoria === "università" ? "30" : "10"}`}
                />
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Range: 0-{categoria === "università" ? "30" : "10"}
                </div>
              </div>
              
              {categoria === "università" && (
                <div className="flex items-center justify-center">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={lode} 
                      onChange={(e) => setLode(e.target.checked)}
                      className="w-5 h-5 text-purple-600 focus:ring-purple-500 rounded"
                    />
                    <span className="text-lg font-medium text-gray-900 dark:text-gray-100">🏆 Con Lode</span>
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* 🚀 PULSANTI AZIONE */}
          <div className="mt-6 flex gap-4 justify-center">
            <button
              onClick={resetSimulazione}
              className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all flex items-center gap-2 font-medium"
            >
              🔄 Ricomincia
            </button>
            
            <button
              onClick={correggiRisposte}
              disabled={loading || Object.keys(tipoSimulazione === "multiple" ? risposteMultiple : risposteAperte).length < (simulazione.contenuto_simulazione?.length || 0) || !voto}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 flex items-center gap-3 font-medium text-lg shadow-lg"
            >
              {loading ? (
                <>
                  <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                  Correzione in corso...
                </>
              ) : (
                <>
                  ✅ Correggi e Salva
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 🏆 VISUALIZZAZIONE RISULTATI */}
      {viewMode === 'risultati' && simulazione && correzione.length > 0 && (
        <div className="space-y-6">
          {/* 📊 HEADER RISULTATI */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 rounded-xl border border-green-200 dark:border-green-700 p-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-green-800 dark:text-green-200 mb-2 flex items-center gap-2">
                  🏆 Simulazione Completata!
                </h2>
                <div className="flex flex-wrap gap-3 text-sm">
                  <span className="px-3 py-1 bg-white dark:bg-gray-800 border border-green-300 dark:border-green-600 rounded-full font-medium text-green-800 dark:text-green-200">
                    📘 {simulazione.materia}
                  </span>
                  <span className="px-3 py-1 bg-white dark:bg-gray-800 border border-green-300 dark:border-green-600 rounded-full font-medium text-green-800 dark:text-green-200">
                    📂 {simulazione.argomento}
                  </span>
                  <span className="px-3 py-1 bg-white dark:bg-gray-800 border border-green-300 dark:border-green-600 rounded-full font-medium text-green-800 dark:text-green-200">
                    ⏱️ {formatTime(timeElapsed)}
                  </span>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-3xl font-bold text-green-800 dark:text-green-200">
                  {voto}/{categoria === "università" ? "30" : "10"}
                  {lode && categoria === "università" && " 🏆"}
                </div>
                <div className="text-sm text-green-600 dark:text-green-400">
                  Il tuo voto
                </div>
              </div>
            </div>
          </div>

          {/* 📊 STATISTICHE RISULTATI */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Domande Totali</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{simulazione.contenuto_simulazione?.length || 0}</p>
                </div>
                <div className="text-2xl">📝</div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Tempo Impiegato</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatTime(timeElapsed)}</p>
                </div>
                <div className="text-2xl">⏱️</div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Performance</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {Math.round((voto / (categoria === "università" ? 30 : 10)) * 100)}%
                  </p>
                </div>
                <div className="text-2xl">📊</div>
              </div>
            </div>
          </div>

          {/* 🔍 REVISIONE DOMANDE */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2">
              🔍 Revisione Dettagliata
            </h3>
            
            <div className="space-y-6">
              {Array.isArray(simulazione.contenuto_simulazione) &&
                simulazione.contenuto_simulazione.map((item: any, index: number) => {
                  const rispostaUtente = tipoSimulazione === "multiple" ? risposteMultiple[index] : risposteAperte[index];
                  const isCorretta = tipoSimulazione === "multiple" ? rispostaUtente === item.risposta_corretta : true; // Per aperte, consideriamo sempre corretta

                  return (
                    <div
                      key={index}
                      className={`p-6 rounded-xl border ${
                        isCorretta && tipoSimulazione === "multiple"
                          ? "border-green-300 bg-green-50 dark:bg-green-900/20 dark:border-green-600"
                          : tipoSimulazione === "multiple"
                          ? "border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-600"
                          : "border-blue-300 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-600"
                      }`}
                    >
                      {/* Header Domanda con Risultato */}
                      <div className="flex items-start gap-3 mb-4">
                        <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                          isCorretta && tipoSimulazione === "multiple"
                            ? "bg-green-600 text-white"
                            : tipoSimulazione === "multiple"
                            ? "bg-red-600 text-white"
                            : "bg-blue-600 text-white"
                        }`}>
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="prose prose-sm dark:prose-invert">
                            <ReactMarkdown>{item.domanda}</ReactMarkdown>
                          </div>
                        </div>
                        <div className="text-2xl">
                          {isCorretta && tipoSimulazione === "multiple" ? "✅" : tipoSimulazione === "multiple" ? "❌" : "📝"}
                        </div>
                      </div>

                      {/* Risposta Utente */}
                      <div className="mb-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                          👤 La tua risposta:
                        </p>
                        <div className="text-gray-900 dark:text-gray-100">
                          {tipoSimulazione === "multiple" ? (
                            <div className="prose prose-sm dark:prose-invert">
                              <ReactMarkdown>{rispostaUtente || "Nessuna risposta"}</ReactMarkdown>
                            </div>
                          ) : (
                            <div className="whitespace-pre-wrap">
                              {rispostaUtente || "Nessuna risposta fornita"}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Soluzione Corretta */}
                      <div className="p-4 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-700">
                        <p className="text-sm font-medium text-green-700 dark:text-green-300 mb-2">
                          💡 Soluzione ideale:
                        </p>
                        <div className="prose prose-sm dark:prose-invert text-green-800 dark:text-green-200">
                          <ReactMarkdown
                            remarkPlugins={[remarkMath]}
                            rehypePlugins={[rehypeKatex]}
                          >
                            {(() => {
                              const sol = correzione[index];
                              return typeof sol === "string" ? sol : sol?.soluzione || "Nessuna soluzione disponibile.";
                            })()}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* 🚀 AZIONI FINALI */}
          <div className="flex gap-4 justify-center">
            <Link
              href="/tools/storico-simulazioni"
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all flex items-center gap-2 font-medium"
            >
              📚 Vai allo Storico
            </Link>
            
            <button
              onClick={resetSimulazione}
              className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all transform hover:scale-105 flex items-center gap-2 font-medium"
            >
              🔄 Nuova Simulazione
            </button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

SimulazioniScrittePage.requireAuth = true;