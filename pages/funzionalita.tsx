import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

const features = [
  {
    icon: "📘",
    title: "Spiegazioni personalizzate",
    desc: "Ricevi risposte chiare, dettagliate e su misura per ogni tuo dubbio accademico.",
    href: "#"
  },
  {
    icon: "📄",
    title: "Riassunti automatici",
    desc: "Trasforma documenti lunghi in sintesi semplici e comprensibili.",
    href: "#"
  },
  {
    icon: "🧠",
    title: "Mappe concettuali",
    desc: "Visualizza concetti chiave con mappe generate automaticamente.",
    href: "#"
  },
  {
    icon: "🌍",
    title: "Allenamento lingue",
    desc: "Migliora inglese, francese e spagnolo con teoria e vocabolario interattivo.",
    href: "#"
  },
  {
    icon: "🧑‍🏫",
    title: "Simulazioni orali",
    desc: "Allenati con interrogazioni simulate per prepararti agli esami orali.",
    href: "#"
  },
  {
    icon: "✍️",
    title: "Simulazioni scritte",
    desc: "Prova test e tracce con feedback dettagliati e mirati.",
    href: "#"
  },
  {
    icon: "🦊",
    title: "Richieste a Agente Fox",
    desc: "Fai domande dirette all’assistente AI per spiegazioni, approfondimenti o documenti.",
    href: "/fox"
  },
  {
    icon: "📊",
    title: "Storico simulazioni",
    desc: "Consulta tutte le tue attività precedenti per monitorare i progressi.",
    href: "#"
  },
  {
    icon: "🏫",
    title: "Supporto per classi",
    desc: "Funzioni pensate per insegnanti e studenti in gruppo.",
    href: "#"
  },
  {
    icon: "🔍",
    title: "Analisi tesi",
    desc: "Controlla coerenza, struttura e contenuti della tua tesi con il supporto dell'AI.",
    href: "#"
  },
  {
    icon: "📚",
    title: "Biblioteca personale",
    desc: "Organizza e consulta i materiali generati e salvati nel tuo spazio personale.",
    href: "#"
  },
  {
    icon: "🗂️",
    title: "Dashboard intelligente",
    desc: "Tieni traccia delle attività, documenti, simulazioni e risorse in un’unica interfaccia.",
    href: "#"
  },
];

export default function Funzionalita() {
  return (
    <div className="bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900 text-white min-h-screen py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-12">🎓 Tutte le funzionalità di MyUniAgent</h1>
        <p className="text-center text-gray-300 max-w-2xl mx-auto mb-16">
          Ogni strumento è pensato per accompagnarti passo dopo passo nel tuo percorso accademico: dallo studio quotidiano alla preparazione della tesi.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="bg-white/5 backdrop-blur-md p-6 rounded-xl border border-white/10 shadow hover:shadow-lg transition"
            >
              <h3 className="text-xl font-bold mb-2">{f.icon} {f.title}</h3>
              <p className="text-gray-300 mb-4">{f.desc}</p>
              <Link href={f.href} className="text-blue-300 hover:underline text-sm">Scopri di più</Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
