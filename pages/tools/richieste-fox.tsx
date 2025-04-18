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
  allegati?: string[];
}

export default function LeMieRichiesteFox() {
  const [richieste, setRichieste] = useState<RichiestaFox[]>([]);
  const [caricamento, setCaricamento] = useState(true);
  const [query, setQuery] = useState("");

  const fetchRichieste = async () => {
    const sessionRes = await supabase.auth.getSession();
    const accessToken = sessionRes.data.session?.access_token;
    if (!accessToken) return;

    const supabaseAuthed = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      }
    );

    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user?.id) return;

    const { data, error } = await supabaseAuthed
      .from("agente_fox")
      .select("id, domanda, risposta, stato, inviata_il, risposta_il, allegati")
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

  const eliminaRichiesta = async (id: string) => {
    const { error } = await supabase.from("agente_fox").delete().eq("id", id);
    if (!error) {
      setRichieste((prev) => prev.filter((r) => r.id !== id));
    }
  };

  const richiesteFiltrate = richieste.filter((r) =>
    r.domanda.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold mb-4">🦊 Le mie richieste ad Agente Fox</h1>

      <input
        type="text"
        placeholder="Cerca tra le tue richieste..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full p-2 border border-gray-300 rounded mb-6"
      />

      {caricamento ? (
        <p>Caricamento richieste...</p>
      ) : richiesteFiltrate.length === 0 ? (
        <p>Non hai ancora inviato richieste ad Agente Fox.</p>
      ) : (
        <div className="space-y-6">
          {richiesteFiltrate.map((r) => (
            <details key={r.id} className="bg-white rounded shadow border border-gray-200">
              <summary className="cursor-pointer p-4 font-medium hover:bg-gray-50">
                <div className="flex justify-between items-center">
                  <span>
                    🗓️ {new Date(r.inviata_il).toLocaleString()} — <strong>
                      {r.domanda.length > 60 ? r.domanda.slice(0, 60) + "..." : r.domanda}
                    </strong>
                  </span>
                  <span className={`text-xs px-2 py-1 rounded font-semibold ${
                    r.stato === "in_attesa" ? "bg-yellow-200 text-yellow-800" :
                    r.stato === "in_lavorazione" ? "bg-blue-200 text-blue-800" :
                    "bg-green-200 text-green-800"
                  }`}>
                    {r.stato.replace("_", " ")}
                  </span>
                </div>
              </summary>

              <div className="p-4 border-t space-y-3">
                <p><strong>Domanda:</strong> {r.domanda}</p>

                {r.allegati && r.allegati.length > 0 && (
                  <div>
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

                {r.risposta ? (
                  <div className="bg-gray-50 p-3 rounded border border-gray-300">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      <strong>Risposta:</strong> {r.risposta}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Risposta ricevuta il: {new Date(r.risposta_il!).toLocaleString()}
                    </p>
                    {r.risposta_il && new Date().getTime() - new Date(r.risposta_il).getTime() < 5 * 60 * 1000 && (
                      <div className="text-green-600 text-xs font-semibold mt-1">🆕 Nuova risposta appena ricevuta</div>
                    )}
                    <button
                      onClick={() => downloadRisposta(r.risposta!, r.id)}
                      className="mt-2 text-sm text-blue-600 hover:underline"
                    >
                      📥 Scarica risposta
                    </button>
                  </div>
                ) : (
                  <p className="text-sm italic text-gray-500">
                    {r.stato === "in_attesa"
                      ? "🕒 In attesa che l'agente inizi a lavorare sulla tua richiesta."
                      : "🤖 L'agente sta lavorando alla tua risposta. Torna tra poco!"}
                  </p>
                )}

                <button
                  onClick={() => eliminaRichiesta(r.id)}
                  className="text-sm text-red-600 hover:underline"
                >
                  🗑️ Elimina richiesta
                </button>
              </div>
            </details>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}

LeMieRichiesteFox.requireAuth = true;
