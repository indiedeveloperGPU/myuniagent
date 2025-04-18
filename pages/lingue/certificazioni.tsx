import DashboardLayout from "@/components/DashboardLayout";
import { useState } from "react";

type Lingua = "en" | "fr" | "es";

export default function SimulazioniCertificazioni() {
  const [lingua, setLingua] = useState<Lingua>("en");
  const [certificazione, setCertificazione] = useState("");
  const [sezione, setSezione] = useState("");
  const [step, setStep] = useState(1);

  const certificazioni: Record<Lingua, string[]> = {
    en: ["IELTS", "TOEFL", "Cambridge B2 First (FCE)", "Cambridge C1 Advanced (CAE)", "Cambridge C2 Proficiency (CPE)", "Trinity"],
    fr: ["DELF", "DALF", "TCF", "TEF"],
    es: ["DELE A2", "DELE B1", "DELE B2", "SIELE"],
  };

  const sezioni = ["Reading", "Writing", "Listening", "Speaking"];

  const lingueDisponibili = [
    { value: "en", label: "🇬🇧 Inglese" },
    { value: "fr", label: "🇫🇷 Francese" },
    { value: "es", label: "🇪🇸 Spagnolo" },
  ];

  const handleAvanti = () => {
    if (step === 1 && certificazione) setStep(2);
    else if (step === 2 && sezione) setStep(3);
  };

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold mb-4">📝 Simulazioni Certificazioni</h1>
      <p className="text-gray-700 mb-6">
        Allenati per superare le certificazioni ufficiali della lingua selezionata.
        Seleziona la lingua, la certificazione e la sezione da simulare.
      </p>

      {/* 🌐 Selettore lingua */}
      <div className="mb-6">
        <label className="block font-semibold mb-1">🌍 Lingua:</label>
        <select
          value={lingua}
          onChange={(e) => {
            setLingua(e.target.value as Lingua);
            setCertificazione("");
            setSezione("");
            setStep(1);
          }}
          className="border px-3 py-2 rounded w-full max-w-xs"
        >
          {lingueDisponibili.map((l) => (
            <option key={l.value} value={l.value}>{l.label}</option>
          ))}
        </select>
      </div>

      {/* ℹ️ BOX INFORMATIVO */}
      <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-900 p-4 rounded mb-6">
        <h2 className="font-semibold text-lg mb-1">ℹ️ Come funziona</h2>
        <p className="text-sm">
          Questa sezione ti permette di esercitarti sulle principali certificazioni ufficiali per la lingua selezionata con simulazioni personalizzate.
        </p>
        <p className="text-sm mt-2">
          Potrai scegliere la certificazione e la sezione da simulare (Reading, Writing, Listening o Speaking).
        </p>
        <p className="text-sm mt-2 font-medium">
          Dopo la simulazione, riceverai un feedback dettagliato e un punteggio basato sulle tue risposte.
        </p>
      </div>

      {/* STEP 1 */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">1. Scegli la certificazione:</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {certificazioni[lingua].map((c: string) => (
              <button
                key={c}
                className={`border px-4 py-2 rounded text-left w-full ${
                  certificazione === c ? "bg-blue-100 border-blue-600" : ""
                }`}
                onClick={() => setCertificazione(c)}
              >
                {c}
              </button>
            ))}
          </div>
          <button
            onClick={handleAvanti}
            disabled={!certificazione}
            className={`mt-4 px-4 py-2 rounded text-white ${
              certificazione ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-400 cursor-not-allowed"
            }`}
          >
            Avanti
          </button>
        </div>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">2. Seleziona la sezione da simulare:</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sezioni.map((s) => (
              <button
                key={s}
                className={`border px-4 py-2 rounded text-left w-full ${
                  sezione === s ? "bg-green-100 border-green-600" : ""
                }`}
                onClick={() => setSezione(s)}
              >
                {s}
              </button>
            ))}
          </div>
          <button
            onClick={handleAvanti}
            disabled={!sezione}
            className={`mt-4 px-4 py-2 rounded text-white ${
              sezione ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-400 cursor-not-allowed"
            }`}
          >
            Avanti
          </button>
        </div>
      )}

      {/* STEP 3 */}
      {step === 3 && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-2">🚀 Pronto per iniziare</h2>
          <p className="text-gray-700 mb-4">
            Lingua: <strong>{lingueDisponibili.find((l) => l.value === lingua)?.label}</strong> <br />
            Certificazione: <strong>{certificazione}</strong> <br />
            Sezione: <strong>{sezione}</strong>
          </p>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
            Inizia simulazione
          </button>
        </div>
      )}
    </DashboardLayout>
  );
}

SimulazioniCertificazioni.requireAuth = true;


