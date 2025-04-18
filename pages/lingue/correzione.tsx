import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/lib/supabaseClient";

export default function CorrezioneTesto() {
  const [userChecked, setUserChecked] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [lingua, setLingua] = useState<"en" | "fr" | "es">("en");
  const [livello, setLivello] = useState("B1");
  const [input, setInput] = useState("");
  const [corretto, setCorretto] = useState("");
  const [feedback, setFeedback] = useState("");
  const [punteggio, setPunteggio] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        window.location.href = "/auth";
        return;
      }
      setUserId(data.user.id);
      setUserChecked(true);
    };
    checkAuth();
  }, []);

  const handleSubmit = async () => {
    if (!input.trim()) return alert("Inserisci un testo da correggere.");
    setLoading(true);
    setCorretto("");
    setFeedback("");
    setPunteggio(null);

    const res = await fetch("/api/inglese", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "correction",
        input,
        livello,
        lingua,
      }),
    });

    const data = await res.json();

    if (data.result) {
      setCorretto(data.result.corretto || "");
      setFeedback(data.result.feedback || "");
      setPunteggio(data.result.punteggio || null);

      await supabase.from("correzione_testi").insert({
        user_id: userId,
        lingua,
        livello,
        testo_originale: input,
        testo_corretto: data.result.corretto || "",
        feedback: data.result.feedback || "",
        punteggio: data.result.punteggio || null,
      });
    }

    setLoading(false);
  };

  if (!userChecked) {
    return (
      <DashboardLayout>
        <p>Caricamento...</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold mb-4">✍️ Correzione del testo</h1>
      <p className="text-gray-700 mb-4">
        Scrivi un testo nella lingua selezionata (tema, email, esercizio...) e ricevi una correzione completa con suggerimenti.
      </p>

      {/* BOX INFORMATIVO */}
      <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-900 p-4 rounded mb-6">
        <h2 className="font-semibold text-lg mb-1">ℹ️ Guida Informativa</h2>
        <p className="text-sm">Scrivi un testo e riceverai:</p>
        <ul className="list-disc list-inside text-sm mt-2">
          <li>✅ La versione corretta del testo</li>
          <li>💡 Suggerimenti personalizzati</li>
          <li>📊 Un punteggio finale da 0 a 100</li>
        </ul>
        <p className="text-sm mt-2 font-medium">
          Seleziona la lingua e il livello per una valutazione più precisa.
        </p>
      </div>

      {/* Lingua */}
      <div className="mb-4">
        <label className="block font-semibold mb-1">Seleziona la lingua:</label>
        <div className="flex gap-3">
          <button
            onClick={() => setLingua("en")}
            className={`px-4 py-2 rounded border text-sm ${
              lingua === "en" ? "bg-blue-100 border-blue-600 font-semibold" : "bg-white"
            }`}
          >
            🇬🇧 Inglese
          </button>
          <button
            onClick={() => setLingua("fr")}
            className={`px-4 py-2 rounded border text-sm ${
              lingua === "fr" ? "bg-blue-100 border-blue-600 font-semibold" : "bg-white"
            }`}
          >
            🇫🇷 Francese
          </button>
          <button
            onClick={() => setLingua("es")}
            className={`px-4 py-2 rounded border text-sm ${
              lingua === "es" ? "bg-blue-100 border-blue-600 font-semibold" : "bg-white"
            }`}
          >
            🇪🇸 Spagnolo
          </button>
        </div>
      </div>

      {/* Livello */}
      <div className="mb-4">
        <label className="block font-semibold mb-1">Seleziona il tuo livello:</label>
        <select
          value={livello}
          onChange={(e) => setLivello(e.target.value)}
          className="border px-3 py-2 rounded w-full md:w-1/3"
        >
          <option value="A1">A1 (base)</option>
          <option value="A2">A2</option>
          <option value="B1">B1</option>
          <option value="B2">B2</option>
          <option value="C1">C1</option>
          <option value="C2">C2 (avanzato)</option>
        </select>
      </div>

      {/* Input */}
      <div className="mb-4">
        <label className="block font-semibold mb-1">Inserisci il tuo testo:</label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={6}
          className="border px-3 py-2 rounded w-full"
          placeholder={`Scrivi qui il testo da correggere (${lingua.toUpperCase()})...`}
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        {loading ? "Attendi..." : "Correggi il testo"}
      </button>

      {/* Output */}
      {(corretto || feedback || punteggio !== null) && (
        <div className="mt-6 p-4 bg-white border rounded shadow">
          {corretto && (
            <div className="mb-4">
              <h2 className="font-semibold mb-2">✅ Versione corretta:</h2>
              <p className="whitespace-pre-line text-gray-800">{corretto}</p>
            </div>
          )}
          {feedback && (
            <div className="mb-4">
              <h2 className="font-semibold mb-2">💡 Suggerimenti:</h2>
              <p className="whitespace-pre-line text-gray-800">{feedback}</p>
            </div>
          )}
          {punteggio !== null && (
            <div>
              <h2 className="font-semibold mb-2">📊 Punteggio:</h2>
              <p className="text-gray-800">{punteggio}/100</p>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}

CorrezioneTesto.requireAuth = true;

