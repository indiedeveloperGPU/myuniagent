import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import DashboardLayout from "@/components/DashboardLayout";

function AnalyzeTesiPage() {
  const [fileUtente, setFileUtente] = useState<any[]>([]);
  const [fileSelezionato, setFileSelezionato] = useState<string>("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<string>("");

  useEffect(() => {
    const fetchFiles = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      if (userId) {
        const { data, error } = await supabase
          .from("uploaded_files")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        if (!error && data) {
          setFileUtente(data);
        }
      }
    };

    fetchFiles();
  }, []);

  const eseguiAnalisi = async (tipo: string) => {
    if (!fileSelezionato) {
      setError("Seleziona un file prima di avviare l'analisi");
      return;
    }

    if (tipo === "completa") {
      const conferma = confirm(
        "⚠️ L'analisi completa è un processo lungo e costoso in termini di token. Procedere solo quando la tesi è completata.\n\nVuoi continuare?"
      );
      if (!conferma) return;
    }

    setLoading(true);
    setError("");
    setResult("");
    setStep(tipo);

    try {
      const res = await fetch("/api/analyze-tesi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: fileSelezionato, type: tipo }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore durante l'analisi");

      setResult(data.result);


      // Scroll verso il risultato
      setTimeout(() => {
        const el = document.getElementById("risultatoPDF");
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }, 200);
    } catch (err: any) {
      setError(err.message || "Errore durante l'analisi");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    const html2pdf = (await import("html2pdf.js")).default;
    const element = document.getElementById("risultatoPDF");

    if (element) {
      html2pdf().from(element).save(`analisi-${step}.pdf`);
    }
  };

  return (
    <>
      <h1 className="text-2xl font-bold mb-6">📄 Analizza la tua tesi</h1>

      <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-900 p-4 rounded mb-6">
        <h2 className="font-semibold text-lg mb-1">ℹ️ Guida all'analisi tesi</h2>
        <p className="text-sm">
          Puoi eseguire analisi mirate su specifici aspetti della tua tesi (struttura, metodologia, linguaggio, ecc).
          Ogni analisi fornisce un report dettagliato utile per migliorare il lavoro.
        </p>
        <p className="mt-2 text-sm font-medium">
          ⚠️ L'analisi completa è consigliata solo quando hai terminato la stesura: è più lunga e usa molte risorse.
        </p>
      </div>

      <div className="mb-4">
        <label className="block font-medium mb-2">Seleziona un file caricato:</label>
        <select
          className="w-full border rounded p-2"
          value={fileSelezionato}
          onChange={(e) => setFileSelezionato(e.target.value)}
        >
          <option value="">-- Seleziona una tesi --</option>
          {fileUtente.map((file) => (
            <option key={file.id} value={file.filename}>
              {file.filename}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <button onClick={() => eseguiAnalisi("generale")} className="bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700">
          🔍 Analisi generale
        </button>
        <button onClick={() => eseguiAnalisi("struttura")} className="bg-indigo-600 text-white py-2 px-4 rounded hover:bg-indigo-700">
          📚 Struttura
        </button>
        <button onClick={() => eseguiAnalisi("metodologia")} className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700">
          🧠 Metodologia
        </button>
        <button onClick={() => eseguiAnalisi("linguaggio")} className="bg-yellow-500 text-white py-2 px-4 rounded hover:bg-yellow-600">
          🖊️ Linguaggio
        </button>
        <button onClick={() => eseguiAnalisi("bibliografia")} className="bg-orange-600 text-white py-2 px-4 rounded hover:bg-orange-700">
          🔍 Bibliografia
        </button>
        <button onClick={() => eseguiAnalisi("plagio")} className="bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700">
          🧬 Anti-plagio (demo)
        </button>
        <button
          onClick={() => eseguiAnalisi("completa")}
          className="bg-black text-white py-2 px-4 rounded hover:bg-gray-800"
          disabled={!fileSelezionato}
          title="Consigliata solo dopo aver completato la tesi"
        >
          🧾 Analisi completa
        </button>
      </div>

      {error && <p className="text-red-600 mt-4 text-center">{error}</p>}
      {loading && <p className="text-gray-700 mb-4">Analisi in corso ({step})...</p>}

      {/* Placeholder se ancora nessun risultato */}
      {!result && !loading && (
        <div className="mt-6 bg-gray-50 border border-dashed rounded-lg p-6 text-center text-gray-500">
          🧾 I risultati dell’analisi appariranno qui dopo l’elaborazione.
        </div>
      )}

      {result && (
        <div id="risultatoPDF" className="mt-6 bg-gray-100 border rounded-lg p-4 whitespace-pre-line">
          <h2 className="text-lg font-semibold mb-2">🧾 Risultato ({step}):</h2>
          <p>{result}</p>
          <button
            onClick={handleDownloadPDF}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            ⬇️ Scarica in PDF
          </button>
        </div>
      )}
    </>
  );
}

AnalyzeTesiPage.requireAuth = true;
AnalyzeTesiPage.getLayout = (page: React.ReactNode) => (
  <DashboardLayout>{page}</DashboardLayout>
);

export default AnalyzeTesiPage;



