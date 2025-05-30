import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import PublicLayout from "@/components/PublicLayout";
import FAQAccordion from "@/components/FAQAccordion";

const funzionalita = [
  {
    icon: "✅",
    title: "Mappe concettuali dinamiche",
    desc: "Crea, modifica e collega nodi con AI. Esporta in PDF o DOCX.",
  },
  {
    icon: "🧠",
    title: "Allenamento completo per Inglese, Francese e Spagnolo",
    desc: "Grammatica, vocabolario, conversazione, esercizi e correzioni personalizzate.",
  },
  {
    icon: "✍️",
    title: "Simulazioni esami scritti e orali",
    desc: "Prove simulate con correzione automatica e feedback immediato.",
  },
  {
    icon: "📚",
    title: "Analisi tesi con intelligenza artificiale",
    desc: "Controllo struttura, anti-plagio, bibliografia, linguaggio e molto altro.",
  },
  {
    icon: "🎯",
    title: "Test d’ingresso e orientamento universitario",
    desc: "Simulazioni ufficiali e consigli sulla facoltà ideale per te.",
  },
  {
    icon: "🧾",
    title: "Riassunti e spiegazioni avanzate",
    desc: "Approfondimenti mirati, sintesi automatiche e spiegazioni dettagliate su ogni argomento.",
  },
  {
    icon: "📊",
    title: "Statistiche e monitoraggio dei progressi",
    desc: "Tieni traccia delle tue attività, miglioramenti e obiettivi raggiunti.",
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

export default function AbbonatiPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      } else {
        router.push("/auth");
      }
    };
    fetchUser();
  }, []);

  const attivaAbbonamento = async () => {
    if (!userId) return;
    setLoading(true);

    const scadenza = new Date();
    scadenza.setFullYear(scadenza.getFullYear() + 1);

    const { error } = await supabase
      .from("profiles")
      .update({
        abbonamento_attivo: true,
        abbonamento_scadenza: scadenza.toISOString(),
      })
      .eq("id", userId);

    setLoading(false);

    if (!error) {
      toast.success("Abbonamento attivato con successo!");
      router.push("/dashboard");
    } else {
      toast.error("Errore durante l'attivazione dell'abbonamento.");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-4xl mx-auto px-4 py-12"
    >
      <h1 className="text-3xl sm:text-4xl font-bold mb-6 text-center text-blue-700 dark:text-blue-300">
        🎓 Abbonati a MyUniAgent
      </h1>

      <h2 className="text-center text-2xl font-semibold mb-8 text-gray-800 dark:text-white">
        Perché abbonarsi a MyUniAgent?
      </h2>
      <p className="text-center text-gray-600 dark:text-gray-300 mb-10 max-w-2xl mx-auto">
        Non è solo uno strumento, è il tuo assistente personale per affrontare verifiche, esami, tesi e preparazione linguistica. Tutto in un unico abbonamento, senza costi nascosti.
      </p>

      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12">
        {funzionalita.map((item, i) => (
          <FeatureCard key={i} {...item} />
        ))}
      </ul>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white dark:bg-gray-900 text-center rounded-xl p-6 shadow-lg border-l-4 border-blue-500 dark:border-blue-400"
      >
        <h2 className="text-xl sm:text-2xl font-bold text-blue-800 dark:text-blue-300 mb-4">
          Piano annuale studente
        </h2>
        <p className="text-gray-700 dark:text-gray-200 mb-4 text-sm sm:text-base">
          Accesso completo per <strong>12 mesi</strong> a tutte le funzionalità premium.
        </p>
        <p className="text-3xl font-extrabold text-blue-700 dark:text-blue-400 mb-6">30€ / anno</p>

        <button
          onClick={attivaAbbonamento}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded shadow transition-colors duration-200"
        >
          {loading ? "Attivazione in corso..." : "Attiva ora"}
        </button>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          (Pagamento sicuro. Il rinnovo non è automatico.)
        </p>
      </motion.div>

      <div className="mt-16">
  <FAQAccordion />
</div>

    </motion.div>
  );
}

AbbonatiPage.requireAuth = true;
AbbonatiPage.getLayout = function getLayout(page: React.ReactNode) {
  return <PublicLayout>{page}</PublicLayout>;
};
