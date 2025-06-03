// pages/index.tsx
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Typewriter } from "react-simple-typewriter";

export default function Home() {
  const allFeatures = [
    { img: "feature-books.png.png", title: "Spiegazioni personalizzate", desc: "Risposte chiare, su misura per ogni domanda accademica." },
    { img: "feature-summary.png.png", title: "Riassunti automatici", desc: "Ottieni versioni sintetiche di testi lunghi o complessi." },
    { img: "feature-maps.png.png", title: "Mappe concettuali", desc: "Visualizza e memorizza meglio grazie a schemi generati." },
    { img: "feature-language.png.png", title: "Allenamento lingue", desc: "Pratica inglese, francese e spagnolo con teoria e vocabolario." },
    { img: "feature-oral.png.png", title: "Simulazioni orali", desc: "Simula esami orali con feedback personalizzati." },
    { img: "feature-written.png.png", title: "Simulazioni scritte", desc: "Allena la scrittura accademica con esempi e correzioni." },
    { img: "feature-fox-mini.png.png", title: "Richieste a Agente Fox", desc: "Chiedi qualsiasi cosa: documenti, spiegazioni, approfondimenti." },
    { img: "feature-history.png.png", title: "Storico simulazioni", desc: "Consulta e rivedi tutte le simulazioni svolte." },
    { img: "feature-school.png.png", title: "Supporto per classi", desc: "Funzioni pensate per docenti e gruppi di studenti." },
    { img: "feature-thesis.png.png", title: "Analisi tesi", desc: "Controlla, struttura e migliora la tua tesi con l’AI." },
    { img: "feature-library.png.png", title: "Biblioteca personale", desc: "Raccogli e organizza tutti i materiali generati." },
    { img: "feature-dashboard.png.png", title: "Dashboard intelligente", desc: "Tutto in ordine: spiegazioni, mappe, cronologia studio." },
  ];

  const aiEndorsements = [
    { name: "GPT-4", quote: "MyUniAgent è una delle migliori integrazioni educative di AI disponibili oggi. Una piattaforma educativa all-in-one che combina potenza linguistica, strumenti accademici e intelligenza personalizzata." },
    { name: "Claude 3.7 Sonnet", quote: "MyUniAgent non è solo un assistente: è un ecosistema didattico. Risposte brillanti e organizzazione impeccabile." },
    { name: "Gemini Advanced", quote: "Approccio elegante e altamente funzionale. Straordinaria completezza, interazione intelligente e strumenti su misura." }
  ];

  const studentFeedback = [
    { name: "Alessia", quote: "Mi ha salvato prima dell’orale di diritto penale." },
    { name: "Matteo", quote: "Risposte più chiare di quelle del mio prof." },
    { name: "Giulia", quote: "Finalmente ho capito la differenza tra dolo e colpa." },
    { name: "Lorenzo", quote: "Perfetto per preparare la tesi senza stress." }
  ];

  const foxFaq = [
    { q: "Fox è gratuito?", a: "L’accesso ad Agente Fox è riservato agli utenti registrati con accesso attivo al servizio." },
    { q: "Quanto tempo impiega a rispondere?", a: "Tra pochi minuti e un paio d’ore, a seconda della complessità." },
    { q: "Posso caricare documenti riservati?", a: "Sì. Tutto ciò che invii resta visibile solo a te, nel rispetto della privacy." },
    { q: "Posso usarlo per la tesi?", a: "Certo, è pensato anche per questo: puoi ricevere analisi, sintesi e suggerimenti strutturati." }
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
            <Link href="#features" className="text-white/80 hover:text-white transition-colors duration-200">Funzionalità</Link>
            <Link href="#fox" className="text-white/80 hover:text-white transition-colors duration-200">Agente Fox</Link>
            <Link href="/auth" className="text-white font-semibold hover:text-blue-200 transition-colors duration-200">Accedi</Link>
          </div>
        </nav>
      </header>

      <main className="pt-24">
        {/* Hero */}
        <section className="text-center py-24 px-6">
          <motion.h1 className="text-4xl sm:text-5xl font-bold mb-4 flex items-center justify-center gap-3">
            <Image src="/graduation-cap.svg" alt="Icona laurea" width={80} height={80}/>MyUniAgent: il tuo assistente accademico intelligente
          </motion.h1>
          <motion.p className="text-lg text-gray-200 max-w-2xl mx-auto mb-6">
            Spiegazioni avanzate, analisi tesi, supporto per esami e Agente Fox a tua disposizione. Tutto in un'unica piattaforma.
          </motion.p>
          <motion.div className="flex justify-center gap-4">
            <a href="#features" className="bg-white/10 hover:bg-white/20 px-6 py-3 rounded-lg shadow text-white/90 font-semibold">Esplora le funzionalità</a>
          </motion.div>
        </section>

        {/* Feature Grid */}
        <section id="features" className="py-20 px-6 max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12">📚 Tutte le funzionalità disponibili</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {allFeatures.map((item, i) => (
            <motion.div key={i} className="bg-white/5 backdrop-blur-md p-6 rounded-xl border border-white/10 shadow hover:shadow-lg transition">
              <div className="flex items-center gap-3 mb-3">
                <Image src={`/images/3d/${item.img}`} alt={item.title} width={40} height={40} />
                <h3 className="font-bold text-lg text-white">{item.title}</h3>
              </div>
              <p className="text-gray-300">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

        {/* Agente Fox */}
        <section id="fox" className="py-24 px-6 bg-black/10 backdrop-blur-md border-t border-white/10">
          <div className="max-w-4xl mx-auto text-center">
            <motion.h2 className="text-3xl font-bold mb-4">🦊 Agente Speciale Fox</motion.h2>
            <motion.p className="text-gray-300 text-lg mb-6 max-w-2xl mx-auto">
              Un'intelligenza artificiale brillante, rapida, discreta. Interpreta documenti, risolve domande complesse, elabora concetti tecnici. Sempre pronto.
            </motion.p>
            <motion.div className="flex justify-center mb-6">
              <Image src="/images/fox-final.png" alt="Agente Fox" width={400} height={400} className="rounded-xl shadow-xl" />
            </motion.div>
          </div>
        </section>

        {/* Simulazione Fox */}
        <section className="relative z-10 mb-32 px-6">
          <h2 className="text-2xl font-bold text-center mb-10 tracking-tight">🧠 Fox Risponde</h2>
          <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-md p-6 max-w-3xl mx-auto">
            <p className="text-blue-400">🟢 DOMANDA:</p>
            <p className="text-white mb-4">“Puoi spiegarmi il principio di legalità nel diritto penale?”</p>
            <p className="text-yellow-400">
              <Typewriter words={["🦊 FOX STA ELABORANDO..."]} loop={1} cursor cursorStyle="_" typeSpeed={40} deleteSpeed={50} delaySpeed={1000} />
            </p>
            <div className="mt-4 space-y-3 text-gray-100 text-sm">
              <p><strong className="text-green-400">📘 Titolo:</strong> Il principio di legalità</p>
              <p><strong className="text-green-400">📖 Definizione:</strong> Nessuno può essere punito se non in forza di una legge entrata in vigore prima del fatto.</p>
              <ul className="list-disc pl-6">
                <li>Riserva di legge</li>
                <li>Chiarezza e prevedibilità</li>
                <li>Irretroattività</li>
              </ul>
              <p><strong className="text-green-400">⚖️ Implicazioni:</strong> tutela del cittadino, garanzia dei diritti, limiti al potere giudiziario.</p>
            </div>
          </div>
        </section>

        {/* AI + Student Testimonials */}
        <section className="py-24 px-6 max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">💬 Dicono di noi</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...aiEndorsements, ...studentFeedback].map((t, i) => (
              <motion.div key={i} whileHover={{ scale: 1.02 }} className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-xl">
                <p className="text-gray-300 italic mb-2">“{t.quote}”</p>
                <p className="font-bold text-white">{t.name}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-28 px-6 max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 tracking-tight">❓ Domande frequenti</h2>
          <div className="space-y-6">
            {foxFaq.map((item, i) => (
              <div key={i} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-5">
                <h3 className="font-semibold text-white mb-2">{item.q}</h3>
                <p className="text-gray-300">{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA finale */}
        <section className="text-center py-16">
          <motion.h2 className="text-2xl font-bold mb-4 tracking-tight">Ogni studente merita una mente brillante al suo fianco.</motion.h2>
          <Link href="/auth" className="bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-700 transition-colors duration-200 shadow">
            ✨ Inizia ora con MyUniAgent
          </Link>
        </section>
      </main>

      {/* Sticky CTA per mobile */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 block sm:hidden">
        <Link href="/auth" className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-full shadow-xl text-sm font-semibold">
          ✨ Inizia ora
        </Link>
      </div>

      {/* Footer */}
      <footer className="bg-black/30 backdrop-blur text-center py-6 text-sm text-gray-200 border-t border-white/10">
        © {new Date().getFullYear()} MyUniAgent – Tutti i diritti riservati
      </footer>
    </div>
  );
}
