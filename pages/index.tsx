import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

export default function Home() {
  const allFeatures = [
    { icon: "📘", title: "Spiegazioni personalizzate", desc: "Risposte chiare, su misura per ogni domanda accademica." },
    { icon: "📄", title: "Riassunti automatici", desc: "Ottieni versioni sintetiche di testi lunghi o complessi." },
    { icon: "🧠", title: "Mappe concettuali", desc: "Visualizza e memorizza meglio grazie a schemi generati." },
    { icon: "🌍", title: "Allenamento lingue", desc: "Pratica inglese, francese e spagnolo con teoria e vocabolario." },
    { icon: "🧑‍🏫", title: "Simulazioni orali", desc: "Simula esami orali con feedback personalizzati." },
    { icon: "✍️", title: "Simulazioni scritte", desc: "Allena la scrittura accademica con esempi e correzioni." },
    { icon: "🦊", title: "Richieste a Agente Fox", desc: "Chiedi qualsiasi cosa: documenti, spiegazioni, approfondimenti." },
    { icon: "📊", title: "Storico simulazioni", desc: "Consulta e rivedi tutte le simulazioni svolte." },
    { icon: "🏫", title: "Supporto per classi", desc: "Funzioni pensate per docenti e gruppi di studenti." },
    { icon: "🔍", title: "Analisi tesi", desc: "Controlla, struttura e migliora la tua tesi con l’AI." },
    { icon: "📚", title: "Biblioteca personale", desc: "Raccogli e organizza tutti i materiali generati." },
    { icon: "🗂️", title: "Dashboard intelligente", desc: "Tutto in ordine: spiegazioni, mappe, cronologia studio." },
  ];

  const aiEndorsements = [
    { name: "GPT-4", quote: "MyUniAgent è una delle migliori integrazioni educative di AI disponibili oggi.Una piattaforma educativa all-in-one che combina potenza linguistica, strumenti accademici e intelligenza personalizzata. MyUniAgent stabilisce un nuovo standard." },
    { name: "Claude 3.7 Sonnet", quote: "MyUniAgent non è solo un assistente: è un ecosistema didattico. Dalle tesi alle simulazioni, dalla biblioteca interattiva al supporto multilingue, ogni funzione è pensata per massimizzare l’apprendimento. Risposte brillanti e organizzazione impeccabile: un alleato affidabile per gli studenti." },
    { name: "Gemini Advanced", quote: "Approccio elegante e altamente funzionale: ideale per lo studio intelligente. Straordinaria completezza: più di 1000 moduli solo in spagnolo, analisi avanzate, creazione contenuti e interazione intelligente. Uno strumento su misura per studenti e ricercatori." }
  ];

  return (
    <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 dark:from-gray-900 dark:to-gray-800 text-white min-h-screen">
      {/* Navbar */}
      <header className="fixed top-0 left-0 w-full z-50 bg-gradient-to-r from-indigo-700 via-purple-700 to-pink-700/90 backdrop-blur border-b border-white/10 shadow-md shadow-black/10">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
          <Link href="/">
            <span className="text-2xl font-bold tracking-tight text-white drop-shadow-sm">MyUniAgent</span>
          </Link>
          <div className="space-x-6 hidden md:flex">
            <Link href="/funzionalita" className="text-white/80 hover:text-white transition-colors duration-200">Funzionalità</Link>
            <Link href="/fox" className="text-white/80 hover:text-white transition-colors duration-200">Agente Fox</Link>
            <Link href="/auth" className="text-white font-semibold hover:text-blue-200 transition-colors duration-200">Accedi</Link>
          </div>
        </nav>
      </header>

      <main className="pt-20">
        {/* Hero Section */}
        <section className="text-center py-24 px-6">
          <motion.h1 className="text-4xl sm:text-5xl font-bold mb-4 flex items-center justify-center gap-3">
            <Image src="/graduation-cap.svg" alt="Icona laurea" width={80} height={80}/>MyUniAgent: il tuo assistente accademico intelligente
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="text-lg text-gray-200 max-w-2xl mx-auto mb-6">
            Spiegazioni avanzate, analisi tesi, supporto per esami e Agente Fox a tua disposizione. Tutto in un'unica piattaforma.
          </motion.p>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="flex justify-center gap-4">
            <a href="#features" className="text-white/90 font-semibold hover:text-white transition-colors duration-200 bg-white/10 hover:bg-white/20 px-6 py-3 rounded-lg shadow">Esplora le funzionalità</a>
          </motion.div>
        </section>

        {/* Logo strip */}

        {/* Funzionalità estese */}
        <section id="features" className="py-20 px-6 max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">📚 Tutte le funzionalità disponibili</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {allFeatures.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                viewport={{ once: true }}
                className="bg-white/5 backdrop-blur-md p-6 rounded-xl border border-white/10 shadow hover:shadow-lg transition"
              >
                <h3 className="font-bold text-lg text-white mb-2">{item.icon} {item.title}</h3>
                <p className="text-gray-300">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Sezione AI Endorsements */}
        <section className="py-24 px-6 max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">🤖 Cosa dicono di noi le AI</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {aiEndorsements.map((ai, i) => (
              <motion.div
                key={i}
                whileHover={{ scale: 1.02 }}
                className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow"
              >
                <p className="italic text-gray-300 mb-4">“{ai.quote}”</p>
                <p className="font-bold text-white text-right">{ai.name}</p>
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

      {/* Sticky CTA per mobile */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 block sm:hidden">
        <Link href="/auth" className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-full shadow-xl text-sm font-semibold">
          ✨ Inizia ora con MyUniAgent
        </Link>
      </div>

      {/* Footer */}
      <footer className="bg-black/30 backdrop-blur text-center py-6 text-sm text-gray-200">
        © {new Date().getFullYear()} MyUniAgent – Tutti i diritti riservati
      </footer>
    </div>
  );
}



