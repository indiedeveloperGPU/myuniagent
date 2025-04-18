import { useEffect, useState } from "react";
import StaffLayout from "@/components/StaffLayout";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";


interface RichiestaFox {
  id: string;
  user_id: string;
  domanda: string;
  risposta: string | null;
  stato: string;
  inviata_il: string;
  risposta_il: string | null;
  allegati?: string[]; // URL dei file
}

interface StatisticheFox {
  totale: number;
  completate: number;
  percentuale: string;
  tempo_medio: string;
  ultima_risposta: string;
}

function StatBox({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-blue-50 p-4 rounded shadow border border-blue-200 text-center">
      <div className="text-sm text-gray-600">{title}</div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
}

function AgenteFoxAdmin() {
  const [richieste, setRichieste] = useState<RichiestaFox[]>([]);
  const [caricamento, setCaricamento] = useState(true);
  const [risposte, setRisposte] = useState<Record<string, string>>({});
  const [filtro, setFiltro] = useState("tutte");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [stats, setStats] = useState<StatisticheFox | null>(null);

  const fetchRichieste = async () => {
    setCaricamento(true);
    const { data, error } = await supabase
      .from("agente_fox")
      .select("*")
      .order("inviata_il", { ascending: false });

    if (!error && data) {
      setRichieste(data);
    }
    setCaricamento(false);
  };

  const fetchStats = async () => {
    const res = await fetch("/api/admin/fox-stats", {
      credentials: "include", // ✅ questa è la parte fondamentale
    });
  
    if (res.ok) {
      const data = await res.json();
      setStats(data);
    }
  };
  

  useEffect(() => {
    fetchRichieste();
    fetchStats();
    const interval = setInterval(() => {
      fetchRichieste();
      fetchStats();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const inviaRisposta = async (id: string) => {
    const risposta = risposte[id];
    if (!risposta?.trim()) return;

    const { error } = await supabase
      .from("agente_fox")
      .update({ risposta, stato: "completato", risposta_il: new Date().toISOString() })
      .eq("id", id);

    if (!error) {
      setRichieste((prev) =>
        prev.map((r) => (r.id === id ? { ...r, risposta, stato: "completato" } : r))
      );
      setRisposte((prev) => ({ ...prev, [id]: "" }));
      setEditingId(null);
    }
  };

  const prendiInCarico = async (id: string) => {
    const { error } = await supabase
      .from("agente_fox")
      .update({ stato: "in_lavorazione" })
      .eq("id", id);

    if (!error) {
      setRichieste((prev) =>
        prev.map((r) => (r.id === id ? { ...r, stato: "in_lavorazione" } : r))
      );
    }
  };

  const eliminaRichiesta = async (id: string) => {
    const { error } = await supabase.from("agente_fox").delete().eq("id", id);
    if (!error) {
      toast.success("Richiesta eliminata con successo");
      await fetchRichieste();
    } else {
      toast.error("Errore durante l'eliminazione");
    }
  };
  
  

  const richiesteFiltrate = richieste.filter((r) =>
    filtro === "tutte" ? true : r.stato === filtro
  );

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">🦊 Agente Fox - Gestione richieste</h1>

      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <StatBox title="Totale richieste" value={stats.totale.toString()} />
          <StatBox title="Completate" value={stats.completate.toString()} />
          <StatBox title="% Completamento" value={stats.percentuale} />
          <StatBox title="Tempo medio risposta" value={stats.tempo_medio} />
          <StatBox title="Ultima risposta" value={stats.ultima_risposta} />
        </div>
      )}

      <div className="flex gap-2 mb-6">
        <button className={`px-3 py-1 rounded ${filtro === "tutte" ? "bg-blue-600 text-white" : "bg-gray-200"}`} onClick={() => setFiltro("tutte")}>Tutte</button>
        <button className={`px-3 py-1 rounded ${filtro === "in_attesa" ? "bg-blue-600 text-white" : "bg-gray-200"}`} onClick={() => setFiltro("in_attesa")}>In attesa</button>
        <button className={`px-3 py-1 rounded ${filtro === "in_lavorazione" ? "bg-blue-600 text-white" : "bg-gray-200"}`} onClick={() => setFiltro("in_lavorazione")}>In lavorazione</button>
        <button className={`px-3 py-1 rounded ${filtro === "completato" ? "bg-blue-600 text-white" : "bg-gray-200"}`} onClick={() => setFiltro("completato")}>Completate</button>
      </div>

      {caricamento ? (
        <p>Caricamento richieste...</p>
      ) : richiesteFiltrate.length === 0 ? (
        <p>Nessuna richiesta trovata.</p>
      ) : (
        <div className="space-y-6">
          {richiesteFiltrate.map((r) => (
            <div key={r.id} className="bg-white p-4 rounded shadow border border-gray-200">
              <div className="text-sm text-gray-500 mb-1">
                Inviata il: {new Date(r.inviata_il).toLocaleString()} | Stato: <span className="font-semibold">{r.stato}</span>
              </div>
              <p className="mb-2"><strong>Domanda:</strong> {r.domanda}</p>

              {r.allegati && r.allegati.length > 0 && (
                <div className="mb-3">
                  <p className="text-sm font-medium">📎 Allegati:</p>
                  <ul className="list-disc ml-5 text-sm">
                    {r.allegati.map((url, i) => (
                      <li key={i}>
                        <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                          Scarica file {i + 1}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {r.risposta && editingId !== r.id ? (
                <div className="bg-gray-50 p-3 rounded border border-gray-300">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap"><strong>Risposta:</strong> {r.risposta}</p>
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => setEditingId(r.id)} className="text-sm text-blue-600 hover:underline">✏️ Modifica</button>
                    <button onClick={() => eliminaRichiesta(r.id)} className="text-sm text-red-600 hover:underline">🗑️ Elimina</button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <textarea className="w-full p-2 border rounded" rows={4} placeholder="Scrivi la risposta..." value={risposte[r.id] || r.risposta || ""} onChange={(e) => setRisposte((prev) => ({ ...prev, [r.id]: e.target.value }))} />
                  <div className="flex gap-2">
                    {!r.risposta && r.stato === "in_attesa" && (
                      <button onClick={() => prendiInCarico(r.id)} className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600">Prendi in carico</button>
                    )}
                    <button onClick={() => inviaRisposta(r.id)} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">{r.risposta ? "Salva modifica" : "Invia risposta"}</button>
                    {r.risposta && (
                      <button onClick={() => setEditingId(null)} className="text-gray-600 hover:underline">Annulla modifica</button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

AgenteFoxAdmin.getLayout = function getLayout(page: React.ReactNode) {
  return <StaffLayout>{page}</StaffLayout>;
};

AgenteFoxAdmin.requireAuth = true;

export default AgenteFoxAdmin;
