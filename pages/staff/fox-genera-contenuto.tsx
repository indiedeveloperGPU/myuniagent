import { useState, useMemo } from "react";
import StaffLayout from "@/components/StaffLayout";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "react-hot-toast";
import QuizBuilder from "@/components/QuizBuilder";

export default function AdminLingueUpload() {
  const [tipo, setTipo] = useState("teoria");
  const [lingua, setLingua] = useState("inglese");
  const [livello, setLivello] = useState("A1");
  const [titolo, setTitolo] = useState("");
  const [contenuto, setContenuto] = useState("");
  const [quiz, setQuiz] = useState("");
  const [loading, setLoading] = useState(false);

  const quizValidation = useMemo(() => {
    if (quiz.length === 0) return { valido: true };
    try {
      const parsed = JSON.parse(quiz);
      if (!Array.isArray(parsed)) return { valido: false, errore: "Il JSON deve essere un array." };
      return { valido: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { valido: false, errore: "Errore di parsing JSON: " + message };
    }
  }, [quiz]);

  const handleSubmit = async () => {
    setLoading(true);
    let res;
    const payload = {
      lingua,
      livello,
      titolo,
      contenuto,
      quiz: quiz.length > 0 ? JSON.parse(quiz) : null,
    };

    if (tipo === "teoria") {
      res = await supabase.from("teoria_contenuti").insert(payload);
    } else if (tipo === "vocabolario") {
      res = await supabase.from("vocabolario").insert(payload);
    } else if (tipo === "certificazioni") {
      try {
        const parsed = JSON.parse(quiz);
        res = await supabase.from("certificazioni_test").insert({ ...payload, contenuto: parsed });
      } catch (e) {
        toast.error("JSON non valido per il campo 'quiz'.");
        setLoading(false);
        return;
      }
    }

    setLoading(false);
    if (res?.error) {
      toast.error("Errore nel caricamento: " + res.error.message);
    } else {
      toast.success("Contenuto caricato con successo!");
      setTitolo("");
      setContenuto("");
      setQuiz("");
    }
  };

  return (
    <StaffLayout>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">🧠 Carica contenuti (Lingue)</h1>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium">Tipo</label>
              <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="w-full border p-2 rounded">
                <option value="teoria">📘 Teoria</option>
                <option value="vocabolario">🧠 Vocabolario</option>
                <option value="certificazioni">🎓 Certificazione</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium">Lingua</label>
              <select value={lingua} onChange={(e) => setLingua(e.target.value)} className="w-full border p-2 rounded">
                <option value="inglese">Inglese</option>
                <option value="francese">Francese</option>
                <option value="spagnolo">Spagnolo</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium">Livello</label>
              <select value={livello} onChange={(e) => setLivello(e.target.value)} className="w-full border p-2 rounded">
                {["A1", "A2", "B1", "B2", "C1", "C2"].map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium">Titolo</label>
              <input value={titolo} onChange={(e) => setTitolo(e.target.value)} className="w-full border p-2 rounded" />
            </div>
          </div>

          {(tipo === "teoria" || tipo === "vocabolario") && (
            <div>
              <label className="block text-sm font-medium mb-1">Contenuto (spiegazione o parole)</label>
              <textarea
                value={contenuto}
                onChange={(e) => setContenuto(e.target.value)}
                className="w-full border p-2 rounded h-40"
                placeholder="Scrivi qui il contenuto testuale..."
              />
            </div>
          )}

          {(tipo === "teoria" || tipo === "vocabolario" || tipo === "certificazioni") && (
            <div>
              <label className="block text-sm font-medium mb-2">Quiz (costruisci o lascia vuoto)</label>
              <QuizBuilder onChange={(json) => setQuiz(json)} />
              {!quizValidation.valido && (
                <p className="text-red-600 text-sm mt-2">{quizValidation.errore}</p>
              )}
              {quizValidation.valido && quiz.length > 0 && (
                <p className="text-green-600 text-sm mt-2">✔ JSON valido!</p>
              )}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading || (tipo === "certificazioni" && !quizValidation.valido)}
            className={`px-4 py-2 rounded text-white ${loading || (tipo === "certificazioni" && !quizValidation.valido) ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}
          >
            {loading ? "Caricamento..." : "Carica contenuto"}
          </button>
        </div>
      </div>
    </StaffLayout>
  );
}



