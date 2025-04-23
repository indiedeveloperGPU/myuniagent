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
      const { data, error } = await supabase
        .from("certificazioni_test")
        .select("id, titolo, livello, contenuto")
        .eq("lingua", lingua)
        .eq("livello", livello)
        .order("titolo", { ascending: true });
      if (!error && data) setTests(data);
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
          <h1 className="text-2xl font-bold mb-4">🎓 Simulazione Certificazione ({lingua.toUpperCase()})</h1>
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

        {!testSelezionato ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 mb-2">Seleziona un test disponibile:</p>
            {tests.map((t) => (
              <button
                key={t.id}
                onClick={() => setTestSelezionato(t)}
                className="block w-full text-left p-3 border rounded-md hover:bg-gray-50"
              >
                🧩 {t.titolo} ({t.livello})
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
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
    </DashboardLayout>
  );
}


