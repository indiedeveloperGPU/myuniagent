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
        } else {
          console.error("Errore nel caricamento riassunti:", error);
        }
      } catch (error) {
        console.error("Errore:", error);
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
    console.log(`Trovati ${riassuntiFiltrati.length} riassunti`);
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
    setMostraModaleRiassunto(false); // Chiude il modale di lettura
    setMostraModaleModifica(true);   // Apre il modale di modifica
  };

  const handleCloseModifica = () => {
    setMostraModaleModifica(false);
    setRiassuntoAttivo(null);
  };

  const handleSalvaModifica = (riassuntoAggiornato: RiassuntoType) => {
    // Aggiorna la lista dei riassunti con i nuovi dati
    setRiassunti(prev => 
      prev.map(r => r.id === riassuntoAggiornato.id ? riassuntoAggiornato : r)
    );
    
    // Chiude il modale di modifica e riapre quello di lettura con i dati aggiornati
    setMostraModaleModifica(false);
    setRiassuntoAttivo(riassuntoAggiornato);
    setMostraModaleRiassunto(true);
  };

  return (
    <DashboardLayout>
      {/* Tab Switch */}
      <div className="mb-6">
        <div className="flex gap-4 mb-2">
          <button
            className={`px-4 py-2 rounded-t-md border-b-2 transition ${
              sezioneAttiva === "biblioteca"
                ? "border-blue-600 text-blue-600 font-semibold"
                : "border-transparent text-gray-500 hover:text-blue-600"
            }`}
            onClick={() => setSezioneAttiva("biblioteca")}
          >
            📚 Biblioteca
          </button>
          <button
            className={`px-4 py-2 rounded-t-md border-b-2 transition ${
              sezioneAttiva === "spiegazioni"
                ? "border-blue-600 text-blue-600 font-semibold"
                : "border-transparent text-gray-500 hover:text-blue-600"
            }`}
            onClick={() => setSezioneAttiva("spiegazioni")}
          >
            💬 Spiegazioni salvate
          </button>
        </div>
      </div>

      {/* Contenuto condizionato */}
      {sezioneAttiva === "biblioteca" ? (
        <>
          {/* Filtri di ricerca */}
          <div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded p-4 shadow mb-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100">🔍 Ricerca materiale</h2>

            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700"
              >
                <option value="riassunti">📄 Riassunti </option>
              </select>

              <input
                type="text"
                placeholder="Cerca per titolo o contenuto..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700"
              />

              <select
                value={filtroFacolta}
                onChange={(e) => setFiltroFacolta(e.target.value)}
                className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700"
              >
                <option value="">Tutte le facoltà</option>
                {facoltaDisponibili.map(facolta => (
                  <option key={facolta} value={facolta}>{facolta}</option>
                ))}
              </select>

              <select
                value={filtroArgomento}
                onChange={(e) => setFiltroArgomento(e.target.value)}
                className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700"
              >
                <option value="">Tutte le materie</option>
                {materieDisponibili.map(materia => (
                  <option key={materia} value={materia}>{materia}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-between items-center">
              <button
                onClick={handleCerca}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-transform transform hover:-translate-y-1 hover:shadow-lg"
              >
                🔍 Cerca contenuti
              </button>
              
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {riassuntiFiltrati.length} riassunti trovati
              </span>
            </div>
          </div>

          {/* Risultati */}
          <div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded p-4 shadow">
            <h2 className="text-lg font-semibold mb-4">📂 Riassunti </h2>
            
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600 dark:text-gray-400">Caricamento...</span>
              </div>
            ) : riassuntiFiltrati.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-300 text-center py-8">
                {riassunti.length === 0 
                  ? "Nessun riassunto disponibile ancora." 
                  : "Nessun riassunto corrisponde ai filtri selezionati."
                }
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {riassuntiFiltrati.map((riassunto) => (
                  <CardRiassunto
                    key={riassunto.id}
                    riassunto={riassunto}
                    onOpenModal={handleOpenModale}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Modale Riassunto */}
          <ModaleRiassunto
            riassunto={riassuntoAttivo}
            isOpen={mostraModaleRiassunto}
            onClose={handleCloseModale}
            onModifica={handleOpenModifica}
          />

          {/* Modale Modifica */}
          <ModaleModifica
            riassunto={riassuntoAttivo}
            isOpen={mostraModaleModifica}
            onClose={handleCloseModifica}
            onSave={handleSalvaModifica}
          />
        </>
      ) : (
        <SpiegazioniSalvate />
      )}
    </DashboardLayout>
  );
}

BibliotecaPage.requireAuth = true;

// COMPONENTE SpiegazioniSalvate (invariato)
function SpiegazioniSalvate() {
  const [spiegazioni, setSpiegazioni] = useState<
    { titolo: string; creata_il: string; ultima_modifica: string }[]
  >([]);
  const router = useRouter();
  const [spiegazioneAttiva, setSpiegazioneAttiva] = useState<any | null>(null);
  const [mostraModale, setMostraModale] = useState(false);

  useEffect(() => {
    const caricaSpiegazioni = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) return;

      const { data, error } = await supabase
        .from("chat_spiegazioni")
        .select("titolo, creato_il, messaggi")
        .eq("user_id", user?.id)
        .order("creato_il", { ascending: false })

      if (data) {
        setSpiegazioni(
          data.map((s) => ({
            titolo: s.titolo,
            creata_il: new Date(s.creato_il).toLocaleDateString(),
            ultima_modifica: new Date(s.creato_il).toLocaleString(),
            messaggi: s.messaggi,
          }))
        );
      } else {
        console.error("Errore nel caricamento spiegazioni:", error);
      }
    };

    caricaSpiegazioni();
  }, []);

  return (
    <div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded p-4 shadow">
      <h2 className="text-lg font-semibold mb-3">💬 Le tue spiegazioni salvate</h2>

      {spiegazioni.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-300">
          Nessuna spiegazione salvata ancora.
        </p>
      ) : (
        <div className="space-y-4">
          {spiegazioni.map((s, i) => (
            <div
              key={i}
              className="p-4 border border-gray-300 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800 shadow-sm flex justify-between items-center"
            >
              <div>
                <div className="text-blue-700 dark:text-blue-300 font-medium">{s.titolo}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Creata il: {s.creata_il} • Ultima modifica: {s.ultima_modifica}
                </div>
              </div>
              <button
                onClick={() => {
                  setSpiegazioneAttiva(s);
                  setMostraModale(true);
                }}
                className="ml-4 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Visualizza
              </button>
              {mostraModale && spiegazioneAttiva && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center px-4">
                  <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl p-6 space-y-6 transition-all">

                    <button
                      className="absolute top-3 right-3 text-gray-500 hover:text-red-500 text-xl"
                      onClick={() => setMostraModale(false)}
                    >
                      ✖
                    </button>

                    <h2 className="text-2xl font-bold text-blue-600 dark:text-blue-300">
                      💬 {spiegazioneAttiva.titolo}
                    </h2>

                    <div className="flex flex-col gap-4">
                      {spiegazioneAttiva.messaggi?.map((msg: any, index: number) => (
                        <div
                          key={index}
                          className={`p-4 rounded-xl border text-base leading-relaxed shadow-sm ${
                            msg.role === "user"
                              ? "bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700"
                              : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                          }`}
                        >
                          <div className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">
                            {msg.role === "user" ? "🙋‍♂️ Tu" : "🎓 MyUniAgent"}
                          </div>
                          <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none markdown-table">
                            <ReactMarkdown
                              remarkPlugins={[remarkMath, remarkGfm]}
                              rehypePlugins={[rehypeKatex, rehypeHighlight]}
                            >
                              {msg.content}
                            </ReactMarkdown>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 text-sm text-gray-400 dark:text-gray-500 text-right">
                      Ultima modifica: {spiegazioneAttiva.ultima_modifica}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

BibliotecaPage.requireAuth = true;
