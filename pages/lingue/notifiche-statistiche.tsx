// File aggiornato con modale per visualizzare test corretti
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
        supabase.from("teoria_quiz_risposte").select("id, lingua, livello, voto, feedback, updated_at").eq("user_id", user.id).eq("stato", "valutato"),
        supabase.from("vocabolario_risposte").select("id, lingua, livello, voto, feedback, updated_at").eq("user_id", user.id).eq("stato", "valutato"),
        supabase.from("certificazioni_risposte").select("id, lingua, livello, voto, feedback, updated_at").eq("user_id", user.id).eq("stato", "valutato")
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

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">📚 Sezione Notifiche e Statistiche</h1>

        {/* Notifiche e Statistiche */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <div>
            <h2 className="text-lg font-semibold mb-2">🔔 Notifiche recenti</h2>
            {notifiche.length === 0 ? <p className="text-sm text-gray-500">Nessuna notifica ricevuta.</p> : (
              <ul className="space-y-2">
                {notifiche.slice(0, 5).map((n) => (
                  <li key={n.id} className="border rounded p-3 text-sm">
                    <p className="font-semibold">{n.titolo}</p>
                    <p className="text-gray-600 mt-1">{n.messaggio}</p>
                    <p className="text-gray-400 text-xs mt-1">{new Date(n.data).toLocaleString()}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
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
        </div>

        {/* Test corretti */}
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

        {/* MODALE VISUALIZZAZIONE TEST */}
        {aperto && (
          <div className="fixed top-0 right-0 w-full md:w-[500px] h-full bg-white border-l shadow-xl p-6 z-50 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">📋 Test {aperto.tipo} ({aperto.lingua.toUpperCase()})</h2>
              <button onClick={() => setAperto(null)} className="text-gray-600 hover:text-black">✕</button>
            </div>
            <p className="text-sm text-gray-500 mb-1">Livello: {aperto.livello}</p>
            <p className="text-sm text-gray-500 mb-4">Data correzione: {new Date(aperto.corretto_il).toLocaleDateString()}</p>
            <p className="text-sm font-semibold text-green-700 mb-2">Voto: {aperto.voto}/100</p>
            <p className="text-sm mb-4 whitespace-pre-wrap text-gray-800">💬 Commento: {aperto.commento}</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

