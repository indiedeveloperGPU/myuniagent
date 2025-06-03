import { useEffect } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Head from "next/head";

export default function Home() {
  useEffect(() => {
    document.body.style.backgroundColor = "#0a021c";
  }, []);

  return (
    <>
      <Head>
        <title>MyUniAgent - La piattaforma ed-tech definitiva</title>
      </Head>

      <div className="relative min-h-screen overflow-x-hidden">
        {/* Sfondo */}
        <Image
          src="/images/3d/bg-orbs.png"
          alt="Sfondo orbs"
          layout="fill"
          objectFit="cover"
          className="z-0 fixed inset-0"
        />

        {/* Hero Section */}
        <section className="relative z-10 flex flex-col items-center justify-center text-center text-white px-6 pt-32 pb-24">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
            className="text-4xl md:text-6xl font-bold"
          >
            La tua guida intelligente per lo studio
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 1 }}
            className="mt-6 text-lg md:text-xl max-w-2xl"
          >
            Dalle simulazioni al supporto in classe: MyUniAgent rivoluziona il tuo modo di imparare, con l'aiuto di Agente Fox.
          </motion.p>
          <motion.a
            href="#funzionalita"
            className="mt-10 px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl shadow-lg hover:scale-105 transition text-white font-semibold"
            whileHover={{ scale: 1.05 }}
          >
            Scopri tutte le funzionalità
          </motion.a>
        </section>

        {/* Sezione Funzionalità */}
        <section id="funzionalita" className="relative z-10 px-6 py-24">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl text-white font-bold text-center mb-16"
          >
            Tutto ciò che ti serve, in un solo spazio
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-6xl mx-auto">
            {[
              "feature-dashboard",
              "feature-oral",
              "feature-written",
              "feature-fox-mini",
              "feature-language",
              "feature-books",
              "feature-library",
              "feature-history",
              "feature-thesis",
              "feature-summary",
              "feature-maps",
              "feature-school",
              "feature-microphone"
            ].map((name, idx) => (
              <motion.div
                key={idx}
                whileHover={{ scale: 1.05 }}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: idx * 0.05 }}
                viewport={{ once: true }}
                className="rounded-3xl bg-[#12022e] p-6 shadow-xl"
              >
                <Image
                  src={`/images/3d/${name}.png`}
                  alt={name}
                  width={512}
                  height={512}
                  className="rounded-xl mx-auto"
                />
              </motion.div>
            ))}
          </div>
        </section>

        {/* Sezione Agente Fox */}
        <section className="relative z-10 px-6 py-32 bg-gradient-to-b from-[#140038] to-[#0a021c] text-white">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-12">
            <motion.div
              initial={{ x: -50, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="flex-1"
            >
              <Image
                src="/images/3d/fox-final.png"
                alt="Agente Fox"
                width={600}
                height={600}
                className="rounded-3xl"
              />
            </motion.div>

            <motion.div
              initial={{ x: 50, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="flex-1"
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Agente Fox ti guida in tutto il tuo percorso
              </h2>
              <p className="text-lg leading-relaxed mb-6">
                Il cuore intelligente di MyUniAgent: il tuo tutor personale. Ti aiuta a capire, riassumere, esercitarti, analizzare e prepararti.
              </p>
              <ul className="list-disc pl-6 space-y-2 text-base">
                <li>Simulazioni personalizzate</li>
                <li>Risposte ai dubbi in tempo reale</li>
                <li>Analisi di testi, tesi, tracce</li>
                <li>Riassunti e mappe generate al volo</li>
              </ul>
            </motion.div>
          </div>
        </section>

        {/* Sezione Abbonamento */}
        <section className="relative z-10 px-6 py-24 text-white text-center">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 1 }}
            className="text-3xl md:text-4xl font-bold mb-6"
          >
            Accedi a tutte le funzionalità per 30€/anno
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 1 }}
            className="mb-8 max-w-xl mx-auto"
          >
            MyUniAgent è pensato per supportarti ogni giorno nello studio. Nessun costo nascosto, assistenza costante.
          </motion.p>
          <motion.a
            href="/abbonati"
            whileHover={{ scale: 1.05 }}
            className="inline-block px-8 py-3 bg-gradient-to-r from-pink-500 to-purple-500 rounded-2xl shadow-lg text-white font-semibold"
          >
            Abbonati ora
          </motion.a>
        </section>

        {/* Footer */}
        <footer className="text-center text-white py-10 opacity-60 text-sm">
          © {new Date().getFullYear()} MyUniAgent · Tutti i diritti riservati
        </footer>
      </div>
    </>
  );
}
