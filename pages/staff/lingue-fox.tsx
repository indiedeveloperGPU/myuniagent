// File aggiornato Lingue-Fox
import { useEffect, useState, useRef } from "react";
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
  const [voto, setVoto] = useState<number | null>(null);
  const [quizCorretto, setQuizCorretto] = useState<any[]>([]);
  const pannelloRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pannelloRef.current && !pannelloRef.current.contains(event.target as Node)) {
        setAperta(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const caricaRichieste = async () => {
      setLoading(true);

      const [grammatica, vocabolario, certificazioni] = await Promise.all([
        supabase.from("teoria_quiz_risposte").select("id,user_id,lingua,livello,stato,risposte,contenuto_id,created_at"),
        supabase.from("vocabolario_risposte").select("id,user_id,lingua,livello,stato,risposte,contenuto_id,created_at"),
        supabase.from("certificazioni_risposte").select("id,user_id,lingua,livello,stato,risposte,contenuto_id,created_at")
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
        contenuto: { risposte: r.risposte, contenuto_id: r.contenuto_id },
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
        contenuto: { risposte: r.risposte, contenuto_id: r.contenuto_id },
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
        contenuto: { risposte: r.risposte, contenuto_id: r.contenuto_id },
        tabella: "certificazioni_risposte"
      }));

      tutte.sort((a, b) => b.data.localeCompare(a.data));
      setRichieste(tutte);
      setLoading(false);
    };

    caricaRichieste();
  }, []);

  useEffect(() => {
    const caricaQuiz = async () => {
      if (!aperta) return;
      let tabella = "";
      if (aperta.tipo === "Grammatica") tabella = "teoria_contenuti";
      if (aperta.tipo === "Vocabolario") tabella = "vocabolario";
      if (aperta.tipo === "Certificazione") tabella = "certificazioni";

      const { data } = await supabase.from(tabella).select("quiz").eq("id", aperta.contenuto.contenuto_id).single();
      if (data?.quiz) setQuizCorretto(data.quiz);
    };
    caricaQuiz();
  }, [aperta]);

  const valutaRichiesta = async () => {
    if (!aperta) return;

    const feedbackLower = feedback.trim().toLowerCase();
    if (["valutato", "in_attesa"].includes(feedbackLower)) {
      alert("Il messaggio non può contenere parole riservate come 'valutato' o 'in_attesa'.");
      return;
    }

    await supabase.from(aperta.tabella).update({
      stato: "corretto",
      feedback,
      voto,
      notificato: true,
      updated_at: new Date().toISOString()
    }).eq("id", aperta.id);

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
    setQuizCorretto([]);
    setVoto(null);
  };

  return (
    <StaffLayout>
      <div className="max-w-6xl mx-auto relative">
        <h1 className="text-2xl font-bold mb-6">🥊 Richieste Lingue – Agente Fox</h1>

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
          <div ref={pannelloRef} className="fixed top-0 right-0 w-full sm:w-[400px] h-full bg-white shadow-xl border-l p-5 overflow-y-auto z-50">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">📝 Valutazione richiesta</h2>
              <button onClick={() => setAperta(null)} className="text-gray-600 hover:text-black">&times;</button>
            </div>

            <p className="text-sm mb-1 text-gray-500">Utente: {aperta.utente}</p>
            <p className="text-sm mb-3 text-gray-500">Tipo: {aperta.tipo} | Lingua: {aperta.lingua} | Livello: {aperta.livello}</p>

            <div className="space-y-4">
              {quizCorretto.map((q, index) => {
                const rispostaUtente = aperta.contenuto.risposte[index];
                const rispostaData = typeof rispostaUtente === "object" && rispostaUtente !== null ? rispostaUtente.risposta_utente : rispostaUtente;
                const rispostaCorretta = typeof rispostaUtente === "object" && rispostaUtente !== null ? rispostaUtente.risposta_corretta : q.risposta;
                const normalizza = (val: any) => typeof val === "string" ? val.trim().toLowerCase() : String(val);
                const corretto = Array.isArray(rispostaCorretta)
                  ? rispostaCorretta.map(normalizza).includes(normalizza(rispostaData))
                  : normalizza(rispostaData) === normalizza(rispostaCorretta);

                return (
                  <div key={index} className="bg-gray-50 border rounded p-3">
                    <p className="text-sm font-medium">🔹 Domanda {index + 1}</p>
                    <p className="text-sm text-gray-800 font-semibold mb-1">{q.domanda}</p>
                    {q.opzioni && q.opzioni.length > 0 && (
                      <ul className="text-sm ml-4 list-disc text-gray-600 mb-2">
                        {q.opzioni.map((opt: string, i: number) => (
                          <li key={i}>{opt}</li>
                        ))}
                      </ul>
                    )}
                    {corretto ? (
                      <p className="text-green-600 font-bold mt-2">✅ Corretta</p>
                    ) : (
                      <div className="mt-2">
                        <p className="text-red-600 font-bold">❌ Risposta utente: {String(rispostaData)}</p>
                        <p className="text-green-600 font-bold mt-1">✅ Risposta corretta: {Array.isArray(rispostaCorretta) ? rispostaCorretta[0] : rispostaCorretta}</p>
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="mt-6">
                <label className="block text-sm font-medium mb-1">Feedback</label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="w-full border p-2 rounded"
                  rows={4}
                  placeholder="Scrivi qui la valutazione..."
                />
                <div className="mt-4">
                  <label className="block text-sm font-medium mb-1">Voto (0–10)</label>
                  <input
                    type="number"
                    value={voto ?? ""}
                    onChange={(e) => setVoto(Number(e.target.value))}
                    className="w-full border p-2 rounded"
                    min={0}
                    max={10}
                    placeholder="Inserisci un voto"
                  />
                </div>
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

LingueFox.requireAuth = true;
