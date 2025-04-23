import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import StaffLayout from "@/components/StaffLayout";

interface RigaRichiesta {
  id: string;
  tipo: "Grammatica" | "Vocabolario" | "Certificazione";
  lingua: string;
  livello: string;
  utente: string;
  data: string;
  stato: string;
  contenuto: any;
  tabella: string;
}

export default function LingueFox() {
  const [richieste, setRichieste] = useState<RigaRichiesta[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [aperta, setAperta] = useState<RigaRichiesta | null>(null);
  const [feedback, setFeedback] = useState<string>("");

  useEffect(() => {
    const caricaRichieste = async () => {
      setLoading(true);

      const [grammatica, vocabolario, certificazioni] = await Promise.all([
        supabase.from("teoria_quiz_risposte").select("id, user_id, lingua, livello, stato, risposte, created_at"),
        supabase.from("vocabolario_risposte").select("id, user_id, lingua, livello, stato, risposte, created_at"),
        supabase.from("certificazioni_risposte").select("id, user_id, lingua, livello, stato, risposte, created_at")
      ]);

      const tutte: RigaRichiesta[] = [];

      grammatica.data?.forEach((r) => tutte.push({
        id: r.id,
        tipo: "Grammatica",
        lingua: r.lingua,
        livello: r.livello,
        stato: r.stato,
        data: r.created_at,
        utente: r.user_id,
        contenuto: r.risposte,
        tabella: "teoria_quiz_risposte"
      }));

      vocabolario.data?.forEach((r) => tutte.push({
        id: r.id,
        tipo: "Vocabolario",
        lingua: r.lingua,
        livello: r.livello,
        stato: r.stato,
        data: r.created_at,
        utente: r.user_id,
        contenuto: r.risposte,
        tabella: "vocabolario_risposte"
      }));

      certificazioni.data?.forEach((r) => tutte.push({
        id: r.id,
        tipo: "Certificazione",
        lingua: r.lingua,
        livello: r.livello,
        stato: r.stato,
        data: r.created_at,
        utente: r.user_id,
        contenuto: r.risposte,
        tabella: "certificazioni_risposte"
      }));

      tutte.sort((a, b) => b.data.localeCompare(a.data));
      setRichieste(tutte);
      setLoading(false);
    };

    caricaRichieste();
  }, []);

  const valutaRichiesta = async () => {
    if (!aperta) return;

    await supabase
      .from(aperta.tabella)
      .update({ stato: "valutato", feedback, notificato: true })
      .eq("id", aperta.id);

    await supabase.from("notifiche").insert({
      user_id: aperta.utente,
      titolo: `La tua richiesta ${aperta.tipo} è stata valutata`,
      messaggio: `Agente Fox ha corretto la tua richiesta di ${aperta.tipo} (${aperta.lingua.toUpperCase()}, livello ${aperta.livello}).`,
      letto: false
    });

    setRichieste((prev) =>
      prev.map((r) =>
        r.id === aperta.id ? { ...r, stato: "valutato" } : r
      )
    );
    setAperta(null);
    setFeedback("");
  };

  return (
    <StaffLayout>
      <div className="max-w-6xl mx-auto relative">
        <h1 className="text-2xl font-bold mb-6">🦊 Richieste Lingue – Agente Fox</h1>

        {loading ? (
          <p className="text-gray-600">Caricamento richieste in corso...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left px-4 py-2">Tipo</th>
                  <th className="text-left px-4 py-2">Lingua</th>
                  <th className="text-left px-4 py-2">Livello</th>
                  <th className="text-left px-4 py-2">Utente</th>
                  <th className="text-left px-4 py-2">Data</th>
                  <th className="text-left px-4 py-2">Stato</th>
                  <th className="text-left px-4 py-2">Azione</th>
                </tr>
              </thead>
              <tbody>
                {richieste.map((r) => (
                  <tr key={r.id} className="border-b">
                    <td className="px-4 py-2">{r.tipo}</td>
                    <td className="px-4 py-2 capitalize">{r.lingua}</td>
                    <td className="px-4 py-2">{r.livello}</td>
                    <td className="px-4 py-2 text-sm">{r.utente}</td>
                    <td className="px-4 py-2 text-sm">{new Date(r.data).toLocaleString()}</td>
                    <td className="px-4 py-2">
                      {r.stato === "in_attesa" ? (
                        <span className="text-yellow-600 font-medium">In attesa</span>
                      ) : (
                        <span className="text-green-600 font-medium">Valutato</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => setAperta(r)}
                        className="bg-blue-600 text-white text-sm px-3 py-1 rounded hover:bg-blue-700"
                      >
                        Apri
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {aperta && (
          <div className="fixed top-0 right-0 w-full sm:w-[400px] h-full bg-white shadow-xl border-l p-5 overflow-y-auto z-50">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">📝 Valutazione richiesta</h2>
              <button onClick={() => setAperta(null)} className="text-gray-600 hover:text-black">✕</button>
            </div>

            <p className="text-sm mb-1 text-gray-500">Utente: {aperta.utente}</p>
            <p className="text-sm mb-3 text-gray-500">Tipo: {aperta.tipo} | Lingua: {aperta.lingua} | Livello: {aperta.livello}</p>

            <div className="space-y-4">
              {Object.entries(aperta.contenuto).map(([k, v], i) => (
                <div key={i} className="bg-gray-50 border rounded p-3">
                  <p className="text-sm font-semibold">🔸 {k}</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap mt-1">
                    {typeof v === 'object' ? JSON.stringify(v, null, 2) : String(v)}
                  </p>
                </div>
              ))}

              <div className="mt-6">
                <label className="block text-sm font-medium mb-1">Feedback</label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="w-full border p-2 rounded"
                  rows={4}
                  placeholder="Scrivi qui la valutazione..."
                />
                <button
                  onClick={valutaRichiesta}
                  className="mt-3 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                  Valuta e chiudi
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </StaffLayout>
  );
}
