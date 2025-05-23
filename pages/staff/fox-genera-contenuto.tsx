import { useState, useMemo } from "react";
import StaffLayout from "@/components/StaffLayout";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "react-hot-toast";
import QuizBuilder from "@/components/QuizBuilder";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";


export default function AdminLingueUpload() {
  const [tipo, setTipo] = useState("teoria");
  const [lingua, setLingua] = useState("inglese");
  const [livello, setLivello] = useState("A1");
  const [titolo, setTitolo] = useState("");
  const [argomento, setArgomento] = useState("");
  const [contenuto, setContenuto] = useState("");
  const [ordine, setOrdine] = useState<number>(1);
  const [quizManuale, setQuizManuale] = useState<boolean>(false);
  const [quizRaw, setQuizRaw] = useState<string>("[]");
  const [loading, setLoading] = useState(false);

  const quizValidation = useMemo(() => {
    if (quizRaw.length === 0) return { valido: true as const };
    try {
      const parsed = JSON.parse(quizRaw);
      if (!Array.isArray(parsed)) return { valido: false as const, errore: "Il JSON deve essere un array." };
      return { valido: true as const };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { valido: false as const, errore: "Errore di parsing JSON: " + message };
    }
  }, [quizRaw]);

  const handleSubmit = async () => {
    setLoading(true);
    const payload: any = {
      lingua,
      livello,
      titolo,
      argomento,
      contenuto,
      ordine,
      quiz: quizRaw.length > 0 ? JSON.parse(quizRaw) : undefined,
    };

    let res;
    if (tipo === "teoria") {
      res = await supabase.from("teoria_contenuti").insert(payload);
    } else if (tipo === "vocabolario") {
      res = await supabase.from("vocabolario").insert(payload);
    } else if (tipo === "certificazioni") {
      res = await supabase.from("certificazioni_test").insert(payload);
    }

    setLoading(false);

    if (res?.error) {
      toast.error("Errore nel caricamento: " + res.error.message);
    } else {
      toast.success("Contenuto caricato con successo!");
      setTitolo("");
      setArgomento("");
      setContenuto("");
      setQuizRaw("[]");
      setOrdine(prev => prev + 1);
    }
  };

  return (
    <StaffLayout>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">🧠 Carica contenuti (Lingue)</h1>

        <div className="space-y-4">
          {/* Tipo, Lingua, Ordine */}
          <div className="grid grid-cols-3 gap-4">
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
              <label className="block text-sm font-medium">Ordine</label>
              <input
                type="number"
                value={ordine}
                onChange={(e) => setOrdine(parseInt(e.target.value) || 1)}
                className="w-full border p-2 rounded"
              />
            </div>
          </div>

          {/* Livello, Titolo, Argomento */}
          <div className="grid grid-cols-3 gap-4">
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
            <div>
              <label className="block text-sm font-medium">Argomento</label>
              <input value={argomento} onChange={(e) => setArgomento(e.target.value)} className="w-full border p-2 rounded" />
            </div>
          </div>

          {/* Contenuto Markdown */}
          {(tipo === "teoria" || tipo === "vocabolario") && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Contenuto (spiegazione o parole)</label>
                <textarea
                  value={contenuto}
                  onChange={(e) => setContenuto(e.target.value)}
                  className="w-full border p-2 rounded h-40"
                  placeholder="Scrivi qui il contenuto testuale..."
                />
              </div>

              {contenuto && (
                <div className="mt-6 border-t pt-4">
                  <h3 className="text-sm font-semibold mb-2">📄 Anteprima contenuto:</h3>
                  <div className="prose-lg max-w-none bg-white border p-4 rounded shadow-sm">
                    <ReactMarkdown rehypePlugins={[rehypeRaw, rehypeSanitize]} remarkPlugins={[remarkGfm]} children={contenuto}/>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Quiz Builder / JSON Raw */}
          <div>
            <label className="block text-sm font-medium mb-2">Quiz</label>
            <div className="mb-2">
              <label className="mr-4">
                <input type="radio" checked={!quizManuale} onChange={() => setQuizManuale(false)} /> Builder
              </label>
              <label>
                <input type="radio" checked={quizManuale} onChange={() => setQuizManuale(true)} /> JSON Raw
              </label>
            </div>
            {quizManuale ? (
              <textarea
                rows={8}
                value={quizRaw}
                onChange={(e) => setQuizRaw(e.target.value)}
                placeholder='Inserisci JSON array, es: [{"tipo":"multipla","domanda":"...","opzioni":[...],"risposta":[...]}]'
                className="w-full border p-2 rounded"
              />
            ) : (
              <QuizBuilder onChange={(json) => setQuizRaw(JSON.stringify(json, null, 2))} />
            )}
            {!quizValidation.valido && (
              <p className="text-red-600 text-sm mt-2">{quizValidation.errore}</p>
            )}
            {quizValidation.valido && quizRaw.length > 0 && (
              <p className="text-green-600 text-sm mt-2">✔ JSON valido!</p>
            )}
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading || !quizValidation.valido}
            className={`px-4 py-2 rounded text-white ${loading || !quizValidation.valido ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}
          >
            {loading ? "Caricamento..." : "Carica contenuto"}
          </button>
        </div>
      </div>
    </StaffLayout>
  );
}

AdminLingueUpload.requireAuth = true;
