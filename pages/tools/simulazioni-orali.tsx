import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/lib/supabaseClient";

export default function SimulazioniOraliPage() {
  const [materia, setMateria] = useState("");
  const [argomento, setArgomento] = useState("");
  const [risposta, setRisposta] = useState("");
  const [loading, setLoading] = useState(false);
  const [errore, setErrore] = useState("");
  const [userChecked, setUserChecked] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        window.location.href = "/auth";
        return;
      }
      setUserChecked(true);
    };
    checkUser();
  }, []);

  const generaSimulazione = async () => {
    if (!materia || !argomento) {
      setErrore("Inserisci sia la materia che l’argomento.");
      return;
    }

    setLoading(true);
    setRisposta("");
    setErrore("");

    try {
      const res = await fetch("/api/simulazioni-orali", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ materia, argomento }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore nella simulazione");

      setRisposta(data.output);
    } catch (err: any) {
      setErrore(err.message || "Errore imprevisto");
    } finally {
      setLoading(false);
    }
  };

  if (!userChecked) return <DashboardLayout><p>Caricamento...</p></DashboardLayout>;

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold mb-6">🎤 Simulazione Esame Orale</h1>

      {/* BOX INFORMATIVO */}
      <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-900 p-4 rounded mb-6">
        <h2 className="font-semibold text-lg mb-1">ℹ️ Come funziona</h2>
        <p className="text-sm">
          Inserisci una materia e un argomento specifico: l’AI genererà una possibile domanda d’esame orale.
          Questo ti aiuterà ad allenarti a rispondere in modo efficace e completo.
        </p>
        <p className="mt-2 text-sm font-medium">
          💡 Consiglio: simula una risposta parlata ad alta voce per migliorare la tua esposizione.
        </p>
      </div>

      <div className="mb-4">
        <label className="block font-medium">Materia</label>
        <input
          type="text"
          value={materia}
          onChange={(e) => setMateria(e.target.value)}
          className="w-full border rounded p-2"
          placeholder="Es: Storia, Economia, Fisica..."
        />
      </div>

      <div className="mb-4">
        <label className="block font-medium">Argomento</label>
        <input
          type="text"
          value={argomento}
          onChange={(e) => setArgomento(e.target.value)}
          className="w-full border rounded p-2"
          placeholder="Es: Keynes, la guerra fredda, l'energia cinetica..."
        />
      </div>

      <button
        onClick={generaSimulazione}
        disabled={loading}
        className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
      >
        {loading ? "Simulazione in corso..." : "Avvia simulazione orale"}
      </button>

      {errore && <p className="mt-4 text-red-600">{errore}</p>}

      {risposta && (
        <div className="mt-6 bg-gray-50 border rounded p-4 whitespace-pre-line">
          <h2 className="text-lg font-semibold mb-2">🎓 Risposta Simulata:</h2>
          <p>{risposta}</p>
        </div>
      )}
    </DashboardLayout>
  );
}
