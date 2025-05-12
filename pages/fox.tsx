import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Typewriter } from 'react-simple-typewriter';

export default function FoxPage() {
  return (
    <div className="bg-gradient-to-br from-[#0f0c29] via-[#1e1e2f] to-[#181826] text-white min-h-screen font-sans">
      <header className="py-6 border-b border-white/10 backdrop-blur-sm bg-[#0f0c29]/80 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 flex justify-between items-center">
          <Link href="/">
            <span className="text-xl font-bold tracking-tight">MyUniAgent</span>
          </Link>
          <Link href="/auth" className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 transition">
            Accedi
          </Link>
        </div>
      </header>

      <main className="px-6 py-16 max-w-6xl mx-auto">
        <motion.h1 initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-4xl sm:text-5xl font-bold text-white text-center leading-tight mb-6">
          🦊 Scopri Agente Speciale Fox
        </motion.h1>

        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="text-lg text-gray-300 text-center max-w-3xl mx-auto mb-12">
          Agente Fox è il tuo alleato accademico più potente: un'intelligenza artificiale specializzata nella comprensione di documenti complessi, nella risposta a quesiti accademici avanzati e nell’assistenza personalizzata. Sempre attivo. Sempre affidabile.
        </motion.p>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }} className="relative flex justify-center mb-20">
          <div className="absolute w-[280px] h-[280px] bg-orange-500 opacity-30 blur-3xl rounded-full -z-10 top-8"></div>
          <Image src="/images/agente-fox-hero.png" alt="Agente Fox" width={400} height={400} className="rounded-xl shadow-2xl ring-1 ring-white/10" />
        </motion.div>

        {/* Demo deluxe con animazioni e decorazioni */}
        <section className="relative z-10 mb-32">
          <h2 className="text-3xl font-bold text-center mb-10 tracking-tight">🧠 Esempio simulato di risposta di Agente Fox</h2>

          <div className="relative rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(0,255,255,0.2)] hover:shadow-[0_0_50px_rgba(0,255,255,0.4)] transition-all duration-300 border border-white/10 max-w-3xl mx-auto">
            {/* Sfondo CGI interno */}
            <Image
              src="/images/background.png"
              alt="Futuristic Chat Background"
              layout="fill"
              objectFit="cover"
              className="z-0 opacity-60 blur-[1px] brightness-110"
            />
            <div className="absolute inset-0 bg-black/25 z-10" />

            {/* Badge in alto a destra */}
            <div className="absolute top-2 right-4 text-xs text-cyan-300/60 uppercase tracking-widest z-30">
              CoreFox v2.3 · Active
            </div>

            {/* Contenuto */}
            <div className="relative z-20 p-6 text-sm text-gray-100 font-mono space-y-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="text-blue-400">
                🟢 DOMANDA:
              </motion.div>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="text-white">
                “Puoi spiegarmi il principio di legalità nel diritto penale?”
              </motion.p>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="text-yellow-400">
                <Typewriter words={["🦊 FOX STA ELABORANDO..."]} loop={1} cursor cursorStyle="_" typeSpeed={40} deleteSpeed={50} delaySpeed={1000} />
              </motion.div>

              <motion.div initial="hidden" animate="visible" variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.2 } } }} className="border-t border-white/10 pt-4 space-y-3">
                <motion.p variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}><span className="text-green-400">📘 Titolo:</span> Il principio di legalità</motion.p>
                <motion.p variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}><span className="text-green-400">📖 Definizione:</span> Nessuno può essere punito se non in forza di una legge entrata in vigore prima del fatto. Questo principio garantisce sicurezza giuridica e impedisce l’arbitrarietà.</motion.p>

                <motion.p variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }} className="text-green-400">🧩 Punti chiave:</motion.p>
                <motion.ul variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }} className="list-disc pl-6 text-gray-100/90">
                  <motion.li variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}><strong>Riserva di legge</strong>: solo il Parlamento può legiferare in materia penale.</motion.li>
                  <motion.li variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}><strong>Chiarezza e prevedibilità</strong>: le norme devono essere comprensibili.</motion.li>
                  <motion.li variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}><strong>Irretroattività</strong>: nessuna norma può punire fatti precedenti alla sua entrata in vigore.</motion.li>
                </motion.ul>

                <motion.p variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}><span className="text-green-400">⚖️ Implicazioni:</span> tutela del cittadino, garanzia dei diritti fondamentali, limitazione del potere giudiziario.</motion.p>
              </motion.div>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }} className="pt-4">
                <p className="text-white font-semibold mb-2">📎 Allegati generati:</p>
                <ul className="list-disc pl-6 text-blue-400">
                  <li className="hover:underline cursor-pointer">📄 PDF – Schema riassuntivo</li>
                  <li className="hover:underline cursor-pointer">📝 DOCX – Approfondimento normativo</li>
                </ul>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.4 }} className="pt-4 text-right">
                <button className="bg-blue-600 hover:bg-blue-700 transition text-white px-4 py-2 rounded-md text-sm shadow-lg ring-1 ring-white/10">
                  📥 Scarica risposta .txt
                </button>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Testimonianze */}
        <section className="mb-28">
          <h2 className="text-3xl font-bold text-center mb-12 tracking-tight">💬 Cosa dicono gli studenti</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            {[
              { name: "Alessia", quote: "Mi ha salvato prima dell’orale di diritto penale." },
              { name: "Matteo", quote: "Risposte più chiare di quelle del mio prof." },
              { name: "Giulia", quote: "Finalmente ho capito la differenza tra dolo e colpa." },
              { name: "Lorenzo", quote: "Perfetto per preparare la tesi senza stress." }
            ].map((t, i) => (
              <motion.div key={i} whileHover={{ scale: 1.02 }} className="bg-[#22223b]/80 p-6 rounded-2xl border border-white/10 shadow-xl">
                <p className="text-gray-300 italic mb-2">“{t.quote}”</p>
                <p className="font-bold text-white">{t.name}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-28">
          <h2 className="text-3xl font-bold text-center mb-12 tracking-tight">❓ Domande frequenti su Agente Fox</h2>
          <div className="space-y-6 max-w-3xl mx-auto">
            {[
              {
                q: "Fox è gratuito?",
                a: "L’accesso ad Agente Fox è riservato agli utenti registrati con accesso attivo al servizio."
              },
              {
                q: "Quanto tempo impiega a rispondere?",
                a: "Di solito tra pochi minuti e un paio d’ore, a seconda della complessità."
              },
              {
                q: "Posso caricare documenti riservati?",
                a: "Sì. Tutto ciò che invii resta visibile solo a te, nel rispetto della privacy."
              },
              {
                q: "Posso usarlo per la tesi?",
                a: "Certo, è pensato anche per questo: puoi ricevere analisi, sintesi e suggerimenti strutturati."
              }
            ].map((item, i) => (
              <div key={i} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-5">
                <h3 className="font-semibold text-white mb-2">{item.q}</h3>
                <p className="text-gray-300">{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="text-center">
          <h2 className="text-2xl font-bold mb-4 tracking-tight">Ogni studente merita una mente brillante al suo fianco.</h2>
          <Link href="/auth" className="bg-orange-600 text-white px-6 py-3 rounded hover:bg-orange-700">
            Accedi per usare Agente Fox
          </Link>
        </motion.div>
      </main>

      <footer className="bg-[#0f0c29] text-center py-6 text-sm text-gray-400 border-t border-white/10">
        © {new Date().getFullYear()} MyUniAgent – Tutti i diritti riservati
      </footer>
    </div>
  );
}
