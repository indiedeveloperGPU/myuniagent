import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import DashboardLayout from "@/components/DashboardLayout";
import { motion } from "framer-motion";
import Image from "next/image";

const features = [
  {
    icon: "✅",
    title: "Nuovo generatore di mappe concettuali",
    desc: "Crea, modifica e collega nodi. Supporta esportazione PDF/DOCX e salvataggio.",
  },
  {
    icon: "📚",
    title: "Analisi tesi di laurea con AI",
    desc: "Struttura, metodologia, bibliografia, anti-plagio e revisione linguistica.",
  },
  {
    icon: "✍️",
    title: "Simulazioni esami scritti e orali",
    desc: "Prove simulate personalizzate con correzioni automatiche.",
  },
  {
    icon: "🧠",
    title: "Allenamento completo per l’inglese",
    desc: "Grammatica, vocabolario, conversazione e correzione testi con quiz.",
  },
  {
    icon: "🎯",
    title: "Test d’ingresso con simulazioni",
    desc: "Ricevi consigli sulla facoltà e allenati con prove personalizzate.",
  },
  {
    icon: "🧑‍🏫",
    title: "Dashboard per docenti (in beta)",
    desc: "Crea classi, test e monitora i tuoi studenti.",
  },
];

const roadmap = [
  {
    icon: "🌍",
    title: "Supporto multi-lingue",
    desc: "Aggiunta di francese, spagnolo, tedesco e portoghese.",
  },
  {
    icon: "🤝",
    title: "Partnership con aziende",
    desc: "Simulazioni di colloqui e placement post-laurea.",
  },
  {
    icon: "🏛️",
    title: "White label per università e scuole",
    desc: "Piattaforma personalizzata per enti scolastici e accademici.",
  },
];

const FeatureCard = ({ icon, title, desc }: { icon: string; title: string; desc: string }) => (
  <motion.li
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4 }}
    className="flex flex-col sm:flex-row items-start gap-4 p-4 bg-white dark:bg-gray-900 rounded-lg shadow hover:scale-[1.02] transition-transform border-l-4 border-blue-500 dark:border-blue-400"
  >
    <div className="text-2xl">{icon}</div>
    <div className="text-start">
      <h3 className="font-semibold text-blue-700 dark:text-blue-400">{title}</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400">{desc}</p>
    </div>
  </motion.li>
);

export default function DashboardPage() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [showTrialMessage, setShowTrialMessage] = useState(false);

  useEffect(() => {
  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await supabase
        .from("profiles")
        .select("name, created_at")
        .eq("id", user.id)
        .single();

      if (!error && data) {
        if (data.name) setName(data.name);

        // Calcola se è ancora entro il giorno di prova
        const createdAt = new Date(data.created_at);
        const now = new Date();
        const msInDay = 24 * 60 * 60 * 1000;

        const diff = now.getTime() - createdAt.getTime();
        if (diff < msInDay) {
          setShowTrialMessage(true);
        }
      }
    }
    setLoading(false);
  };

  fetchProfile();
}, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  };

  if (loading) return <p className="text-center py-10">Caricamento...</p>;

  return (
  <motion.div
    initial={{ opacity: 0, x: -30 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: 30 }}
    transition={{ duration: 0.4, ease: "easeOut" }}
  >
    {/* Header sticky su mobile */}
    <div className="fixed top-0 inset-x-0 bg-white dark:bg-gray-900 z-50 shadow-md px-4 py-3 flex justify-between items-center sm:hidden">
      <span className="text-sm font-medium">Ciao, {name}</span>
      <button onClick={handleLogout} className="text-red-500 text-sm">Logout</button>
    </div>

    <div className="max-w-5xl mx-auto px-4 pt-20 sm:pt-10 pb-6 space-y-12">
      {/* Benvenuto */}
      <div className="text-center flex flex-col items-center gap-4">
  <motion.div
    animate={{ rotate: [0, 10, -10, 10, 0] }}
    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
  >
    <Image
      src="/images/fox-wave.png"
      alt="Agente Fox che saluta"
      width={120}
      height={120}
    />
  </motion.div>

  <h1 className="text-3xl sm:text-4xl font-bold mb-2">
    👋 Benvenuto
    {name ? <span className="text-blue-700 dark:text-blue-400">, {name}</span> : ""}!
  </h1>
  {showTrialMessage && (
  <div className="bg-blue-100 dark:bg-blue-800 text-blue-900 dark:text-blue-100 px-4 py-2 rounded-md text-sm sm:text-base font-medium shadow mt-2">
    🧪 Benvenuto! Sei nel tuo giorno di prova gratuito. Hai tempo 1 giorno.
  </div>
)}

  <p className="text-gray-700 dark:text-gray-300 text-base sm:text-lg">
    Hai effettuato correttamente l’accesso a <strong>MyUniAgent</strong>. Usa la barra laterale per accedere alle funzionalità.
  </p>
</div>


      {/* Novità */}
      <section className="bg-gray-50 dark:bg-gray-800 p-6 rounded-xl">
        <h2 className="text-xl sm:text-2xl font-semibold mb-6 text-blue-800 dark:text-blue-300">🆕 Novità sulla piattaforma</h2>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {features.map((item, i) => (
            <FeatureCard key={i} {...item} />
          ))}
        </ul>
      </section>

      {/* Roadmap */}
      <section className="bg-yellow-50 dark:bg-yellow-900 p-6 rounded-xl">
        <h2 className="text-xl sm:text-2xl font-semibold mb-6 text-yellow-800 dark:text-yellow-200">🔭 In arrivo prossimamente</h2>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {roadmap.map((item, i) => (
            <FeatureCard key={i} {...item} />
          ))}
        </ul>
      </section>

      {/* Logout desktop */}
      <div className="text-center hidden sm:block">
        <button
          onClick={handleLogout}
          className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 text-white px-6 py-2 rounded-lg shadow"
        >
          🔓 Logout
        </button>
      </div>
    </div>
  </motion.div>
);

}

DashboardPage.requireAuth = true;
DashboardPage.getLayout = function getLayout(page: React.ReactNode) {
  return <DashboardLayout>{page}</DashboardLayout>;
};




