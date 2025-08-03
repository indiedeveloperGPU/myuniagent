import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/router";
import ReactMarkdown from "react-markdown";
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import ModaleRiassunto from "@/components/ModaleRiassunto";
import ModaleModifica from "@/components/ModaleModifica";
import CardRiassunto from "@/components/CardRiassunto";
import { toast } from "react-hot-toast";

interface RiassuntoType {
  id: string;
  titolo: string;
  input: string;
  output: string;
  creato_il: string;
  facolta?: string;
  materia?: string;
  versione?: number;
  modificato_da?: string;
  modificato_il?: string;
}

export default function BibliotecaPage() {
  const [sezioneAttiva, setSezioneAttiva] = useState<"biblioteca" | "spiegazioni">("biblioteca");
  const [query, setQuery] = useState("");
  const [filtroFacolta, setFiltroFacolta] = useState("");
  const [filtroArgomento, setFiltroArgomento] = useState("");
  const [categoria, setCategoria] = useState("riassunti");
  const [riassunti, setRiassunti] = useState<RiassuntoType[]>([]);
  const [riassuntiFiltrati, setRiassuntiFiltrati] = useState<RiassuntoType[]>([]);
  const [riassuntoAttivo, setRiassuntoAttivo] = useState<RiassuntoType | null>(null);
  const [mostraModaleRiassunto, setMostraModaleRiassunto] = useState(false);
  const [mostraModaleModifica, setMostraModaleModifica] = useState(false);
  const [loading, setLoading] = useState(false);
  const [facoltaDisponibili, setFacoltaDisponibili] = useState<string[]>([]);
  const [materieDisponibili, setMaterieDisponibili] = useState<string[]>([]);

  // Carica i riassunti pubblici
  useEffect(() => {
    const caricaRiassunti = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("riassunti_generati")
          .select("id, titolo, input, output, creato_il, facolta, materia, versione, modificato_da, modificato_il")
          .eq("is_public", true)
          .order("creato_il", { ascending: false });

        if (data) {
          setRiassunti(data);
          setRiassuntiFiltrati(data);
          
          // Estrai facoltà e materie uniche per i filtri
          const facolta = [...new Set(data.map(r => r.facolta).filter(Boolean))];
          const materie = [...new Set(data.map(r => r.materia).filter(Boolean))];
          setFacoltaDisponibili(facolta);
          setMaterieDisponibili(materie);
          
          toast.success(`📚 ${data.length} riassunti caricati con successo!`);
        } else {
          console.error("Errore nel caricamento riassunti:", error);
          toast.error("❌ Errore nel caricamento della biblioteca");
        }
      } catch (error) {
        console.error("Errore:", error);
        toast.error("❌ Errore di connessione");
      } finally {
        setLoading(false);
      }
    };

    if (sezioneAttiva === "biblioteca") {
      caricaRiassunti();
    }
  }, [sezioneAttiva]);

  // Applica filtri ai riassunti
  useEffect(() => {
    let risultati = riassunti;

    // Filtro per query di ricerca
    if (query.trim()) {
      risultati = risultati.filter(r => 
        r.titolo.toLowerCase().includes(query.toLowerCase()) ||
        r.output.toLowerCase().includes(query.toLowerCase())
      );
    }

    // Filtro per facoltà
    if (filtroFacolta) {
      risultati = risultati.filter(r => r.facolta === filtroFacolta);
    }

    // Filtro per materia
    if (filtroArgomento) {
      risultati = risultati.filter(r => r.materia === filtroArgomento);
    }

    setRiassuntiFiltrati(risultati);
  }, [query, filtroFacolta, filtroArgomento, riassunti]);

  const handleCerca = () => {
    // La ricerca viene applicata automaticamente tramite useEffect
    toast.success(`🔍 ${riassuntiFiltrati.length} risultati trovati!`);
  };

  const handleOpenModale = (riassunto: RiassuntoType) => {
    setRiassuntoAttivo(riassunto);
    setMostraModaleRiassunto(true);
  };

  const handleCloseModale = () => {
    setMostraModaleRiassunto(false);
    setRiassuntoAttivo(null);
  };

  const handleOpenModifica = (riassunto: RiassuntoType) => {
    setRiassuntoAttivo(riassunto);
    setMostraModaleRiassunto(false);
    setMostraModaleModifica(true);
  };

  const handleCloseModifica = () => {
    setMostraModaleModifica(false);
    setRiassuntoAttivo(null);
  };

  const handleSalvaModifica = (riassuntoAggiornato: RiassuntoType) => {
    setRiassunti(prev => 
      prev.map(r => r.id === riassuntoAggiornato.id ? riassuntoAggiornato : r)
    );
    
    setMostraModaleModifica(false);
    setRiassuntoAttivo(riassuntoAggiornato);
    setMostraModaleRiassunto(true);
    
    toast.success("✅ Modifica salvata con successo!");
  };

  return (
    <DashboardLayout>
      {/* 🎓 HEADER ENTERPRISE */}
      <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">📚 Biblioteca Enterprise MyUniAgent</h1>

      <div className="bg-gradient-to-br from-blue-50 to-purple-100 dark:from-blue-900 dark:to-purple-800 border-l-4 border-blue-500 text-blue-900 dark:text-blue-100 p-4 rounded-xl shadow-md mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="font-bold text-lg flex items-center gap-2 mb-2">
              📚 Centro di Conoscenza Universitaria
            </h2>
            <p className="text-sm leading-relaxed">
              <strong>Accesso completo alla biblioteca condivisa!</strong> Esplora riassunti, analisi e spiegazioni create dalla community universitaria.
              <br />
              <strong>Ricerca avanzata</strong> per facoltà, materia e contenuto • <strong>Contributi verificati</strong> • <strong>Aggiornamenti real-time</strong>
            </p>
          </div>
        </div>
      </div>

      {/* 🎯 TAB NAVIGATION ENTERPRISE */}
      <div className="mb-6">
        <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <button
            className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all transform hover:scale-[1.02] ${
              sezioneAttiva === "biblioteca"
                ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
                : "text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
            }`}
            onClick={() => setSezioneAttiva("biblioteca")}
          >
            📚 Biblioteca Condivisa
          </button>
          <button
            className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all transform hover:scale-[1.02] ${
              sezioneAttiva === "spiegazioni"
                ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg"
                : "text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400"
            }`}
            onClick={() => setSezioneAttiva("spiegazioni")}
          >
            💬 Le Tue Spiegazioni
          </button>
        </div>
      </div>

      {/* 🎯 CONTENUTO CONDIZIONATO */}
      {sezioneAttiva === "biblioteca" ? (
        <>
          {/* 🔍 FILTRI DI RICERCA ENTERPRISE */}
          <div className="mb-6 p-6 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-md">
            <h3 className="font-semibold mb-4 text-gray-900 dark:text-gray-100 flex items-center gap-2 text-lg">
              🔍 Sistema di Ricerca Avanzata
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  📂 Categoria
                </label>
                <select
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  className="w-full p-3 border rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 transition-all"
                >
                  <option value="riassunti">📄 Riassunti Accademici</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  🏛️ Facoltà
                </label>
                <select
                  value={filtroFacolta}
                  onChange={(e) => setFiltroFacolta(e.target.value)}
                  className="w-full p-3 border rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 transition-all"
                >
                  <option value="">🌐 Tutte le facoltà</option>
                  {facoltaDisponibili.map(facolta => (
                    <option key={facolta} value={facolta}>{facolta}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  📘 Materia
                </label>
                <select
                  value={filtroArgomento}
                  onChange={(e) => setFiltroArgomento(e.target.value)}
                  className="w-full p-3 border rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 transition-all"
                >
                  <option value="">📚 Tutte le materie</option>
                  {materieDisponibili.map(materia => (
                    <option key={materia} value={materia}>{materia}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  🔍 Ricerca Libera
                </label>
                <input
                  type="text"
                  placeholder="Cerca per titolo o contenuto..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full p-3 border rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>

            <div className="flex justify-between items-center">
              <button
                onClick={handleCerca}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105 font-medium shadow-lg"
              >
                🔍 Esegui Ricerca Avanzata
              </button>
              
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700">
                  📊 {riassuntiFiltrati.length} risultati trovati
                </span>
                {(query || filtroFacolta || filtroArgomento) && (
                  <button
                    onClick={() => {
                      setQuery("");
                      setFiltroFacolta("");
                      setFiltroArgomento("");
                      toast.success("🧹 Filtri rimossi!");
                    }}
                    className="text-sm bg-gray-600 text-white px-3 py-2 rounded-lg hover:bg-gray-700 transition-all"
                  >
                    🧹 Pulisci Filtri
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 📊 STATISTICHE RAPIDE */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-900 dark:to-blue-900 p-4 rounded-xl border border-green-200 dark:border-green-700">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white text-xl">
                  📚
                </div>
                <div>
                  <div className="font-semibold text-green-800 dark:text-green-200">Totale Riassunti</div>
                  <div className="text-2xl font-bold text-green-900 dark:text-green-100">{riassunti.length}</div>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900 dark:to-blue-900 p-4 rounded-xl border border-purple-200 dark:border-purple-700">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center text-white text-xl">
                  🏛️
                </div>
                <div>
                  <div className="font-semibold text-purple-800 dark:text-purple-200">Facoltà Coperte</div>
                  <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">{facoltaDisponibili.length}</div>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900 dark:to-cyan-900 p-4 rounded-xl border border-blue-200 dark:border-blue-700">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white text-xl">
                  📘
                </div>
                <div>
                  <div className="font-semibold text-blue-800 dark:text-blue-200">Materie Disponibili</div>
                  <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">{materieDisponibili.length}</div>
                </div>
              </div>
            </div>
          </div>

          {/* 📂 RISULTATI ENTERPRISE */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden">
            <div className="p-6 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                📂 Biblioteca Riassunti Accademici
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Collezione curata di materiale di studio universitario verificato e di qualità
              </p>
            </div>
            
            <div className="p-6">
              {loading ? (
                <div className="flex flex-col justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mb-4"></div>
                  <span className="text-lg font-medium text-gray-600 dark:text-gray-400">🔄 Caricamento biblioteca in corso...</span>
                  <span className="text-sm text-gray-500 dark:text-gray-500 mt-1">Recupero dei contenuti più recenti</span>
                </div>
              ) : riassuntiFiltrati.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📚</div>
                  <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {riassunti.length === 0 
                      ? "Biblioteca in fase di popolamento" 
                      : "Nessun risultato per i filtri selezionati"
                    }
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    {riassunti.length === 0 
                      ? "I primi contenuti accademici saranno disponibili a breve." 
                      : "Prova a modificare i criteri di ricerca per trovare contenuti pertinenti."
                    }
                  </p>
                  {riassunti.length > 0 && (
                    <button
                      onClick={() => {
                        setQuery("");
                        setFiltroFacolta("");
                        setFiltroArgomento("");
                      }}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all"
                    >
                      🔄 Mostra Tutti i Riassunti
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {riassuntiFiltrati.map((riassunto) => (
                    <div
                      key={riassunto.id}
                      className="group bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:shadow-xl transition-all transform hover:scale-[1.02] cursor-pointer"
                      onClick={() => handleOpenModale(riassunto)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                          📄
                        </div>
                        <div className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full">
                          v{riassunto.versione || 1}
                        </div>
                      </div>
                      
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {riassunto.titolo}
                      </h3>
                      
                      <div className="space-y-2 mb-4">
                        {riassunto.facolta && (
                          <div className="flex items-center gap-2 text-xs">
                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                            <span className="text-gray-600 dark:text-gray-400">{riassunto.facolta}</span>
                          </div>
                        )}
                        {riassunto.materia && (
                          <div className="flex items-center gap-2 text-xs">
                            <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                            <span className="text-gray-600 dark:text-gray-400">{riassunto.materia}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                        <span>📅 {new Date(riassunto.creato_il).toLocaleDateString('it-IT')}</span>
                        <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                          {Math.ceil(riassunto.output.length / 4)} token
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 🎯 MODALI */}
          <ModaleRiassunto
            riassunto={riassuntoAttivo}
            isOpen={mostraModaleRiassunto}
            onClose={handleCloseModale}
            onModifica={handleOpenModifica}
          />

          <ModaleModifica
            riassunto={riassuntoAttivo}
            isOpen={mostraModaleModifica}
            onClose={handleCloseModifica}
            onSave={handleSalvaModifica}
          />
        </>
      ) : (
        <SpiegazioniSalvateEnterprise />
      )}
    </DashboardLayout>
  );
}

BibliotecaPage.requireAuth = true;

// 🎓 COMPONENTE SPIEGAZIONI SALVATE ENTERPRISE
function SpiegazioniSalvateEnterprise() {
  const [spiegazioni, setSpiegazioni] = useState<
    { titolo: string; creata_il: string; ultima_modifica: string; messaggi?: any[] }[]
  >([]);
  const router = useRouter();
  const [spiegazioneAttiva, setSpiegazioneAttiva] = useState<any | null>(null);
  const [mostraModale, setMostraModale] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const caricaSpiegazioni = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.id) return;

        const { data, error } = await supabase
          .from("chat_spiegazioni")
          .select("titolo, creato_il, messaggi")
          .eq("user_id", user?.id)
          .order("creato_il", { ascending: false });

        if (data) {
          setSpiegazioni(
            data.map((s) => ({
              titolo: s.titolo,
              creata_il: new Date(s.creato_il).toLocaleDateString('it-IT'),
              ultima_modifica: new Date(s.creato_il).toLocaleString('it-IT'),
              messaggi: s.messaggi,
            }))
          );
          toast.success(`💬 ${data.length} spiegazioni caricate!`);
        } else {
          console.error("Errore nel caricamento spiegazioni:", error);
          toast.error("❌ Errore nel caricamento spiegazioni");
        }
      } catch (error) {
        console.error("Errore:", error);
        toast.error("❌ Errore di connessione");
      } finally {
        setLoading(false);
      }
    };

    caricaSpiegazioni();
  }, []);

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden">
      <div className="p-6 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900 dark:to-blue-900 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          💬 Le Tue Spiegazioni Personalizzate
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Archivio personale delle conversazioni e spiegazioni create con MyUniAgent
        </p>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="flex flex-col justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent mb-4"></div>
            <span className="text-lg font-medium text-gray-600 dark:text-gray-400">🔄 Caricamento spiegazioni...</span>
          </div>
        ) : spiegazioni.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">💬</div>
            <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Nessuna spiegazione salvata
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Le tue conversazioni salvate con MyUniAgent appariranno qui.
            </p>
            <button
              onClick={() => router.push('/chat')}
              className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all transform hover:scale-105"
            >
              🚀 Inizia una Nuova Chat
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {spiegazioni.map((s, i) => (
              <div
                key={i}
                className="group bg-gradient-to-r from-gray-50 to-purple-50 dark:from-gray-800 dark:to-purple-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6 hover:shadow-lg transition-all transform hover:scale-[1.01]"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center text-white font-bold">
                        💬
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                          {s.titolo}
                        </h3>
                        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            📅 Creata: {s.creata_il}
                          </span>
                          <span className="flex items-center gap-1">
                            🕒 Modificata: {s.ultima_modifica}
                          </span>
                          {s.messaggi && (
                            <span className="bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-1 rounded-full">
                              {s.messaggi.length} messaggi
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => {
                      setSpiegazioneAttiva(s);
                      setMostraModale(true);
                    }}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all transform hover:scale-105 font-medium shadow-md"
                  >
                    👁️ Visualizza
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 🎯 MODALE SPIEGAZIONE ENTERPRISE */}
        {mostraModale && spiegazioneAttiva && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center px-4">
            <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl transition-all">
              
              {/* 🎨 HEADER MODALE */}
              <div className="p-6 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900 dark:to-blue-900 border-b border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold text-purple-900 dark:text-purple-100 flex items-center gap-2">
                      💬 {spiegazioneAttiva.titolo}
                    </h2>
                    <div className="flex items-center gap-4 text-sm text-purple-700 dark:text-purple-300 mt-2">
                      <span className="flex items-center gap-1">
                        📅 {spiegazioneAttiva.creata_il}
                      </span>
                      <span className="flex items-center gap-1">
                        🕒 {spiegazioneAttiva.ultima_modifica}
                      </span>
                      {spiegazioneAttiva.messaggi && (
                        <span className="bg-purple-100 dark:bg-purple-800 text-purple-800 dark:text-purple-200 px-3 py-1 rounded-full">
                          {spiegazioneAttiva.messaggi.length} messaggi
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    className="text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 text-2xl font-bold transition-colors p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                    onClick={() => setMostraModale(false)}
                  >
                    ✖
                  </button>
                </div>
              </div>

              {/* 📝 CONTENUTO CONVERSAZIONE */}
              <div className="overflow-y-auto max-h-[calc(90vh-200px)] p-6 space-y-6">
                {spiegazioneAttiva.messaggi?.map((msg: any, index: number) => (
                  <div
                    key={index}
                    className={`group transition-all ${
                      msg.role === "user" ? "ml-8" : "mr-8"
                    }`}
                  >
                    <div
                      className={`p-6 rounded-2xl border shadow-sm ${
                        msg.role === "user"
                          ? "bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 border-blue-200 dark:border-blue-700"
                          : "bg-gradient-to-br from-gray-50 to-green-50 dark:from-gray-800 dark:to-green-900/30 border-gray-200 dark:border-gray-700"
                      }`}
                    >
                      {/* 👤 AVATAR E RUOLO */}
                      <div className="flex items-center gap-3 mb-4">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                            msg.role === "user"
                              ? "bg-gradient-to-br from-blue-500 to-purple-500"
                              : "bg-gradient-to-br from-green-500 to-blue-500"
                          }`}
                        >
                          {msg.role === "user" ? "🙋" : "🎓"}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-800 dark:text-gray-200">
                            {msg.role === "user" ? "Tu" : "MyUniAgent"}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {msg.role === "user" ? "Domanda" : "Spiegazione AI"}
                          </div>
                        </div>
                      </div>

                      {/* 📄 CONTENUTO MESSAGGIO */}
                      <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none">
                        <ReactMarkdown
  remarkPlugins={[remarkMath, remarkGfm]}
  rehypePlugins={[rehypeKatex, rehypeHighlight]}
>
  {msg.content}
</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 🎯 FOOTER AZIONI */}
              <div className="p-6 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    💾 Conversazione salvata automaticamente
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(
                          spiegazioneAttiva.messaggi?.map((m: any) => 
                            `${m.role === 'user' ? 'Tu' : 'MyUniAgent'}: ${m.content}`
                          ).join('\n\n') || ''
                        );
                        toast.success("📋 Conversazione copiata!");
                      }}
                      className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-all"
                    >
                      📋 Copia
                    </button>
                    <button
                      onClick={() => setMostraModale(false)}
                      className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all font-medium"
                    >
                      ✅ Chiudi
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

BibliotecaPage.requireAuth = true;