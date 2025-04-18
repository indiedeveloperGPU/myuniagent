// pages/docente/test/[id].tsx
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import DocenteLayout from "@/components/DocenteLayout";

function DettaglioTestPage() {
  const router = useRouter();
  const { id } = router.query;

  const [test, setTest] = useState<any>(null);
  const [domande, setDomande] = useState<any[]>([]);
  const [nuovaDomanda, setNuovaDomanda] = useState("");
  const [nuovaRisposta, setNuovaRisposta] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [correggendo, setCorreggendo] = useState(false);
  const [livello, setLivello] = useState("intermedio");
  const [risultatiCorrezione, setRisultatiCorrezione] = useState<any[]>([]);

  useEffect(() => {
    if (!id) return;

    const fetchDati = async () => {
      setLoading(true);

      const { data: testData } = await supabase
        .from("test_esercizi")
        .select("*")
        .eq("id", id)
        .single();

      const { data: domandeData } = await supabase
        .from("test_domande")
        .select("*")
        .eq("test_id", id)
        .order("creata_il", { ascending: true });

      setTest(testData);
      setDomande(domandeData || []);
      setLoading(false);
    };

    fetchDati();
  }, [id]);

  const aggiungiDomanda = async () => {
    if (!nuovaDomanda || !nuovaRisposta) return;

    const { error } = await supabase.from("test_domande").insert({
      test_id: id,
      domanda: nuovaDomanda,
      risposta: nuovaRisposta,
    });

    if (!error) {
      setNuovaDomanda("");
      setNuovaRisposta("");
      const { data: aggiornata } = await supabase
        .from("test_domande")
        .select("*")
        .eq("test_id", id)
        .order("creata_il", { ascending: true });
      setDomande(aggiornata || []);
    }
  };

  const eliminaDomanda = async (domandaId: string) => {
    await supabase.from("test_domande").delete().eq("id", domandaId);
    setDomande((prev) => prev.filter((d) => d.id !== domandaId));
  };

  const generaDomandeAutomatiche = async () => {
    if (!test?.titolo || !test?.tipo) return;
    setGenerating(true);

    try {
      const res = await fetch("/api/test/genera", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titolo: test.titolo,
          tipo: test.tipo,
          livello,
        }),
      });

      const { domande: generate } = await res.json();

      const domandeFormattate = generate.map((d: any) => ({
        test_id: id,
        domanda: d.domanda,
        risposta: d.risposta,
      }));

      const { error } = await supabase.from("test_domande").insert(domandeFormattate);

      if (!error) {
        const { data: aggiornata } = await supabase
          .from("test_domande")
          .select("*")
          .eq("test_id", id)
          .order("creata_il", { ascending: true });
        setDomande(aggiornata || []);
      } else {
        alert("Errore durante il salvataggio.");
      }
    } catch (err) {
      alert("Errore nella generazione automatica.");
    }

    setGenerating(false);
  };

  const correggiRisposte = async () => {
    if (!id) return;
    setCorreggendo(true);

    try {
      const { data: risposteData } = await supabase
        .from("test_risposte")
        .select("studente_id, risposte")
        .eq("test_id", id);

      if (!risposteData || risposteData.length === 0) {
        alert("Nessuna risposta da correggere.");
        setCorreggendo(false);
        return;
      }

      const risultatiTotali: any[] = [];

      for (const risposta of risposteData) {
        const res = await fetch("/api/correggi-test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            testId: id,
            risposteStudente: risposta.risposte,
          }),
        });

        const { risultati } = await res.json();

        const media = Math.round(
          risultati.reduce((acc: number, r: any) => acc + (r.punteggioSingolo || 0), 0) /
            risultati.length
        );

        await supabase.from("test_valutazioni").insert({
          test_id: id,
          studente_id: risposta.studente_id,
          valutazione_completa: risultati,
          media_punteggio: media,
        });

        risultatiTotali.push({
          studente_id: risposta.studente_id,
          risultati,
          media,
        });
      }

      setRisultatiCorrezione(risultatiTotali);
    } catch (err) {
      console.error("Errore correzione:", err);
      alert("Errore durante la correzione.");
    }

    setCorreggendo(false);
  };

  if (loading || !test) {
    return (
      <DocenteLayout>
        <p className="text-gray-600 italic">⏳ Caricamento dati test...</p>
      </DocenteLayout>
    );
  }

  return (
    <DocenteLayout>
      <h1 className="text-2xl font-bold mb-4">📘 Test: {test.titolo}</h1>
      <p className="text-sm text-gray-600 mb-6">Tipo: {test.tipo}</p>

      {/* Generazione GPT */}
      <div className="bg-white border p-4 rounded mb-6">
        <h2 className="text-lg font-semibold mb-2">🪄 Genera domande automaticamente</h2>
        <select
          value={livello}
          onChange={(e) => setLivello(e.target.value)}
          className="w-full border p-2 rounded mb-3"
        >
          <option value="base">Livello base</option>
          <option value="intermedio">Livello intermedio</option>
          <option value="avanzato">Livello avanzato</option>
        </select>
        <button
          onClick={generaDomandeAutomatiche}
          disabled={generating}
          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 w-full"
        >
          {generating ? "Generazione in corso..." : "Genera domande"}
        </button>
      </div>

      {/* Inserimento manuale */}
      <div className="mb-6 bg-white border p-4 rounded">
        <h2 className="text-lg font-semibold mb-2">➕ Aggiungi domanda manualmente</h2>
        <input
          type="text"
          value={nuovaDomanda}
          onChange={(e) => setNuovaDomanda(e.target.value)}
          placeholder="Inserisci domanda"
          className="w-full border p-2 rounded mb-2"
        />
        <textarea
          value={nuovaRisposta}
          onChange={(e) => setNuovaRisposta(e.target.value)}
          placeholder="Risposta corretta"
          rows={2}
          className="w-full border p-2 rounded mb-2"
        />
        <button
          onClick={aggiungiDomanda}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Aggiungi
        </button>
      </div>

      {/* Lista domande */}
      <h2 className="text-lg font-semibold mb-2">📋 Domande del test</h2>
      {domande.length === 0 ? (
        <p className="text-gray-500">Nessuna domanda inserita.</p>
      ) : (
        <ul className="space-y-3">
          {domande.map((d) => (
            <li key={d.id} className="bg-gray-100 p-4 rounded">
              <p className="font-semibold mb-1">{d.domanda}</p>
              <p className="text-sm text-gray-700 mb-2">Risposta: {d.risposta}</p>
              <button
                onClick={() => eliminaDomanda(d.id)}
                className="text-red-600 text-sm hover:underline"
              >
                Elimina
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Correzione GPT */}
      <div className="mb-10 mt-8 bg-white p-4 border rounded">
        <h2 className="text-lg font-semibold mb-2">🧠 Correzione automatica GPT</h2>
        <p className="text-sm text-gray-600 mb-3">
          Correggi tutte le risposte inviate dagli studenti usando GPT-4.
        </p>
        <button
          onClick={correggiRisposte}
          disabled={correggendo}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          {correggendo ? "Correzione in corso..." : "Correggi risposte degli studenti"}
        </button>
      </div>

      {/* Risultati GPT */}
      {risultatiCorrezione.length > 0 && (
        <div className="mb-12 mt-6">
          <h2 className="text-lg font-semibold mb-2">📊 Risultati correzione GPT</h2>
          {risultatiCorrezione.map((r) => (
            <div key={r.studente_id} className="mb-4 bg-white p-4 border rounded">
              <p className="font-semibold text-sm text-gray-700 mb-2">
                Studente ID: {r.studente_id} – Media: <strong>{r.media}/100</strong>
              </p>
              <ul className="space-y-2 text-sm">
                {r.risultati.map((d: any, index: number) => (
                  <li key={index} className="bg-gray-100 p-3 rounded">
                    <p className="font-semibold">Domanda: {d.domanda}</p>
                    <p>Risposta studente: {d.rispostaStudente}</p>
                    <p>✅ Valutazione: {d.valutazioneGPT}</p>
                    <p>🎯 Punteggio: <strong>{d.punteggioSingolo}/100</strong></p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </DocenteLayout>
  );
}

import { withAccess } from "@/lib/withRole";
export default withAccess(DettaglioTestPage, ["docente"]);


