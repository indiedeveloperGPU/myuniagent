import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";
import DashboardLayout from "@/components/DashboardLayout";

interface DomandaQuiz {
  tipo: "singola" | "multipla" | "aperta";
  domanda: string;
  opzioni: string[];
  risposta: string | string[];
}

interface Test {
  id: string;
  titolo: string;
  livello: string;
  contenuto: DomandaQuiz[];
}

const livelli = ["A1", "A2", "B1", "B2", "C1", "C2"];

export default function Certificazioni() {
  const router = useRouter();
  const [lingua, setLingua] = useState<string>("");
  const [livello, setLivello] = useState<string>("A1");
  const [tests, setTests] = useState<Test[]>([]);
  const [completati, setCompletati] = useState<Set<string>>(new Set());
  const [testSelezionato, setTestSelezionato] = useState<Test | null>(null);
  const [risposte, setRisposte] = useState<Record<number, string | string[]>>({});
  const [messaggio, setMessaggio] = useState<string>("");
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
    const fetchTests = async () => {
      setLoading(true);
      const session = await supabase.auth.getUser();
      const user = session.data?.user;
      if (!user) return;

      const [{ data: testData }, { data: completatiData }] = await Promise.all([
        supabase
          .from("certificazioni_test")
          .select("id, titolo, livello, contenuto")
          .eq("lingua", lingua)
          .eq("livello", livello)
          .order("titolo", { ascending: true }),

        supabase
          .from("certificazioni_risposte")
          .select("test_id")
          .eq("user_id", user.id)
          .eq("stato", "corretto")
      ]);

      if (testData) {
        const ordinati = [...testData].sort((a, b) => {
          const numA = parseInt(a.titolo.split(".")[0]);
          const numB = parseInt(b.titolo.split(".")[0]);
          return numA - numB;
        });
        setTests(ordinati);
      }

      if (completatiData) {
        const ids = completatiData.map((t) => t.test_id);
        setCompletati(new Set(ids));
      }
      setLoading(false);
    };
    fetchTests();
  }, [lingua, livello]);

  const handleChange = (index: number, value: string | string[]) => {
    setRisposte((prev) => ({ ...prev, [index]: value }));
  };

  const toggleCheckbox = (index: number, option: string) => {
    const current = risposte[index] as string[] || [];
    const updated = current.includes(option)
      ? current.filter((o) => o !== option)
      : [...current, option];
    setRisposte((prev) => ({ ...prev, [index]: updated }));
  };

  const inviaTest = async () => {
    if (!testSelezionato) return;
    const { data: session } = await supabase.auth.getUser();
    if (!session.user) return;

    const payload = {
      user_id: session.user.id,
      test_id: testSelezionato.id,
      lingua,
      livello,
      risposte: testSelezionato.contenuto.map((domanda, index) => ({
        domanda: domanda.domanda,
        tipo: domanda.tipo,
        risposta: risposte[index] || (domanda.tipo === "multipla" ? [] : "")
      })),
      stato: "in_attesa"
    };

    const { error } = await supabase.from("certificazioni_risposte").insert(payload);
    if (!error) setMessaggio("✅ Test inviato. In attesa di correzione da Agente Fox.");
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

          <h2 className="text-lg font-semibold mb-3">🎓 Test disponibili ({livello})</h2>
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
            {tests.map((t, idx) => (
              <li key={t.id}>
                <button
                  onClick={() => setTestSelezionato(t)}
                  className={`w-full text-left px-3 py-2 rounded-md border flex items-center justify-between ${testSelezionato?.id === t.id ? 'bg-blue-100 font-semibold' : 'bg-white hover:bg-gray-100'}`}
                >
                  <span>🧩 {idx + 1}. {t.titolo}</span>
                  {completati.has(t.id) && <span className="text-green-600">✔️</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Contenuto test selezionato */}
        <div className="w-3/4">
          {loading && <p className="text-gray-500">Caricamento test...</p>}

          {!loading && tests.length === 0 && (
            <p className="text-gray-500">Nessun test disponibile per questo livello.</p>
          )}

          {!loading && tests.length > 0 && testSelezionato && (
            <div className="bg-white p-6 rounded shadow space-y-6">
              <h2 className="text-xl font-bold mb-4">🧩 {testSelezionato.titolo}</h2>

              {testSelezionato.contenuto.map((d, idx) => (
                <div key={idx} className="border p-4 rounded shadow-sm">
                  <p className="font-semibold mb-2">{idx + 1}. {d.domanda}</p>

                  {d.tipo === "aperta" && (
                    <textarea
                      rows={4}
                      className="w-full border p-2 rounded"
                      value={risposte[idx] as string || ""}
                      onChange={(e) => handleChange(idx, e.target.value)}
                      placeholder="Scrivi la tua risposta qui..."
                    />
                  )}

                  {d.tipo === "singola" && d.opzioni.map((op, j) => (
                    <div key={j} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`domanda-${idx}`}
                        checked={risposte[idx] === op}
                        onChange={() => handleChange(idx, op)}
                      />
                      <label>{op}</label>
                    </div>
                  ))}

                  {d.tipo === "multipla" && d.opzioni.map((op, j) => (
                    <div key={j} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={(risposte[idx] as string[] || []).includes(op)}
                        onChange={() => toggleCheckbox(idx, op)}
                      />
                      <label>{op}</label>
                    </div>
                  ))}
                </div>
              ))}

              <button
                onClick={inviaTest}
                className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Invia il test
              </button>

              {messaggio && (
                <p className="text-green-600 text-sm mt-3">{messaggio}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

