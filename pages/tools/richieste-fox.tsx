import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/lib/supabaseClient";
import { saveAs } from "file-saver";
import { createClient } from "@supabase/supabase-js";

interface RichiestaFox {
  id: string;
  domanda: string;
  risposta: string | null;
  stato: string;
  inviata_il: string;
  risposta_il: string | null;
  risposta_allegati?: string[];
}

export default function LeMieRichiesteFox() {
  const [richieste, setRichieste] = useState<RichiestaFox[]>([]);
  const [caricamento, setCaricamento] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedRichiesta, setSelectedRichiesta] = useState<RichiestaFox | null>(null);
  const [filtro, setFiltro] = useState<string>("tutte");

  const fetchRichieste = async () => {
    const sessionRes = await supabase.auth.getSession();
    const accessToken = sessionRes.data.session?.access_token;
    if (!accessToken) return;

    const supabaseAuthed = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${accessToken}` } },
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      }
    );

    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user?.id) return;

    const { data, error } = await supabaseAuthed
      .from("agente_fox")
      .select("id, domanda, risposta, stato, inviata_il, risposta_il, risposta_allegati")
      .eq("user_id", userData.user.id)
      .order("inviata_il", { ascending: false });

    if (!error && data) setRichieste(data);
    setCaricamento(false);
  };

  useEffect(() => {
    fetchRichieste();
    const interval = setInterval(fetchRichieste, 30000);
    return () => clearInterval(interval);
  }, []);

  const downloadRisposta = (testo: string, id: string) => {
    const blob = new Blob([testo], { type: "text/plain;charset=utf-8" });
    saveAs(blob, `Risposta_AgenteFox_${id}.txt`);
  };

  const richiesteFiltrate = richieste.filter((r) => {
    const matchQuery = r.domanda.toLowerCase().includes(query.toLowerCase());
    const matchFiltro =
      filtro === "tutte" ||
      (filtro === "in_attesa" && r.stato === "in_attesa") ||
      (filtro === "in_lavorazione" && r.stato === "in_lavorazione") ||
      (filtro === "completato" && r.stato === "completato");
    return matchQuery && matchFiltro;
  });

  const getFileType = (url: string) => {
    const extension = url.split(".").pop()?.toLowerCase();
    switch (extension) {
      case "pdf": return "📄 PDF";
      case "doc": case "docx": return "📝 DOCX";
      case "txt": return "📑 TXT";
      case "xlsx": return "📊 XLSX";
      case "ppt": case "pptx": return "📽️ PPTX";
      default: return "🗎 File";
    }
  };

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">🦊 Le mie richieste ad Agente Fox</h1>
<div className="flex flex-wrap gap-2 mb-4"><button onClick={() => setFiltro("tutte")}className={`px-3 py-1 rounded ${filtro === "tutte" ? "bg-blue-600 text-white": "bg-gray-200 dark:bg-gray-800 dark:text-gray-100"}`}>Tutte</button>
  <button onClick={() => setFiltro("in_attesa")}className={`px-3 py-1 rounded ${filtro === "in_attesa"? "bg-blue-600 text-white": "bg-gray-200 dark:bg-gray-800 dark:text-gray-100"}`}>In attesa</button>
  <button onClick={() => setFiltro("in_lavorazione")}className={`px-3 py-1 rounded ${filtro === "in_lavorazione"? "bg-blue-600 text-white": "bg-gray-200 dark:bg-gray-800 dark:text-gray-100"}`}>In lavorazione</button>
  <button onClick={() => setFiltro("completato")}className={`px-3 py-1 rounded ${filtro === "completato" ? "bg-blue-600 text-white": "bg-gray-200 dark:bg-gray-800 dark:text-gray-100"}`}>Completato</button>
</div>


      <input
  type="text"
  placeholder="Cerca tra le tue richieste..."
  value={query}
  onChange={(e) => setQuery(e.target.value)}
  className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 mb-6 rounded"
/>


      {caricamento ? (
        <p>Caricamento richieste...</p>
      ) : richiesteFiltrate.length === 0 ? (
        <p>Non hai ancora inviato richieste ad Agente Fox.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm">
  <thead className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100">
    <tr>
      <th className="p-3 border-b border-gray-300 dark:border-gray-600 text-left">Data invio</th>
      <th className="p-3 border-b border-gray-300 dark:border-gray-600 text-left">Domanda</th>
      <th className="p-3 border-b border-gray-300 dark:border-gray-600 text-left">Stato</th>
      <th className="p-3 border-b border-gray-300 dark:border-gray-600 text-left">Azioni</th>
    </tr>
  </thead>
  <tbody>
    {richiesteFiltrate.map((r) => (
      <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
        <td className="p-3 border-b border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-100">
          {new Date(r.inviata_il).toLocaleDateString()}
        </td>
        <td className="p-3 border-b border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-100">
          {r.domanda.length > 50 ? r.domanda.slice(0, 50) + "..." : r.domanda}
        </td>
        <td className="p-3 border-b border-gray-300 dark:border-gray-600">
          <span className={`text-xs px-2 py-1 rounded font-semibold ${
            r.stato === "in_attesa"
              ? "bg-yellow-200 text-yellow-800 dark:bg-yellow-300 dark:text-yellow-900"
              : r.stato === "in_lavorazione"
              ? "bg-blue-200 text-blue-800 dark:bg-blue-300 dark:text-blue-900"
              : "bg-green-200 text-green-800 dark:bg-green-300 dark:text-green-900"
          }`}>
            {r.stato.replace("_", " ")}
          </span>
        </td>
        <td className="p-3 border-b border-gray-300 dark:border-gray-600">
          <button
            onClick={() => setSelectedRichiesta(r)}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            🔍 Visualizza
          </button>
        </td>
      </tr>
    ))}
  </tbody>
</table>
        </div>
      )}

      {/* Modale animata */}
      {selectedRichiesta && (
        <div className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-sm backdrop-brightness-90 bg-black/20">
          <div className="bg-white/70 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-lg backdrop-blur-md">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
              onClick={() => setSelectedRichiesta(null)}
            >
              ❌
            </button>

            <h2 className="text-xl font-bold mb-4">🦊 Dettagli richiesta</h2>

            <p className="text-sm mb-2"><strong>Data invio:</strong> {new Date(selectedRichiesta.inviata_il).toLocaleString()}</p>
            <p className="text-sm mb-2"><strong>Domanda:</strong><br />{selectedRichiesta.domanda}</p>

            {selectedRichiesta.risposta ? (
              <div className="bg-gray-50 p-3 rounded border border-gray-300 mt-4 space-y-2">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  <strong>Risposta:</strong><br />{selectedRichiesta.risposta}
                </p>

                {selectedRichiesta.risposta_allegati && selectedRichiesta.risposta_allegati.length > 0 && (
  <div className="mt-3">
    <p className="text-sm font-medium mb-1">📎 File allegati:</p>
    <ul className="list-disc ml-5 text-sm">
      {selectedRichiesta.risposta_allegati.map((url, i) => (
        <li key={i}>
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
            {getFileType(url)} - Scarica allegato {i + 1}
          </a>
        </li>
      ))}
    </ul>
  </div>
)}


                <p className="text-xs text-gray-400">
                  Risposta ricevuta il: {new Date(selectedRichiesta.risposta_il!).toLocaleString()}
                </p>

                <button
                  onClick={() => downloadRisposta(selectedRichiesta.risposta!, selectedRichiesta.id)}
                  className="mt-3 bg-blue-600 text-white text-sm px-4 py-2 rounded hover:bg-blue-700"
                >
                  📥 Scarica risposta
                </button>
              </div>
            ) : (
              <p className="text-sm italic text-gray-500 mt-4">
                {selectedRichiesta.stato === "in_attesa"
                  ? "🕒 In attesa che l'agente inizi a lavorare sulla tua richiesta."
                  : "🤖 L'agente sta lavorando alla tua risposta. Torna tra poco!"}
              </p>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

LeMieRichiesteFox.requireAuth = true;
