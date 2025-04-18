import { useEffect, useRef, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/lib/supabaseClient";

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function ConversazioneSimulata() {
  const [userChecked, setUserChecked] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [scenario, setScenario] = useState("ristorante");
  const [inputCustom, setInputCustom] = useState("");
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [userInput, setUserInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [loading, setLoading] = useState(false);
  const [valutazione, setValutazione] = useState<{ scrittura: number; pronuncia: number } | null>(null);
  const [lingua, setLingua] = useState<"en" | "fr" | "es">("en");
  const [livello, setLivello] = useState("B1");

  const languageOptions = [
    { code: "en", label: "🇬🇧 Inglese" },
    { code: "fr", label: "🇫🇷 Francese" },
    { code: "es", label: "🇪🇸 Spagnolo" },
  ];

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

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  const startRecording = () => {
    if (!SpeechRecognition) return alert("Il tuo browser non supporta il riconoscimento vocale.");

    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.lang = lingua === "en" ? "en-US" : lingua === "fr" ? "fr-FR" : "es-ES";
    recognitionRef.current.continuous = false;

    recognitionRef.current.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      handleSend(transcript);
    };

    recognitionRef.current.onend = () => setIsRecording(false);
    recognitionRef.current.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    recognitionRef.current?.stop();
    setIsRecording(false);
  };

  const handleSend = async (text: string) => {
    if (!text.trim()) return;

    const newUserMessage = { role: "user", content: text };
    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    setUserInput("");
    setLoading(true);

    const res = await fetch("/api/inglese", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "conversation",
        lingua,
        livello,
        messages: updatedMessages,
        scenario: inputCustom || scenario,
      }),
    });

    const data = await res.json();
    const aiMessage = { role: "assistant", content: data.result };
    setMessages([...updatedMessages, aiMessage]);
    setLoading(false);

    const utterance = new SpeechSynthesisUtterance(data.result);
    utterance.lang = lingua === "en" ? "en-US" : lingua === "fr" ? "fr-FR" : "es-ES";
    utterance.rate = 1;
    speechSynthesis.speak(utterance);
  };

  const terminaConversazione = async () => {
    if (messages.length === 0 || !userId) return;
    setLoading(true);

    const res = await fetch("/api/inglese", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "conversation",
        lingua,
        livello,
        messages,
        scenario: inputCustom || scenario,
        valuta: true,
      }),
    });

    const data = await res.json();
    const punteggio = {
      scrittura: data.result.punteggio_scrittura || 0,
      pronuncia: data.result.punteggio_pronuncia || 0,
    };
    setValutazione(punteggio);

    await supabase.from("conversazione_risultati").insert([
      {
        user_id: userId,
        lingua,
        livello,
        scenario: inputCustom || scenario,
        punteggio_scrittura: punteggio.scrittura,
        punteggio_pronuncia: punteggio.pronuncia,
      },
    ]);

    setLoading(false);
  };

  const resetConversazione = () => {
    setMessages([]);
    setValutazione(null);
    setUserInput("");
  };

  if (!userChecked) {
    return (
      <DashboardLayout>
        <p>Caricamento in corso...</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold mb-4">🎤 Conversazione Simulata</h1>
      <p className="text-gray-700 mb-4">
        Parla o scrivi con un assistente AI. Puoi scegliere uno scenario oppure inserire un contesto libero. Riceverai una valutazione finale!
      </p>

      {/* INFO BOX */}
      <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-900 p-4 rounded mb-6">
        <h2 className="font-semibold text-lg mb-1">ℹ️ Guida alla conversazione</h2>
        <p className="text-sm">
          Scegli una lingua e uno scenario. Parla o scrivi per avviare la conversazione con l’AI.
          Alla fine riceverai una valutazione sulla scrittura e la pronuncia.
        </p>
        <p className="mt-2 text-sm font-medium">🎧 L’AI ti risponderà anche vocalmente.</p>
      </div>

      {/* Lingua */}
      <div className="mb-4">
        <label className="block font-semibold mb-1">Lingua:</label>
        <div className="flex gap-3">
          {languageOptions.map((opt) => (
            <button
              key={opt.code}
              onClick={() => setLingua(opt.code as "en" | "fr" | "es")}
              className={`px-4 py-2 rounded border text-sm ${
                lingua === opt.code ? "bg-blue-100 border-blue-600 font-semibold" : "bg-white"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Livello */}
      <div className="mb-4">
        <label className="block font-semibold mb-1">Livello:</label>
        <select
          value={livello}
          onChange={(e) => setLivello(e.target.value)}
          className="border rounded px-3 py-2 w-full md:w-1/2"
        >
          <option value="A1">A1 - Base</option>
          <option value="A2">A2 - Elementare</option>
          <option value="B1">B1 - Intermedio</option>
          <option value="B2">B2 - Intermedio avanzato</option>
          <option value="C1">C1 - Avanzato</option>
          <option value="C2">C2 - Proficiente</option>
        </select>
      </div>

      {/* Scenario */}
      <div className="mb-4 space-y-2">
        <label className="block font-semibold">Scenario:</label>
        <select
          value={scenario}
          onChange={(e) => setScenario(e.target.value)}
          className="border rounded px-3 py-2 w-full md:w-1/2"
        >
          <option value="ristorante">Al ristorante</option>
          <option value="aeroporto">In aeroporto</option>
          <option value="hotel">In hotel</option>
          <option value="colloquio">Colloquio di lavoro</option>
          <option value="scuola">A scuola</option>
          <option value="medico">Dal medico</option>
        </select>
        <input
          type="text"
          placeholder="Oppure inserisci un contesto personalizzato"
          value={inputCustom}
          onChange={(e) => setInputCustom(e.target.value)}
          className="border px-3 py-2 rounded w-full"
        />
      </div>

      {/* Chat */}
      <div className="mb-4 max-h-80 overflow-y-auto border p-3 rounded bg-white shadow space-y-3">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`max-w-[80%] px-4 py-2 rounded-lg ${
              msg.role === "user"
                ? "bg-blue-100 self-end ml-auto"
                : "bg-green-100 self-start mr-auto"
            }`}
          >
            <p className="text-sm text-gray-800">{msg.content}</p>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="flex flex-col md:flex-row gap-2 items-center mb-4">
        <input
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="Scrivi la tua frase..."
          className="border px-3 py-2 rounded w-full"
        />
        <button
          onClick={() => handleSend(userInput)}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Invia
        </button>
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`relative flex items-center gap-2 ${
            isRecording ? "bg-red-600" : "bg-green-600"
          } text-white px-4 py-2 rounded hover:opacity-80`}
        >
          {isRecording ? "Stop 🎙️" : "Parla 🎤"}
          {isRecording && (
            <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-white opacity-75 right-2 top-2" />
          )}
        </button>
      </div>

      {/* Pulsanti finali */}
      <div className="flex gap-3 flex-wrap mb-6">
        <button
          onClick={terminaConversazione}
          disabled={loading}
          className="bg-purple-700 text-white px-4 py-2 rounded hover:bg-purple-800"
        >
          ✅ Termina e ricevi valutazione
        </button>
        <button
          onClick={resetConversazione}
          className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
        >
          🔄 Nuova conversazione
        </button>
      </div>

      {/* Valutazione */}
      {valutazione && (
        <div className="mt-6 p-4 border rounded bg-white shadow text-gray-800">
          <h3 className="text-lg font-semibold mb-2">📝 Valutazione finale</h3>
          <p>Punteggio scrittura: <strong>{valutazione.scrittura}%</strong></p>
          <p>Punteggio pronuncia: <strong>{valutazione.pronuncia}%</strong></p>
        </div>
      )}
    </DashboardLayout>
  );
}

ConversazioneSimulata.requireAuth = true;


