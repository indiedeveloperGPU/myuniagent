import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/lib/supabaseClient";


export default function SimulazioniScrittePage() {
  const [materia, setMateria] = useState("");
  const [argomento, setArgomento] = useState("");
  const [simulazione, setSimulazione] = useState("");
  const [risposteUtente, setRisposteUtente] = useState("");
  const [correzione, setCorrezione] = useState("");
  const [tipoSimulazione, setTipoSimulazione] = useState("aperte");
  const [loadingSimulazione, setLoadingSimulazione] = useState(false);
  const [loadingCorrezione, setLoadingCorrezione] = useState(false);
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

    setLoadingSimulazione(true);
    setSimulazione("");
    setCorrezione("");
    setErrore("");
    setRisposteUtente("");

    try {
      const res = await fetch("/api/simulazioni-scritte", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          materia,
          argomento,
          tipo: tipoSimulazione, // ✅ aggiunto
        }),
      });
      

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore generazione simulazione");

      setSimulazione(data.output);
    } catch (err: any) {
      setErrore(err.message || "Errore generico");
    } finally {
      setLoadingSimulazione(false);
    }
  };

  const correggiRisposte = async () => {
    if (!simulazione || !risposteUtente) {
      setErrore("Inserisci le risposte prima di avviare la correzione.");
      return;
    }

    setLoadingCorrezione(true);
    setCorrezione("");
    setErrore("");

    try {
      const res = await fetch("/api/correggi-simulazione", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domanda: simulazione, risposta: risposteUtente }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore durante la correzione");

      setCorrezione(data.output);
    } catch (err: any) {
      setErrore(err.message || "Errore imprevisto");
    } finally {
      setLoadingCorrezione(false);
    }
  };

  if (!userChecked) return <DashboardLayout><p>Caricamento...</p></DashboardLayout>;

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold mb-6">✍️ Simulazione Esame Scritto</h1>

      {/* ℹ️ BOX INFORMATIVO */}
      <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-900 p-4 rounded mb-6">
        <h2 className="font-semibold text-lg mb-1">ℹ️ Come funziona</h2>
        <p className="text-sm">
          Inserisci una materia e un argomento. Verrà generata automaticamente una simulazione con domande aperte sul tema selezionato.
          Dopo aver scritto le risposte, potrai ricevere una correzione automatica con suggerimenti utili per migliorare.
        </p>
        <p className="mt-2 text-sm font-medium">
          ✅ Ideale per esercitarsi in vista di prove scritte universitarie o maturità.
        </p>
      </div>

      <div className="mb-4">
        <label className="block font-medium">Materia</label>
        <input
          type="text"
          value={materia}
          onChange={(e) => setMateria(e.target.value)}
          className="w-full border rounded p-2"
          placeholder="Es: Diritto, Fisica, Filosofia..."
        />
      </div>

      <div className="mb-4">
        <label className="block font-medium">Argomento specifico</label>
        <input
          type="text"
          value={argomento}
          onChange={(e) => setArgomento(e.target.value)}
          className="w-full border rounded p-2"
          placeholder="Es: la legge di Ohm, il contratto, Kant..."
        />
      </div>

      <div className="mb-4">
  <label className="block font-medium">Tipo di simulazione</label>
  <select
    value={tipoSimulazione}
    onChange={(e) => setTipoSimulazione(e.target.value)}
    className="w-full border rounded p-2"
  >
    <option value="aperte">📄 Domande aperte</option>
    <option value="multiple">✅ Risposta multipla</option>
    <option value="misto">🔀 Misto (aperte + multiple)</option>
  </select>
</div>


      <button
        onClick={generaSimulazione}
        disabled={loadingSimulazione}
        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
      >
        {loadingSimulazione ? "Generazione in corso..." : "Genera simulazione"}
      </button>

      {errore && <p className="mt-4 text-red-600">{errore}</p>}

      {simulazione && (
        <div className="mt-6 bg-gray-50 border rounded p-4 whitespace-pre-line">
          <h2 className="text-lg font-semibold mb-2">📝 Simulazione generata:</h2>
          <p>{simulazione}</p>
        </div>
      )}

      {simulazione && (
        <div className="mt-6">
          <label className="block font-medium mb-2">✍️ Inserisci qui le tue risposte:</label>
          <textarea
            value={risposteUtente}
            onChange={(e) => setRisposteUtente(e.target.value)}
            className="w-full p-3 border rounded h-40"
            placeholder="Rispondi a ciascuna domanda..."
          />

          <button
            onClick={correggiRisposte}
            disabled={loadingCorrezione}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            {loadingCorrezione ? "Correzione in corso..." : "Correggi le mie risposte"}
          </button>
        </div>
      )}

      {correzione && (
        <div className="mt-6 bg-green-50 border rounded p-4 whitespace-pre-line">
          <h2 className="text-lg font-semibold mb-2">✅ Correzione AI:</h2>
          <p>{correzione}</p>
        </div>
      )}
    </DashboardLayout>
  );
}

