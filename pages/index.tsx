import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] text-white min-h-screen">
      {/* Hero Section */}
      <section className="text-center py-24 px-6">
        <h1 className="text-4xl sm:text-5xl font-bold mb-4">
          🎓 MyUniAgent: il tuo assistente accademico intelligente
        </h1>
        <p className="text-lg text-gray-200 max-w-2xl mx-auto mb-6">
          Spiegazioni avanzate, analisi tesi, supporto per esami e Agente Fox a tua disposizione. Tutto in un'unica piattaforma.
        </p>
        <div className="flex justify-center gap-4">
          <Link href="/auth" className="bg-blue-600 text-white px-6 py-3 rounded-lg shadow hover:bg-blue-700">
            Inizia gratis
          </Link>
          <a href="#fox" className="text-blue-300 font-semibold hover:underline px-6 py-3">
            Scopri Agente Fox 🦊
          </a>
        </div>
      </section>

      {/* Cosa puoi fare */}
      <section className="py-20 px-6 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12">📚 Cosa puoi fare con MyUniAgent</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="bg-white bg-opacity-10 backdrop-blur p-6 border rounded shadow-sm">
            <h3 className="font-bold text-lg mb-2">📘 Spiegazioni personalizzate</h3>
            <p>Ricevi risposte chiare, complete e su misura per ogni tua domanda accademica.</p>
          </div>
          <div className="bg-white bg-opacity-10 backdrop-blur p-6 border rounded shadow-sm">
            <h3 className="font-bold text-lg mb-2">🧾 Analisi tesi & supporto alla scrittura</h3>
            <p>Carica la tua tesi, analizzala con l’AI o ricevi assistenza per scriverla al meglio.</p>
          </div>
          <div className="bg-white bg-opacity-10 backdrop-blur p-6 border rounded shadow-sm">
            <h3 className="font-bold text-lg mb-2">🧠 Simulazioni esami universitari</h3>
            <p>Allenati con quiz, domande orali simulate e correzioni intelligenti.</p>
          </div>
          <div className="bg-white bg-opacity-10 backdrop-blur p-6 border rounded shadow-sm">
            <h3 className="font-bold text-lg mb-2">🏫 Supporto scuole superiori</h3>
            <p>Test d’ingresso, ripetizioni intelligenti, contenuti mirati per studenti delle superiori.</p>
          </div>
          <div className="bg-white bg-opacity-10 backdrop-blur p-6 border rounded shadow-sm">
            <h3 className="font-bold text-lg mb-2">🗂️ Dashboard intelligente</h3>
            <p>Salva tutto: spiegazioni, mappe concettuali, cronologia studio e quiz svolti.</p>
          </div>
        </div>
      </section>

      {/* Agente Fox */}
      <section id="fox" className="py-24 px-6 border-t border-gray-700">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">🦊 Agente Speciale Fox</h2>
          <p className="text-gray-300 text-lg mb-6">
            Non un semplice bot, ma un agente segreto dell'apprendimento. Analizza PDF, interpreta concetti complessi, e ti risponde con cura. 100% supporto umano + AI avanzata.
          </p>

          <div className="flex justify-center mb-6">
            <Image src="/images/agente-fox-hero.png" alt="Agente Fox" width={400} height={400} className="rounded-xl shadow-xl" />
          </div>

          <ul className="text-left max-w-xl mx-auto space-y-2 text-gray-200">
            <li>✅ Risposte reali da operatori esperti</li>
            <li>✅ Supporta PDF, appunti, domande tecniche</li>
            <li>✅ Nessuna attesa infinita: ti avvisa quando ha la risposta</li>
            <li>✅ Accessibile dalla tua dashboard in ogni momento</li>
          </ul>

          <div className="mt-8">
            <Link href="/auth" className="bg-orange-600 text-white px-6 py-3 rounded hover:bg-orange-700">
              Attiva Agente Fox ora
            </Link>
          </div>
        </div>
      </section>

      {/* CTA finale */}
      <section className="py-20 px-6 text-center">
        <h2 className="text-3xl font-bold mb-4">🚀 Pronto a studiare in modo intelligente?</h2>
        <p className="text-lg text-gray-200 mb-6">Unisciti a migliaia di studenti che usano MyUniAgent ogni giorno per superare esami e scrivere tesi con successo.</p>
        <Link href="/auth" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700">
          Inizia ora gratuitamente
        </Link>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-center py-6 text-sm text-gray-400">
        © {new Date().getFullYear()} MyUniAgent – Tutti i diritti riservati
      </footer>
    </div>
  );
}


