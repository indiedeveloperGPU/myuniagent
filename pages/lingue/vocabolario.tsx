import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";
import DashboardLayout from "@/components/DashboardLayout";

interface Parola {
  parola: string;
  traduzione: string;
  esempio: string;
}

interface VocabolarioItem {
  id: string;
  tema: string;
  parole: Parola[];
  quiz: any;
}

const livelli = ["A1", "A2", "B1", "B2", "C1", "C2"];

export default function Vocabolario() {
  const router = useRouter();
  const [lingua, setLingua] = useState<string>("");
  const [livello, setLivello] = useState<string>("A1");
  const [vocabolario, setVocabolario] = useState<VocabolarioItem[]>([]);
  const [risposte, setRisposte] = useState<Record<string, Record<string, string>>>({});
  const [messaggi, setMessaggi] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const fetchLingua = async () => {
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
    fetchLingua();
  }, []);

  useEffect(() => {
    if (!lingua) return;
    const fetchVocabolario = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("vocabolario")
        .select("id, tema, parole, quiz")
        .eq("lingua", lingua)
        .eq("livello", livello)
        .order("tema", { ascending: true });
      if (!error && data) setVocabolario(data);
      setLoading(false);
    };
    fetchVocabolario();
  }, [lingua, livello]);

  const handleRispostaChange = (itemId: string, domandaIdx: number, valore: string) => {
    setRisposte((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [domandaIdx]: valore,
      },
    }));
  };

  const inviaRisposte = async (item: VocabolarioItem) => {
    const { data: session } = await supabase.auth.getUser();
    if (!session.user) return;

    const payload = {
      user_id: session.user.id,
      vocabolario_id: item.id,
      lingua,
      livello,
      tema: item.tema,
      risposte: risposte[item.id] || {},
      stato: "in_attesa"
    };

    const { error } = await supabase.from("vocabolario_risposte").insert(payload);

    if (!error) {
      setMessaggi((prev) => ({ ...prev, [item.id]: "✅ Risposte inviate. In attesa di valutazione da Agente Fox." }));
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
          <h1 className="text-2xl font-bold mb-4">📖 Vocabolario Tematico ({lingua.toUpperCase()})</h1>
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

        {loading && <p className="text-gray-500">Caricamento vocabolario...</p>}

        {!loading && vocabolario.length === 0 && (
          <p className="text-gray-500">Nessun vocabolario disponibile per questo livello.</p>
        )}

        <div className="space-y-8">
          {vocabolario.map((item) => (
            <div key={item.id} className="p-4 border rounded-md bg-white shadow">
              <h2 className="text-lg font-semibold mb-3">📌 Tema: {item.tema}</h2>
              <ul className="list-disc list-inside space-y-1 mb-4">
                {item.parole.map((p, idx) => (
                  <li key={idx}>
                    <strong>{p.parola}</strong> – {p.traduzione}<br />
                    <em className="text-gray-600 text-sm">{p.esempio}</em>
                  </li>
                ))}
              </ul>

              {item.quiz && (
                <div className="mt-4">
                  <h3 className="font-medium mb-2">📝 Quiz</h3>
                  <div className="space-y-3">
                    {item.quiz.map((q: any, idx: number) => (
                      <div key={idx}>
                        <p className="text-sm font-medium">{q.domanda}</p>
                        {q.tipo === "multipla" ? (
                          <div className="mt-1 space-y-1">
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


