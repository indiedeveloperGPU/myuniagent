import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import DashboardLayout from "@/components/DashboardLayout";
import Link from "next/link";

export default function SimulazioniScrittePage() {
  const [categoria, setCategoria] = useState("superiori");
  const [materia, setMateria] = useState("");
  const [argomento, setArgomento] = useState("");
  const [tipoSimulazione, setTipoSimulazione] = useState("aperte");
  const [simulazione, setSimulazione] = useState<any>(null);
  const [risposteUtente, setRisposteUtente] = useState("");
  const [correzione, setCorrezione] = useState("");
  const [voto, setVoto] = useState(0);
  const [lode, setLode] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [errore, setErrore] = useState("");

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) window.location.href = "/auth";
      setUser(data.user);
    };
    fetchUser();
  }, []);

  const generaSimulazione = async () => {
    if (!categoria || !materia || !argomento) {
      setErrore("Inserisci tutti i campi richiesti.");
      return;
    }

    setLoading(true);
    setSimulazione(null);
    setRisposteUtente("");
    setErrore("");
    setCorrezione("");

    try {
      const { data, error } = await supabase
        .from("simulazioni_scritti_dataset")
        .select("*")
        .eq("categoria", categoria)
        .eq("materia", materia)
        .eq("argomento", argomento)
        .eq("tipo", tipoSimulazione)
        .order("random()")
        .limit(1)
        .single();

      if (error || !data) throw new Error("Simulazione non trovata.");

      setSimulazione(data);
    } catch (err: any) {
      setErrore(err.message || "Errore durante il caricamento della simulazione.");
    } finally {
      setLoading(false);
    }
  };

  const correggiRisposte = async () => {
    if (!simulazione || !risposteUtente) {
      setErrore("Compila la simulazione prima di correggerla.");
      return;
    }

    if (!voto && voto !== 0) {
      setErrore("Assegna un voto prima di correggere.");
      return;
    }

    setLoading(true);
    setErrore("");

    try {
      const { error } = await supabase.from("simulazioni_scritti_risposte").insert({
        user_id: user.id,
        simulazione_id: simulazione.id,
        categoria,
        materia: simulazione.materia,
        argomento: simulazione.argomento,
        tipo: simulazione.tipo,
        risposte_utente: risposteUtente,
        voto,
        lode: lode,
        correzione: simulazione.soluzione_esempio,
      });

      if (error) throw new Error("Errore nel salvataggio della simulazione.");

      setCorrezione(simulazione.soluzione_esempio);
    } catch (err: any) {
      setErrore(err.message || "Errore durante la correzione.");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <DashboardLayout><p>Caricamento...</p></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">✍️ Simulazione Esame Scritto</h1>
        <Link href="/tools/storico-simulazioni" className="text-blue-600 hover:underline font-medium">
          📚 Vai al tuo Storico
        </Link>
      </div>

      {/* Sezione Selezione Parametri */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="font-medium">Categoria</label>
          <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="w-full border rounded p-2">
            <option value="superiori">🏫 Scuola Superiore</option>
            <option value="università">🎓 Università</option>
          </select>
        </div>

        <div>
          <label className="font-medium">Materia</label>
          <input type="text" value={materia} onChange={(e) => setMateria(e.target.value)} className="w-full border rounded p-2" placeholder="Es: Diritto, Fisica..." />
        </div>

        <div>
          <label className="font-medium">Argomento</label>
          <input type="text" value={argomento} onChange={(e) => setArgomento(e.target.value)} className="w-full border rounded p-2" placeholder="Es: Contratto, Legge di Ohm..." />
        </div>

        <div>
          <label className="font-medium">Tipo Simulazione</label>
          <select value={tipoSimulazione} onChange={(e) => setTipoSimulazione(e.target.value)} className="w-full border rounded p-2">
            <option value="aperte">📄 Domande Aperte</option>
            <option value="multiple">✅ Risposte Multiple</option>
            <option value="misto">🔀 Misto</option>
          </select>
        </div>
      </div>

      <button onClick={generaSimulazione} disabled={loading} className="bg-green-600 text-white px-4 py-2 rounded-lg transition-transform duration-200 hover:bg-green-700 hover:scale-105"      >
        {loading ? "Caricamento..." : "Genera Simulazione"}
      </button>

      {errore && <p className="text-red-600 mt-4">{errore}</p>}

      {/* Simulazione */}
      {simulazione && (
        <div className="mt-8 bg-gray-50 p-6 rounded border">
          <h2 className="text-lg font-semibold mb-4">📝 Simulazione</h2>
          <p className="whitespace-pre-line">{simulazione.contenuto_simulazione}</p>

          <textarea
            value={risposteUtente}
            onChange={(e) => setRisposteUtente(e.target.value)}
            className="w-full border p-3 mt-6 rounded h-40"
            placeholder="Scrivi qui le tue risposte..."
          />

          {/* Assegna Voto */}
          <div className="mt-6">
            <label className="font-medium block mb-2">🎯 Assegna il tuo voto:</label>
            <input
              type="number"
              min={0}
              max={categoria === "università" ? 30 : 10}
              value={voto}
              onChange={(e) => setVoto(Number(e.target.value))}
              className="w-full border rounded p-2 mb-2"
            />
            {categoria === "università" && (
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={lode} onChange={(e) => setLode(e.target.checked)} />
                <span>Con Lode</span>
              </div>
            )}
          </div>

          <button onClick={correggiRisposte} disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded-lg transition-transform duration-200 hover:bg-blue-700 hover:scale-105"          >
            {loading ? "Salvataggio..." : "Correggi e Salva"}
          </button>
        </div>
      )}

      {/* Correzione */}
      {correzione && (
        <div className="mt-8 bg-green-50 p-6 rounded border">
          <h2 className="text-lg font-semibold mb-4">✅ Soluzione Ideale:</h2>
          <p className="whitespace-pre-line">{correzione}</p>
        </div>
      )}
    </DashboardLayout>
  );
}

SimulazioniScrittePage.requireAuth = true;

