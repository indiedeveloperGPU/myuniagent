// File aggiornato con notifiche migliorate e pannello test valutati dettagliato
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import DashboardLayout from "@/components/DashboardLayout";

interface Notifica {
  id: string;
  titolo: string;
  messaggio: string;
  data: string;
  letto: boolean;
}

interface StatisticaLingua {
  lingua: string;
  teoria: number;
  vocabolario: number;
  certificazioni: number;
}

interface TestValutato {
  id: string;
  tipo: "Grammatica" | "Vocabolario" | "Certificazione";
  lingua: string;
  livello: string;
  voto: number;
  commento: string;
  corretto_il: string;
}

export default function UlterioriPage() {
  const [notifiche, setNotifiche] = useState<Notifica[]>([]);
  const [statistiche, setStatistiche] = useState<StatisticaLingua[]>([]);
  const [testValutati, setTestValutati] = useState<TestValutato[]>([]);
  const [aperto, setAperto] = useState<TestValutato | null>(null);
  const [mostraNotifiche, setMostraNotifiche] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const { data: session } = await supabase.auth.getUser();
      const user = session?.user;
      if (!user) return;

      const [notificheData, teoriaData, vocabData, certData, teoriaValutate, vocabolarioValutate, certValutate] = await Promise.all([
        supabase.from("notifiche").select("id, titolo, messaggio, letto, data").eq("user_id", user.id).order("data", { ascending: false }),
        supabase.from("teoria_quiz_risposte").select("lingua").eq("user_id", user.id),
        supabase.from("vocabolario_risposte").select("lingua").eq("user_id", user.id),
        supabase.from("certificazioni_risposte").select("lingua").eq("user_id", user.id),
        supabase.from("teoria_quiz_risposte").select("id, lingua, livello, voto, feedback, updated_at").eq("user_id", user.id).eq("stato", "corretto"),
        supabase.from("vocabolario_risposte").select("id, lingua, livello, voto, feedback, updated_at").eq("user_id", user.id).eq("stato", "corretto"),
        supabase.from("certificazioni_risposte").select("id, lingua, livello, voto, feedback, updated_at").eq("user_id", user.id).eq("stato", "corretto")
      ]);

      const gruppi: Record<string, StatisticaLingua> = {};

      teoriaData.data?.forEach((r) => {
        if (!gruppi[r.lingua]) gruppi[r.lingua] = { lingua: r.lingua, teoria: 0, vocabolario: 0, certificazioni: 0 };
        gruppi[r.lingua].teoria++;
      });

      vocabData.data?.forEach((r) => {
        if (!gruppi[r.lingua]) gruppi[r.lingua] = { lingua: r.lingua, teoria: 0, vocabolario: 0, certificazioni: 0 };
        gruppi[r.lingua].vocabolario++;
      });

      certData.data?.forEach((r) => {
        if (!gruppi[r.lingua]) gruppi[r.lingua] = { lingua: r.lingua, teoria: 0, vocabolario: 0, certificazioni: 0 };
        gruppi[r.lingua].certificazioni++;
      });

      setStatistiche(Object.values(gruppi));
      setNotifiche(notificheData.data || []);

      setTestValutati([
        ...((teoriaValutate.data || []).map((r) => ({ id: r.id, tipo: "Grammatica" as const, lingua: r.lingua, livello: r.livello, voto: r.voto, commento: r.feedback, corretto_il: r.updated_at }))),
        ...((vocabolarioValutate.data || []).map((r) => ({ id: r.id, tipo: "Vocabolario" as const, lingua: r.lingua, livello: r.livello, voto: r.voto, commento: r.feedback, corretto_il: r.updated_at }))),
        ...((certValutate.data || []).map((r) => ({ id: r.id, tipo: "Certificazione" as const, lingua: r.lingua, livello: r.livello, voto: r.voto, commento: r.feedback, corretto_il: r.updated_at })))
      ]);
    };

    fetchData();
  }, []);

  const eliminaNotifica = async (id: string) => {
    await supabase.from("notifiche").delete().eq("id", id);
    setNotifiche((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">📚 Sezione Notifiche e Statistiche</h1>

        <div className="mb-6">
          <button
            onClick={() => setMostraNotifiche(!mostraNotifiche)}
            className="text-sm bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            {mostraNotifiche ? "Nascondi notifiche" : "Mostra notifiche"}
          </button>

          {mostraNotifiche && (
            <div className="mt-4 space-y-2">
              {notifiche.length === 0 ? <p className="text-sm text-gray-500">Nessuna notifica.</p> : (
                notifiche.map((n) => (
                  <div key={n.id} className="bg-white border rounded shadow p-3 relative">
                    <button
                      onClick={() => eliminaNotifica(n.id)}
                      className="absolute top-2 right-2 text-red-500 hover:text-red-700 text-sm"
                    >✕</button>
                    <p className="font-semibold text-sm mb-1">🔔 {n.titolo}</p>
                    <p className="text-gray-700 text-sm mb-1">{n.messaggio}</p>
                    <p className="text-xs text-gray-400">{new Date(n.data).toLocaleString()}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="mb-10">
          <h2 className="text-lg font-semibold mb-2">📈 Progressi per lingua</h2>
          {statistiche.length === 0 ? <p className="text-sm text-gray-500">Ancora nessun progresso registrato.</p> : (
            <ul className="space-y-2">
              {statistiche.map((s, i) => (
                <li key={i} className="border rounded p-3 text-sm">
                  <p className="font-semibold capitalize">{s.lingua}</p>
                  <p className="text-gray-600">Teoria: {s.teoria}, Vocabolario: {s.vocabolario}, Certificazioni: {s.certificazioni}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">✅ Test corretti da Agente Fox</h2>
          {testValutati.length === 0 ? <p className="text-sm text-gray-500">Nessun test valutato finora.</p> : (
            <div className="overflow-x-auto">
              <table className="min-w-full border text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="text-left px-4 py-2">Tipo</th>
                    <th className="text-left px-4 py-2">Lingua</th>
                    <th className="text-left px-4 py-2">Livello</th>
                    <th className="text-left px-4 py-2">Voto</th>
                    <th className="text-left px-4 py-2">Data</th>
                    <th className="text-left px-4 py-2">Dettagli</th>
                  </tr>
                </thead>
                <tbody>
                  {testValutati.map((t) => (
                    <tr key={t.id} className="border-b">
                      <td className="px-4 py-2">{t.tipo}</td>
                      <td className="px-4 py-2 capitalize">{t.lingua}</td>
                      <td className="px-4 py-2">{t.livello}</td>
                      <td className="px-4 py-2 font-semibold text-green-700">{t.voto}</td>
                      <td className="px-4 py-2 text-gray-500">{new Date(t.corretto_il).toLocaleDateString()}</td>
                      <td className="px-4 py-2">
                        <button
                          onClick={() => setAperto(t)}
                          className="text-blue-600 hover:underline"
                        >
                          Visualizza
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {aperto && (
          <div className="fixed top-0 right-0 w-full md:w-[500px] h-full bg-white border-l shadow-xl p-6 z-50 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">📋 Test {aperto.tipo} ({aperto.lingua.toUpperCase()})</h2>
              <button onClick={() => setAperto(null)} className="text-gray-600 hover:text-black">✕</button>
            </div>
            <p className="text-sm text-gray-500 mb-1">Livello: {aperto.livello}</p>
            <p className="text-sm text-gray-500 mb-4">Data correzione: {new Date(aperto.corretto_il).toLocaleDateString()}</p>
            <p className="text-sm font-semibold text-green-700 mb-2">Voto: {aperto.voto}/10</p>
            <p className="text-sm mb-4 whitespace-pre-wrap text-gray-800">💬 Commento: {aperto.commento}</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
