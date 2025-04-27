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
  allegati?: string[] | string | null;
  risposta_allegati?: string[] | null; // 🔥 aggiunto correttamente
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

  const [fileAllegati, setFileAllegati] = useState<Record<string, File[]>>({});

const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
  const files = e.target.files;
  if (files) {
    const fileArray = Array.from(files);
    setFileAllegati((prev) => ({ ...prev, [id]: fileArray }));
  }
};


  const fetchStats = async () => {
    const sessionResult = await supabase.auth.getSession();
    const accessToken = sessionResult.data.session?.access_token;

    if (!accessToken) {
      console.warn("⚠️ Token non disponibile, impossibile recuperare statistiche");
      return;
    }

    const res = await fetch("/api/admin/fox-stats", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (res.ok) {
      const data = await res.json();
      setStats(data);
    } else {
      console.error("❌ Errore recupero stats:", res.status, await res.text());
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
  
    const files = fileAllegati[id] || [];
    let uploadedFilesUrls: string[] = [];
  
    if (files.length > 0) {
      for (const file of files) {
        const { data, error } = await supabase.storage
          .from("fox-risposte") // devi creare questo bucket se non esiste!
          .upload(`${id}/${file.name}`, file, {
            cacheControl: '3600',
            upsert: true,
          });
  
        if (error) {
          console.error("Errore caricamento file:", error.message);
        } else if (data) {
          const { publicUrl } = supabase.storage
            .from("fox-risposte")
            .getPublicUrl(data.path).data;
          uploadedFilesUrls.push(publicUrl);
        }
      }
    }
  
    const { error } = await supabase
      .from("agente_fox")
      .update({
        risposta,
        stato: "completato",
        risposta_il: new Date().toISOString(),
        risposta_allegati: uploadedFilesUrls.length > 0 ? uploadedFilesUrls : null,
      })
      .eq("id", id);
  
    if (!error) {
      setRichieste((prev) =>
        prev.map((r) =>
          r.id === id
            ? { ...r, risposta, stato: "completato", risposta_allegati: uploadedFilesUrls }
            : r
        )
      );
      setRisposte((prev) => ({ ...prev, [id]: "" }));
      setFileAllegati((prev) => ({ ...prev, [id]: [] }));
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
        {[
          { key: "tutte", label: "Tutte" },
          { key: "in_attesa", label: "In attesa" },
          { key: "in_lavorazione", label: "In lavorazione" },
          { key: "completato", label: "Completate" },
        ].map(({ key, label }) => (
          <button
            key={key}
            className={`px-3 py-1 rounded ${filtro === key ? "bg-blue-600 text-white" : "bg-gray-200"}`}
            onClick={() => setFiltro(key)}
          >
            {label}
          </button>
        ))}
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

              {r.allegati && (
                <div className="mb-3">
                  <p className="text-sm font-medium">📎 Allegati:</p>
                  <ul className="list-disc ml-5 text-sm">
                    {Array.isArray(r.allegati) ? (
                      r.allegati.map((url, i) => (
                        <li key={i}>
                          <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                            Scarica file {i + 1}
                          </a>
                        </li>
                      ))
                    ) : typeof r.allegati === "string" && (r.allegati as string).trim() !== "" ? (
                      <li>
                        <a href={r.allegati as string} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                          Scarica file
                        </a>
                      </li>
                    ) : (
                      <li>Nessun file allegato</li>
                    )}
                  </ul>
                </div>
              )}

{editingId === r.id ? (
  <div className="space-y-2 mt-3">
    <textarea
      className="w-full p-2 border rounded"
      rows={4}
      placeholder="Scrivi la risposta..."
      value={risposte[r.id] || r.risposta || ""}
      onChange={(e) =>
        setRisposte((prev) => ({ ...prev, [r.id]: e.target.value }))
      }
    />
    
    {/* 🔥 Input file */}
    <input
      type="file"
      multiple
      onChange={(e) => handleFileUpload(e, r.id)}
      className="block w-full text-sm text-gray-500
        file:mr-4 file:py-2 file:px-4
        file:rounded-full file:border-0
        file:text-sm file:font-semibold
        file:bg-blue-50 file:text-blue-700
        hover:file:bg-blue-100
      "
    />

    <div className="flex gap-2">
      <button
        onClick={() => inviaRisposta(r.id)}
        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
      >
        {r.risposta ? "Salva modifica" : "Invia risposta"}
      </button>
      <button
        onClick={() => eliminaRichiesta(r.id)}
        className="text-sm text-red-600 hover:underline"
      >
        🗑️ Elimina
      </button>
      <button
        onClick={() => setEditingId(null)}
        className="text-gray-600 hover:underline"
      >
        Annulla
      </button>
    </div>
  </div>
) : (
  <div className="flex flex-wrap items-center gap-3 mt-3">
    {r.risposta && (
  <div className="bg-gray-50 p-3 rounded border border-gray-300 w-full space-y-2">
    <p className="text-sm text-gray-700 whitespace-pre-wrap">
      <strong>Risposta:</strong> {r.risposta}
    </p>

    {/* 🔥 Se ci sono file allegati nella risposta */}
    {r.risposta_allegati && Array.isArray(r.risposta_allegati) && r.risposta_allegati.length > 0 && (
      <div>
        <p className="text-sm font-medium mb-1">📎 File allegati alla risposta:</p>
        <ul className="list-disc ml-5 text-sm">
          {r.risposta_allegati.map((url: string, i: number) => (
            <li key={i}>
              <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                Scarica allegato {i + 1}
              </a>
            </li>
          ))}
        </ul>
      </div>
    )}
  </div>
)}

    {r.stato === "in_attesa" && (
      <button
        onClick={() => prendiInCarico(r.id)}
        className="text-yellow-600 text-sm underline"
      >
        🟡 Prendi in carico
      </button>
    )}
    <button
      onClick={() => setEditingId(r.id)}
      className="text-blue-600 text-sm underline"
    >
      ✏️ Rispondi
    </button>
    <button
      onClick={() => eliminaRichiesta(r.id)}
      className="text-red-600 text-sm underline"
    >
      🗑️ Elimina
    </button>
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
