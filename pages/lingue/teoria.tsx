import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";
import DashboardLayout from "@/components/DashboardLayout";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";

interface Contenuto {
  id: string;
  argomento: string;
  contenuto: string;
  quiz: any[];
}

const livelli = ["A1", "A2", "B1", "B2", "C1", "C2"];

export default function TeoriaGrammaticale() {
  const router = useRouter();
  const [lingua, setLingua] = useState<string>("");
  const [livello, setLivello] = useState<string>("A1");
  const [contenuti, setContenuti] = useState<Contenuto[]>([]);
  const [risposte, setRisposte] = useState<Record<string, Record<string, string>>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [messaggi, setMessaggi] = useState<Record<string, string>>({});

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
    if (!lingua) return;
    const fetchContenuti = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("teoria_contenuti")
        .select("id, argomento, contenuto, quiz")
        .eq("lingua", lingua)
        .eq("livello", livello)
        .order("argomento", { ascending: true });
      if (!error && data) setContenuti(data);
      setLoading(false);
    };
    fetchContenuti();
  }, [lingua, livello]);

  const handleRispostaChange = (contenutoId: string, domandaIdx: number, valore: string) => {
    setRisposte((prev) => ({
      ...prev,
      [contenutoId]: {
        ...prev[contenutoId],
        [domandaIdx]: valore,
      },
    }));
  };

  const inviaRisposte = async (contenuto: Contenuto) => {
    const { data: session } = await supabase.auth.getUser();
    if (!session.user) return;

    const risposteUtente = Object.entries(risposte[contenuto.id] || {}).map(([idx, risposta]) => {
      const quiz = contenuto.quiz[parseInt(idx)];
      return {
        domanda: quiz.domanda,
        tipo: quiz.tipo,
        opzioni: quiz.opzioni || [],
        risposta_corretta: quiz.risposta,
        risposta_utente: risposta,
      };
    });

    const payload = {
      user_id: session.user.id,
      contenuto_id: contenuto.id,
      lingua,
      livello,
      risposte: risposteUtente,
      stato: "in_attesa",
    };

    const { error } = await supabase.from("teoria_quiz_risposte").insert(payload);

    if (!error) {
      setMessaggi((prev) => ({
        ...prev,
        [contenuto.id]: "✅ Risposte inviate. In attesa di valutazione da Agente Fox.",
      }));
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 bg-white text-blue-700 border border-blue-300 rounded-full px-4 py-2 text-sm font-medium shadow-sm hover:bg-blue-50 transition"
          >
            🔙 Torna alla pagina Lingue
          </button>
        </div>

        {lingua && (
          <h1 className="text-2xl font-bold mb-4">
            📘 Teoria Grammaticale ({lingua.toUpperCase()})
          </h1>
        )}

        <div className="mb-6">
          <label className="block text-sm text-gray-600 mb-1">Seleziona il livello:</label>
          <select
            value={livello}
            onChange={(e) => setLivello(e.target.value)}
            className="border px-3 py-2 rounded-md"
          >
            {livelli.map((lvl) => (
              <option key={lvl} value={lvl}>{lvl}</option>
            ))}
          </select>
        </div>

        {loading && <p className="text-gray-500">Caricamento contenuti...</p>}

        {!loading && contenuti.length === 0 && (
          <p className="text-gray-500">Nessun contenuto disponibile per questo livello.</p>
        )}

        <div className="space-y-10">
          {contenuti.map((item) => (
            <div key={item.id} className="p-4 border rounded-md bg-white shadow">
              <h2 className="text-lg font-semibold mb-2">📍 {item.argomento}</h2>

              <div className="prose max-w-none">
                <ReactMarkdown rehypePlugins={[rehypeRaw, rehypeSanitize]}>
                  {item.contenuto}
                </ReactMarkdown>
              </div>

              {Array.isArray(item.quiz) && item.quiz.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-medium mb-2">📝 Quiz</h3>
                  <div className="space-y-4">
                    {item.quiz.map((q: any, idx: number) => (
                      <div key={idx} className="border p-3 rounded">
                        <p className="text-sm font-medium mb-1">{q.domanda}</p>
                        {q.tipo === "multipla" ? (
                          <div className="space-y-1">
                            {q.opzioni.map((opt: string, oidx: number) => (
                              <label key={oidx} className="block text-sm">
                                <input
                                  type="radio"
                                  name={`quiz-${item.id}-${idx}`}
                                  value={opt}
                                  checked={risposte[item.id]?.[idx] === opt}
                                  onChange={(e) => handleRispostaChange(item.id, idx, e.target.value)}
                                  className="mr-2"
                                />
                                {opt}
                              </label>
                            ))}
                          </div>
                        ) : (
                          <textarea
                            rows={2}
                            className="w-full border mt-1 p-2 rounded"
                            placeholder="Scrivi la tua risposta"
                            value={risposte[item.id]?.[idx] || ""}
                            onChange={(e) => handleRispostaChange(item.id, idx, e.target.value)}
                          />
                        )}
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => inviaRisposte(item)}
                    className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    Invia risposte
                  </button>

                  {messaggi[item.id] && (
                    <p className="text-green-600 text-sm mt-2">{messaggi[item.id]}</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
