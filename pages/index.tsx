import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import CountUp from "react-countup";

export default function Home() {
  return (
    <div className="bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] text-white min-h-screen">
      {/* Hero Section */}
      <section className="text-center py-24 px-6">
        <motion.h1 initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-4xl sm:text-5xl font-bold mb-4">
          🎓 MyUniAgent: il tuo assistente accademico intelligente
        </motion.h1>
        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="text-lg text-gray-200 max-w-2xl mx-auto mb-6">
          Spiegazioni avanzate, analisi tesi, supporto per esami e Agente Fox a tua disposizione. Tutto in un'unica piattaforma.
        </motion.p>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="flex justify-center gap-4">
          <Link href="/auth" className="bg-blue-600 text-white px-6 py-3 rounded-lg shadow hover:bg-blue-700 animate-pulse">
            Inizia gratis
          </Link>
          <a href="#fox" className="text-blue-300 font-semibold hover:underline px-6 py-3">
            Scopri Agente Fox 🦊
          </a>
        </motion.div>
      </section>

      {/* Statistiche */}
      <section className="py-20 px-6 bg-[#1c1c2e] border-y border-gray-700">
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-3 text-center gap-10">
          <div>
            <p className="text-4xl font-bold text-blue-400">
              <CountUp end={12354} duration={2} separator="," />
            </p>
            <p className="text-gray-300">Spiegazioni generate</p>
          </div>
          <div>
            <p className="text-4xl font-bold text-green-400">
              <CountUp end={2587} duration={2} separator="," />
            </p>
            <p className="text-gray-300">Studenti attivi</p>
          </div>
          <div>
            <p className="text-4xl font-bold text-orange-400">
              <CountUp end={742} duration={2} separator="," />
            </p>
            <p className="text-gray-300">Richieste gestite da Agente Fox</p>
          </div>
        </div>
      </section>

      {/* Cosa puoi fare */}
      <section className="py-20 px-6 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12">📚 Cosa puoi fare con MyUniAgent</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            {
              title: "📘 Spiegazioni personalizzate",
              desc: "Ricevi risposte chiare, complete e su misura per ogni tua domanda accademica."
            },
            {
              title: "🧾 Analisi tesi & supporto alla scrittura",
              desc: "Carica la tua tesi, analizzala con l’AI o ricevi assistenza per scriverla al meglio."
            },
            {
              title: "🧠 Simulazioni esami universitari",
              desc: "Allenati con quiz, domande orali simulate e correzioni intelligenti."
            },
            {
              title: "🏫 Supporto scuole superiori",
              desc: "Test d’ingresso, ripetizioni intelligenti, contenuti mirati per studenti delle superiori."
            },
            {
              title: "🗂️ Dashboard intelligente",
              desc: "Salva tutto: spiegazioni, mappe concettuali, cronologia studio e quiz svolti."
            },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
              className="bg-[#1e1e2f] p-6 rounded-xl border border-gray-700 shadow hover:shadow-lg transition"
            >
              <h3 className="font-bold text-lg text-white mb-2">{item.title}</h3>
              <p className="text-gray-300">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Agente Fox */}
      <section id="fox" className="py-24 px-6 border-t border-gray-700">
        <div className="max-w-4xl mx-auto text-center">
          <motion.h2 initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="text-3xl font-bold mb-4">🦊 Agente Speciale Fox</motion.h2>
          <motion.p initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }} className="text-gray-300 text-lg mb-6">
            Un alleato invisibile, instancabile, geniale.
Agente Fox analizza, comprende e risponde.
Sempre. Ovunque. Al tuo fianco.
          </motion.p>

          <motion.div initial={{ scale: 0.8, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} transition={{ delay: 0.3 }} className="flex justify-center mb-6">
            <Image src="/images/agente-fox-hero.png" alt="Agente Fox" width={400} height={400} className="rounded-xl shadow-xl" />
          </motion.div>

          <motion.ul initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.4 }} className="text-left max-w-xl mx-auto space-y-2 text-gray-200">
            <li>✅ Risposte reali da operatori esperti</li>
            <li>✅ Supporta PDF, appunti, domande tecniche</li>
            <li>✅ Nessuna attesa infinita: ti avvisa quando ha la risposta</li>
            <li>✅ Accessibile dalla tua dashboard in ogni momento</li>
          </motion.ul>

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-8">
            <Link href="/auth" className="bg-orange-600 text-white px-6 py-3 rounded hover:bg-orange-700">
              Attiva Agente Fox ora
            </Link>
          </motion.div>
        </div>
      </section>

      {/* CTA finale */}
      <section className="py-20 px-6 text-center">
        <motion.h2 initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-3xl font-bold mb-4">🚀 Pronto a studiare in modo intelligente?</motion.h2>
        <motion.p initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-lg text-gray-200 mb-6">Unisciti a migliaia di studenti che usano MyUniAgent ogni giorno per superare esami e scrivere tesi con successo.</motion.p>
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ delay: 0.4 }}>
          <Link href="/auth" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700">
            Inizia ora gratuitamente
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-center py-6 text-sm text-gray-400">
        © {new Date().getFullYear()} MyUniAgent – Tutti i diritti riservati
      </footer>
    </div>
  );
}


