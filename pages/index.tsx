import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Typewriter } from "react-simple-typewriter";
import Tilt from 'react-parallax-tilt';
import Head from "next/head";

export default function Home() {
  const allFeatures = [
    { img: "feature-books.png", title: "Spiegazioni personalizzate", desc: "Risposte chiare, su misura per ogni domanda accademica." },
    { img: "feature-summary.png", title: "Riassunti automatici", desc: "Ottieni versioni sintetiche di testi lunghi o complessi." },
    { img: "feature-maps.png", title: "Mappe concettuali", desc: "Visualizza e memorizza meglio grazie a schemi generati." },
    { img: "feature-language.png", title: "Allenamento lingue", desc: "Pratica inglese, francese e spagnolo con teoria e vocabolario." },
    { img: "feature-oral.png", title: "Simulazioni orali", desc: "Simula esami orali con feedback personalizzati." },
    { img: "feature-written.png", title: "Simulazioni scritte", desc: "Allena la scrittura accademica con esempi e correzioni." },
    { img: "feature-fox-mini.png", title: "Richieste a Agente Fox", desc: "Chiedi qualsiasi cosa: documenti, spiegazioni, approfondimenti." },
    { img: "feature-history.png", title: "Storico simulazioni", desc: "Consulta e rivedi tutte le simulazioni svolte." },
    { img: "feature-school.png", title: "Supporto per classi", desc: "Funzioni pensate per docenti e gruppi di studenti." },
    { img: "feature-thesis.png", title: "Analisi tesi", desc: "Controlla, struttura e migliora la tua tesi con l’AI." },
    { img: "feature-library.png", title: "Biblioteca personale", desc: "Raccogli e organizza tutti i materiali generati." },
    { img: "feature-dashboard.png", title: "Dashboard intelligente", desc: "Tutto in ordine: spiegazioni, mappe, cronologia studio." },
  ];

  const getGlowColor = (title: string): string => {
    if (title.includes("lingue") || title.includes("orali") || title.includes("scritte")) {
      return "shadow-[0_0_20px_rgba(0,200,255,0.3)] hover:shadow-[0_0_30px_rgba(0,200,255,0.5)]";
    } else if (title.includes("dashboard") || title.includes("storico")) {
      return "shadow-[0_0_20px_rgba(0,255,150,0.3)] hover:shadow-[0_0_30px_rgba(0,255,150,0.5)]";
    } else if (title.includes("Fox") || title.includes("tesi")) {
      return "shadow-[0_0_20px_rgba(255,200,0,0.3)] hover:shadow-[0_0_30px_rgba(255,200,0,0.5)]";
    }
    return "shadow-[0_0_20px_rgba(236,72,255,0.3)] hover:shadow-[0_0_30px_rgba(236,72,255,0.5)]";
  };

  const aiEndorsements = [
    { name: "GPT-4", quote: "MyUniAgent è una delle migliori integrazioni educative di AI disponibili oggi." },
    { name: "Claude 3.7 Sonnet", quote: "Un ecosistema didattico. Risposte brillanti e organizzazione impeccabile." },
    { name: "Gemini Advanced", quote: "Approccio elegante e altamente funzionale. Interazione intelligente." }
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
    <div className="relative overflow-hidden text-white min-h-screen bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 dark:from-gray-900 dark:to-gray-800">
      {/* Navbar */}
      <header className="fixed top-0 left-0 w-full z-50 bg-gradient-to-r from-indigo-700 via-purple-700 to-pink-700/90 backdrop-blur border-b border-white/10 shadow-md shadow-black/10">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
          <Link href="#" className="text-2xl font-bold tracking-tight text-white drop-shadow-sm">MyUniAgent</Link>
          <div className="space-x-6 hidden md:flex">
            <Link href="#about">Chi siamo</Link>
            <Link href="#features">Funzionalità</Link>
            <Link href="#pricing">Prezzo</Link>
            <Link href="#faq">FAQ</Link>
            <Link href="#reviews">Recensioni</Link>
            <Link href="/auth" className="text-white font-semibold hover:text-blue-200">Accedi</Link>
          </div>
        </nav>
      </header>

      <main className="pt-24">
        {/* Hero */}
        <section className="text-center py-24 px-6">
          <motion.h1 className="text-5xl font-bold mb-4 flex items-center justify-center gap-3">
            <Image src="/graduation-cap.svg" alt="Icona" width={60} height={60} />
            Il tuo assistente accademico intelligente
          </motion.h1>
          <motion.p className="text-lg text-gray-200 max-w-2xl mx-auto mb-6">
            Piattaforma ed-tech basata su AI + HITL per studenti e docenti. Tutto ciò che ti serve in un unico spazio.
          </motion.p>
          <motion.div>
            <Link href="/auth" className="bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-700 transition-colors duration-200">
              ✨ Inizia ora
            </Link>
          </motion.div>
        </section>

        {/* About */}
        <section id="about" className="py-20 px-6 max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-10">🚀 Chi siamo</h2>
          <p className="text-gray-200 text-center max-w-3xl mx-auto">
            MyUniAgent è una start-up italiana ed-tech che unisce Intelligenza Artificiale e supervisione umana (HITL) per offrire supporto completo a studenti e insegnanti. Il nostro obiettivo è rendere l’apprendimento accessibile, personalizzato e intelligente.
          </p>
        </section>

        {/* Funzionalità */}
        <section id="features" className="py-20 px-6 max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">📚 Tutte le funzionalità disponibili</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {allFeatures.map((item, i) => (
              <Tilt key={i} className="rounded-xl" glareEnable glareMaxOpacity={0.2} glareColor="#fff" glarePosition="all" tiltMaxAngleX={10} tiltMaxAngleY={10}>
                <motion.div className={`bg-white/5 backdrop-blur-md p-6 rounded-xl border border-white/10 ${getGlowColor(item.title)}`} whileHover={{ scale: 1.02 }}>
                  <div className="flex items-center gap-3 mb-3">
                    <Image src={`/images/3d/${item.img}`} alt={item.title} width={40} height={40} />
                    <h3 className="font-bold text-lg text-white">{item.title}</h3>
                  </div>
                  <p className="text-gray-300">{item.desc}</p>
                </motion.div>
              </Tilt>
            ))}
          </div>
        </section>

        {/* Prezzo */}
        <section id="pricing" className="py-20 px-6 text-center bg-white/5 backdrop-blur-md border-t border-white/10">
          <h2 className="text-3xl font-bold mb-4">💸 Prezzo</h2>
          <p className="text-lg text-gray-200 mb-6">Un unico abbonamento annuale. Nessuna sorpresa.</p>
          <div className="inline-block bg-black/30 p-6 rounded-xl border border-white/10">
            <h3 className="text-4xl font-bold text-white">30€/anno</h3>
            <p className="text-gray-300 mt-2">Accesso completo a tutte le funzionalità per 12 mesi.</p>
            <Link href="/auth" className="inline-block mt-6 bg-orange-600 hover:bg-orange-700 text-white px-5 py-3 rounded-lg font-semibold">Iscriviti ora</Link>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="py-20 px-6 max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">❓ Domande frequenti</h2>
          <div className="space-y-6">
            {foxFaq.map((item, i) => (
              <div key={i} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-5">
                <h3 className="font-semibold text-white mb-2">{item.q}</h3>
                <p className="text-gray-300">{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Recensioni */}
        <section id="reviews" className="py-24 px-6 max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">💬 Cosa dicono di noi</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...aiEndorsements, ...studentFeedback].map((t, i) => (
              <motion.div key={i} whileHover={{ scale: 1.02 }} className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-xl">
                <p className="text-gray-300 italic mb-2">“{t.quote}”</p>
                <p className="font-bold text-white">{t.name}</p>
              </motion.div>
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

      <footer className="bg-black/30 backdrop-blur text-center py-6 text-sm text-gray-200 border-t border-white/10">
        © {new Date().getFullYear()} MyUniAgent – Tutti i diritti riservati
      </footer>
    </div>
  );
}
