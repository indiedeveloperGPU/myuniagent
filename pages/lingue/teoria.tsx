import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/lib/supabaseClient";
import { Document, Packer, Paragraph } from "docx";
import { saveAs } from "file-saver";
import html2pdf from "html2pdf.js";

export default function TeoriaGrammaticale() {
  const [input, setInput] = useState("");
  const [livello, setLivello] = useState("B1");
  const [result, setResult] = useState("");
  const [quiz, setQuiz] = useState<any[]>([]);
  const [risposte, setRisposte] = useState<string[]>([]);
  const [punteggio, setPunteggio] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [userChecked, setUserChecked] = useState(false);
  const [docTitle, setDocTitle] = useState("");
  const [saved, setSaved] = useState(false);
  const [lingua, setLingua] = useState<"en" | "fr" | "es">("en");

  const livelliPerLingua: Record<string, string[]> = {
    en: ["A1", "A2", "B1", "B2", "C1", "C2"],
    fr: ["A1", "A2", "B1", "B2", "C1", "C2"],
    es: ["A1", "A2", "B1", "B2", "C1", "C2"],
  };

  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        window.location.href = "/auth";
        return;
      }
      setUserChecked(true);
    };
    checkAuth();
  }, []);

  const handleSubmit = async () => {
    if (!input) return;
    setLoading(true);
    setResult("");
    setQuiz([]);
    setRisposte([]);
    setPunteggio(null);
    setSaved(false);

    const res = await fetch("/api/inglese", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input,
        livello,
        lingua,
        mode: "theory",
      }),
    });

    const data = await res.json();

    const parts = data.result.split("```json");
    const spiegazione = parts[0].trim();
    let quizParsed: any[] = [];

    try {
      if (parts[1]) {
        const json = parts[1].replace("```", "").trim();
        const parsed = JSON.parse(json);
        quizParsed = parsed.quiz || [];
      }
    } catch (e) {
      console.error("Errore parsing quiz:", e);
    }

    const titolo = input
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim();

    setDocTitle(titolo);
    setResult(spiegazione);
    setQuiz(quizParsed);
    await saveToSupabase(titolo, spiegazione);
    setLoading(false);
  };

  const saveToSupabase = async (title: string, content: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("teoria_grammaticale").insert([
      {
        user_id: user.id,
        titolo: title,
        contenuto: content,
        livello,
      },
    ]);

    if (!error) setSaved(true);
  };

  const handleQuizChange = (index: number, risposta: string) => {
    const updated = [...risposte];
    updated[index] = risposta;
    setRisposte(updated);
  };

  const calcolaPunteggio = async () => {
    let corrette = 0;
    quiz.forEach((q, i) => {
      if (q.corretta === risposte[i]) corrette++;
    });
    const percentuale = Math.round((corrette / quiz.length) * 100);
    setPunteggio(percentuale);
    await savePunteggio(percentuale);
  };

  const savePunteggio = async (score: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("teoria_risultati").insert([
      {
        user_id: user.id,
        argomento: docTitle,
        punteggio: score,
      },
    ]);
  };

  const handleExportPDF = async () => {
    const element = document.getElementById("result-box");
    if (!element) return;

    const opt = {
      margin: 0.5,
      filename: `${docTitle}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
    };

    html2pdf().set(opt).from(element).save();
  };

  const handleExportDocx = async () => {
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({ text: docTitle, heading: "Heading1" }),
            new Paragraph({ text: new Date().toLocaleString(), spacing: { after: 200 } }),
            ...result.split("\n").map((line) => new Paragraph(line)),
          ],
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${docTitle}.docx`);
  };

  const handleSpeak = () => {
    const utterance = new SpeechSynthesisUtterance(result);
    utterance.lang = "en-US";
    utterance.rate = 1;
    speechSynthesis.speak(utterance);
  };

  if (!userChecked) {
    return (
      <DashboardLayout>
        <p>Caricamento in corso...</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold mb-4">📚 Teoria Grammaticale</h1>
      <p className="text-gray-700 mb-6">
        Inserisci un argomento grammaticale e riceverai una spiegazione completa con quiz, personalizzata in base alla lingua e al livello.
      </p>

      {/* BOX INFORMATIVO */}
      <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-900 p-4 rounded mb-6">
        <h2 className="font-semibold text-lg mb-1">ℹ️ Guida Informativa</h2>
        <p className="text-sm">
          Scrivi un argomento grammaticale (es: Present Perfect, Condicional, Futur Simple...) e scegli lingua e livello.
        </p>
        <p className="mt-2 text-sm font-medium">
          📊 Il tuo punteggio verrà salvato nel profilo.
        </p>
      </div>

      <div className="mb-4 space-y-2">
        <div className="flex flex-col md:flex-row gap-2">
          <input
            type="text"
            placeholder="Es: Present Perfect, Subjonctif, Pretérito..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="border rounded px-3 py-2 w-full"
          />
          <select
            value={lingua}
            onChange={(e) => {
              const lang = e.target.value as "en" | "fr" | "es";
              setLingua(lang);
              setLivello(livelliPerLingua[lang][0]);
            }}
            className="border rounded px-3 py-2"
          >
            <option value="en">🇬🇧 Inglese</option>
            <option value="fr">🇫🇷 Francese</option>
            <option value="es">🇪🇸 Spagnolo</option>
          </select>
          <select
            value={livello}
            onChange={(e) => setLivello(e.target.value)}
            className="border rounded px-3 py-2"
          >
            {livelliPerLingua[lingua].map((lvl) => (
              <option key={lvl} value={lvl}>{lvl}</option>
            ))}
          </select>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            {loading ? "Attendi..." : "Spiega"}
          </button>
        </div>
      </div>

      {result && (
        <>
          <div
            id="result-box"
            className="mt-6 bg-white border p-4 rounded shadow whitespace-pre-line text-gray-800"
          >
            <h2 className="text-xl font-semibold mb-3">{docTitle}</h2>
            <p className="text-sm text-gray-500 mb-4">
              Lingua: {lingua.toUpperCase()} – Livello: {livello} – {new Date().toLocaleString()}
            </p>
            {result}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={handleExportPDF} className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">
              ⬇️ Esporta in PDF
            </button>
            <button onClick={handleExportDocx} className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700">
              📄 Esporta in DOCX
            </button>
            <button onClick={handleSpeak} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
              🔊 Ascolta la spiegazione
            </button>
          </div>

          {saved && (
            <p className="text-green-600 mt-2">✅ Spiegazione salvata correttamente</p>
          )}
        </>
      )}

      {quiz.length > 0 && (
        <div className="mt-10">
          <h2 className="text-xl font-bold mb-4">🧪 Quiz di verifica</h2>
          {quiz.map((q, index) => (
            <div key={index} className="mb-4">
              <p className="font-semibold">{index + 1}. {q.domanda}</p>
              <div className="flex flex-col gap-1 mt-1">
                {q.opzioni.map((opt: string, i: number) => (
                  <label key={i} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`quiz-${index}`}
                      value={opt}
                      checked={risposte[index] === opt}
                      onChange={() => handleQuizChange(index, opt)}
                    />
                    {opt}
                  </label>
                ))}
              </div>
            </div>
          ))}
          {!punteggio ? (
            <button onClick={calcolaPunteggio} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
              ✅ Verifica risposte
            </button>
          ) : (
            <p className="mt-4 text-green-700 font-semibold text-lg">
              Risultato: {punteggio}% ✅
            </p>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}

TeoriaGrammaticale.requireAuth = true;
