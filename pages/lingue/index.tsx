import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import Link from "next/link";

export default function AllenamentoLingueIndex() {
  const [lingua, setLingua] = useState("en");

  return (
    <DashboardLayout>
      <h1 className="text-3xl font-bold mb-6">🌍 Allenamento Lingue</h1>
      <p className="text-gray-700 mb-6">
        Scegli una lingua e una modalità per migliorare le tue competenze linguistiche:
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href={`/lingue/teoria?lang=${lingua}`}>
          <div className="cursor-pointer border rounded-lg p-6 shadow hover:bg-blue-50 transition">
            <h2 className="text-xl font-semibold mb-2">📚 Teoria grammaticale</h2>
            <p className="text-gray-600 text-sm">
              Approfondisci le regole grammaticali della lingua selezionata.
            </p>
          </div>
        </Link>

        <Link href={`/lingue/vocabolario?lang=${lingua}`}>
          <div className="cursor-pointer border rounded-lg p-6 shadow hover:bg-blue-50 transition">
            <h2 className="text-xl font-semibold mb-2">🧠 Vocabolario tematico</h2>
            <p className="text-gray-600 text-sm">
              Allenati su parole e frasi legate a contesti reali e tematici.
            </p>
          </div>
        </Link>

        <Link href={`/lingue/conversazione?lang=${lingua}`}>
          <div className="cursor-pointer border rounded-lg p-6 shadow hover:bg-blue-50 transition">
            <h2 className="text-xl font-semibold mb-2">🎤 Conversazione simulata</h2>
            <p className="text-gray-600 text-sm">
              Parla nella lingua selezionata con una simulazione vocale interattiva.
            </p>
          </div>
        </Link>

        <Link href={`/lingue/correzione?lang=${lingua}`}>
          <div className="cursor-pointer border rounded-lg p-6 shadow hover:bg-blue-50 transition">
            <h2 className="text-xl font-semibold mb-2">✍️ Correzione del testo</h2>
            <p className="text-gray-600 text-sm">
              Scrivi nella lingua selezionata e ricevi correzioni intelligenti.
            </p>
          </div>
        </Link>

        <Link href={`/lingue/certificazioni?lang=${lingua}`}>
          <div className="cursor-pointer border rounded-lg p-6 shadow hover:bg-blue-50 transition">
            <h2 className="text-xl font-semibold mb-2">📝 Simulazioni Certificazioni</h2>
            <p className="text-gray-600 text-sm">
              Metti alla prova le tue competenze con test reali (IELTS, DELE, DELF…).
            </p>
          </div>
        </Link>

        <Link href={`/lingue/cronologia?lang=${lingua}`}>
          <div className="cursor-pointer border rounded-lg p-6 shadow hover:bg-blue-50 transition">
            <h2 className="text-xl font-semibold mb-2">📂 Cronologia</h2>
            <p className="text-gray-600 text-sm">
              Rivedi tutto il lavoro svolto nelle varie modalità e lingue.
            </p>
          </div>
        </Link>
      </div>
    </DashboardLayout>
  );
}

AllenamentoLingueIndex.requireAuth = true;
