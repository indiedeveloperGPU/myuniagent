import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

export default function Home() {
  return (
    <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 dark:from-gray-900 dark:to-gray-800 text-white min-h-screen">
      {/* Navbar */}
      <header className="fixed top-0 left-0 w-full z-50 bg-gradient-to-r from-indigo-700 via-purple-700 to-pink-700/90 backdrop-blur border-b border-white/20 shadow">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
          <Link href="/">
            <span className="text-xl font-bold text-white">MyUniAgent</span>
          </Link>
          <div className="space-x-6 hidden md:flex">
            <Link href="#features" className="text-gray-300 hover:text-white transition">Funzionalità</Link>
            <Link href="/fox" className="text-gray-300 hover:text-white transition">Agente Fox</Link>
            <Link href="/auth" className="text-blue-400 hover:underline">Accedi</Link>
          </div>
        </nav>
      </header>

      <main className="pt-20">
        {/* Hero Section */}
        <section className="text-center py-24 px-6">
          <motion.h1 initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-4xl sm:text-5xl font-bold mb-4">
            🎓 MyUniAgent: il tuo assistente accademico intelligente
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="text-lg text-gray-200 max-w-2xl mx-auto mb-6">
            Spiegazioni avanzate, analisi tesi, supporto per esami e Agente Fox a tua disposizione. Tutto in un'unica piattaforma.
          </motion.p>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="flex justify-center gap-4">
            <a href="#fox" className="text-blue-300 font-semibold hover:underline px-6 py-3">
              Scopri Agente Fox 🦊
            </a>
          </motion.div>
        </section>

        {/* Funzionalità */}
        <section id="features" className="py-20 px-6 max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">📚 Cosa puoi fare con MyUniAgent</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[{
              title: "📘 Spiegazioni personalizzate",
              desc: "Ricevi risposte chiare, complete e su misura per ogni tua domanda accademica."
            }, {
              title: "🧾 Analisi tesi & supporto alla scrittura",
              desc: "Carica la tua tesi, analizzala con l’AI o ricevi assistenza per scriverla al meglio."
            }, {
              title: "🧠 Simulazioni esami universitari",
              desc: "Allenati con quiz, domande orali simulate e correzioni intelligenti."
            }, {
              title: "🏫 Supporto scuole superiori",
              desc: "Test d’ingresso, ripetizioni intelligenti, contenuti mirati per studenti delle superiori."
            }, {
              title: "🗂️ Dashboard intelligente",
              desc: "Salva tutto: spiegazioni, mappe concettuali, cronologia studio e quiz svolti."
            }, {
              title: "🌍 Allenamento lingue & certificazioni",
              desc: "Studia inglese, francese e spagnolo con teoria, vocabolario e conversazione."
            }].map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} viewport={{ once: true }} className="bg-white/5 backdrop-blur-md p-6 rounded-xl border border-white/10 shadow hover:shadow-lg transition">
                <h3 className="font-bold text-lg text-white mb-2">{item.title}</h3>
                <p className="text-gray-300">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Agente Fox */}
        <section id="fox" className="py-24 px-6 border-t border-white/10 bg-black/10 backdrop-blur-md">
          <div className="max-w-4xl mx-auto text-center">
            <motion.h2 initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="text-3xl font-bold mb-4">🦊 Agente Speciale Fox</motion.h2>
            <motion.p initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }} className="text-gray-300 text-lg mb-6 max-w-2xl mx-auto">
              Una mente artificiale brillante, rapida, discreta. Agente Fox interpreta documenti, risolve domande complesse e elabora concetti tecnici con precisione. Ti affianca nel momento del bisogno e recapita la risposta direttamente nella tua area personale. Sempre attivo. Sempre pronto.
            </motion.p>
            <motion.div initial={{ scale: 0.8, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} transition={{ delay: 0.3 }} className="flex justify-center mb-6">
              <Image src="/images/agente-fox-hero.png" alt="Agente Fox" width={400} height={400} className="rounded-xl shadow-xl" />
            </motion.div>
          </div>
        </section>

        {/* CTA finale */}
        <section id="cta" className="py-20 px-6 text-center">
          <motion.h2 initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-3xl font-bold mb-4">🚀 Pronto a scoprire MyUniAgent?</motion.h2>
          <motion.p initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-lg text-gray-200 mb-6">Naviga tra le funzionalità e scopri come possiamo aiutarti nel tuo percorso accademico.</motion.p>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-black/30 backdrop-blur text-center py-6 text-sm text-gray-200">
        © {new Date().getFullYear()} MyUniAgent – Tutti i diritti riservati
      </footer>
    </div>
  );
}

