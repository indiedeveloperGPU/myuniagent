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
  introduzione?: string;
  parole: Parola[];
  quiz: any;
  ordine: number;
}

const livelli = ["A1", "A2", "B1", "B2", "C1", "C2"];

export default function Vocabolario() {
  const router = useRouter();
  const [lingua, setLingua] = useState<string>("");
  const [livello, setLivello] = useState<string>("A1");
  const [vocabolario, setVocabolario] = useState<VocabolarioItem[]>([]);
  const [completati, setCompletati] = useState<Set<string>>(new Set());
  const [selezionato, setSelezionato] = useState<string | null>(null);
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
    const fetchData = async () => {
      setLoading(true);
      const session = await supabase.auth.getUser();
      const user = session.data?.user;
      if (!user) return;

      const [{ data: vocabolarioData }, { data: completatiData }] = await Promise.all([
        supabase
          .from("vocabolario")
          .select("id, tema, parole, quiz, introduzione, ordine")
          .eq("lingua", lingua)
          .eq("livello", livello)
          .order("ordine", { ascending: true }),

        supabase
          .from("vocabolario_risposte")
          .select("contenuto_id")
          .eq("user_id", user.id)
          .eq("stato", "corretto")
      ]);

      if (vocabolarioData) setVocabolario(vocabolarioData);
      if (completatiData) {
        const ids = completatiData.map((c) => c.contenuto_id);
        setCompletati(new Set(ids));
      }
      setLoading(false);
    };
    fetchData();
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
      contenuto_id: item.id,
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
      <div className="flex gap-6">
        {/* Sidebar sinistra */}
        <div className="w-1/4 border-r pr-4">
          <button
            onClick={() => router.back()}
            className="mb-4 inline-flex items-center gap-2 bg-white text-blue-700 border border-blue-300 rounded-full px-4 py-2 text-sm font-medium shadow-sm hover:bg-blue-50 transition"
          >
            🔙 Torna alla pagina Lingue
          </button>

          <h2 className="text-lg font-semibold mb-3">📚 Temi disponibili ({livello})</h2>
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
  {Object.values(
    vocabolario.reduce((acc, curr) => {
      const key = curr.tema;
      const isCompletato = completati.has(curr.id);

      if (!acc[key]) acc[key] = [];
      acc[key].push({ ...curr, completato: isCompletato });
      return acc;
    }, {} as Record<string, Array<VocabolarioItem & { completato: boolean }>>)
  )
    .map((moduli) => {
      const ordinati = [...moduli].sort((a, b) => (a.ordine ?? 0) - (b.ordine ?? 0));
      const prossimo = ordinati.find((m) => !m.completato);
      return prossimo;
    })
    .filter((v): v is VocabolarioItem & { completato: boolean } => v !== undefined)
    .map((v) => {
      const variantiTotali = vocabolario.filter(m => m.tema === v.tema).length;
      return (
        <li key={v.id}>
          <button
            onClick={() => setSelezionato(v.id)}
            className={`w-full text-left px-3 py-2 rounded-md border flex flex-col items-start ${
              selezionato === v.id ? 'bg-blue-100 font-semibold' : 'bg-white hover:bg-gray-100'
            }`}
          >
            <span className="text-sm font-medium">📌 {v.tema}</span>
            <span className="text-xs text-gray-600">Variante {v.ordine} di {variantiTotali}</span>
          </button>
        </li>
      );
    })}
</ul>

        </div>

        {/* Contenuto vocabolario selezionato */}
        <div className="w-3/4">
          {loading && <p className="text-gray-500">Caricamento vocabolario...</p>}

          {!loading && vocabolario.length === 0 && (
            <p className="text-gray-500">Nessun vocabolario disponibile per questo livello.</p>
          )}

          {!loading && vocabolario.length > 0 && selezionato && (
            <div className="bg-white p-6 rounded shadow">
              {vocabolario.filter((v) => v.id === selezionato).map((item) => (
                <div key={item.id}>
                  <h2 className="text-xl font-bold mb-1">📌 {item.tema}</h2>
                  {item.introduzione && (
                    <p className="text-gray-600 text-sm italic mb-3">{item.introduzione}</p>
                  )}
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
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

Vocabolario.requireAuth = true


