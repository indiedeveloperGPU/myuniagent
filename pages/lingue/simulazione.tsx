import DashboardLayout from "@/components/DashboardLayout";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function SimulazioneCertificazione() {
  const router = useRouter();
  const { certificazione, sezione } = router.query;

  const [loading, setLoading] = useState(true);
  const [domande, setDomande] = useState<string[]>([]);
  const [risposte, setRisposte] = useState<string[]>([]);
  const [valutazione, setValutazione] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string>("");
  const [errore, setErrore] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [submitInviato, setSubmitInviato] = useState(false);

  useEffect(() => {
    const fetchUserAndSimulazione = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        window.location.href = "/auth";
        return;
      }
      setUserId(userData.user.id);

      if (!certificazione || !sezione) return;

      setLoading(true);
      try {
        const res = await fetch("/api/simulazione", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ certificazione, sezione }),
        });

        const data = await res.json();
        if (data.error) {
          setErrore(data.error);
        } else {
          setDomande(data.domande || []);
          setRisposte(Array(data.domande.length).fill(""));
        }
      } catch (err) {
        setErrore("Errore durante la simulazione.");
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndSimulazione();
  }, [certificazione, sezione]);

  const handleChangeRisposta = (index: number, value: string) => {
    const newRisposte = [...risposte];
    newRisposte[index] = value;
    setRisposte(newRisposte);
  };

  const handleSubmit = async () => {
    if (submitInviato) return;

    if (risposte.some((r) => !r.trim())) {
      alert("Completa tutte le risposte prima di inviare.");
      return;
    }

    const rispostaUnica = domande
      .map((d, i) => `Q: ${d}\nA: ${risposte[i] || "[vuoto]"}`)
      .join("\n\n");

    setSubmitInviato(true);

    const res = await fetch("/api/simulazione-valutazione", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ certificazione, sezione, rispostaUnica }),
    });

    const data = await res.json();

    if (data.punteggio !== undefined) {
      setValutazione(data.punteggio);
      setFeedback(data.feedback || "");

      // Salvataggio su Supabase
      await supabase.from("simulazione_certificazioni").insert({
        user_id: userId,
        certificazione,
        sezione,
        risposte: rispostaUnica,
        punteggio: data.punteggio,
        feedback_gpt: data.feedback || "",
      });

      // Se il punteggio è >= 80, assegna il badge al profilo
      if (data.punteggio >= 80) {
        await supabase
          .from("profiles")
          .update({ badge_certificazione: true })
          .eq("id", userId);
      }

    } else {
      setErrore("Errore durante la valutazione.");
    }
  };

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold mb-4">🧪 Simulazione Certificazione</h1>
      {loading && <p>Caricamento domande in corso...</p>}
      {errore && <p className="text-red-600">{errore}</p>}

      {!loading && !errore && (
        <div className="space-y-4">
          <p className="text-gray-700">
            Certificazione: <strong>{certificazione}</strong><br />
            Sezione: <strong>{sezione}</strong>
          </p>

          {domande.length === 0 ? (
            <p className="text-gray-600">Nessuna domanda generata.</p>
          ) : (
            <ul className="space-y-3">
              {domande.map((d, i) => (
                <li key={i} className="p-4 border rounded bg-white shadow">
                  <strong>Domanda {i + 1}:</strong>
                  <p className="mb-2">{d}</p>
                  <textarea
                    value={risposte[i]}
                    onChange={(e) => handleChangeRisposta(i, e.target.value)}
                    className="w-full border rounded p-2"
                    rows={3}
                    placeholder="Scrivi la tua risposta qui..."
                  />
                </li>
              ))}
            </ul>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitInviato}
            className={`mt-6 px-4 py-2 rounded text-white ${
              submitInviato ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {submitInviato ? "Simulazione inviata" : "Concludi simulazione"}
          </button>

          {valutazione !== null && (
            <div className="mt-4 p-4 bg-green-100 border border-green-300 rounded">
              <p className="text-green-700 font-semibold">
                ✅ Simulazione completata. Punteggio finale: {valutazione}%
              </p>
              {feedback && (
                <p className="mt-2 text-sm text-gray-700 whitespace-pre-line">
                  <strong>Feedback personalizzato:</strong><br />
                  {feedback}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}

SimulazioneCertificazione.requireAuth = true;
