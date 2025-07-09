import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import DashboardLayout from "@/components/DashboardLayout";
import { motion } from "framer-motion";
import Link from "next/link";
import { 
  CheckCircle,
  BookOpen,
  Edit,
  Brain,
  Target,
  GraduationCap,
  Globe,
  Handshake,
  Building,
  Sparkles,
  TrendingUp,
  Users,
  FileText,
  MessageSquare,
  Zap,
  ArrowRight,
  Clock
} from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "Generatore di mappe concettuali",
    desc: "Crea, modifica e collega nodi. Supporta esportazione PDF/DOCX e salvataggio automatico.",
    href: "/tools/mappa",
    color: "from-purple-500 to-indigo-500",
    bgColor: "bg-purple-50 dark:bg-purple-900/20",
    borderColor: "border-purple-200 dark:border-purple-800"
  },
  {
    icon: FileText,
    title: "Riassunto Intelligente HITL",
    desc: "Riassunti personalizzati per facoltà con modalità progetto multi-parte e SmartPdfReader.",
    href: "/tools/riassunto",
    color: "from-blue-500 to-cyan-500",
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
    borderColor: "border-blue-200 dark:border-blue-800"
  },
  {
    icon: GraduationCap,
    title: "Analisi Tesi Enterprise",
    desc: "Analisi completa tesi universitarie con 8-16 tipologie diverse per livello accademico.",
    href: "/tools/analisi-tesi",
    color: "from-green-500 to-emerald-500",
    bgColor: "bg-green-50 dark:bg-green-900/20",
    borderColor: "border-green-200 dark:border-green-800"
  },
  {
    icon: Edit,
    title: "Simulazioni Esami Scritti",
    desc: "Prove simulate per superiori e università con correzioni automatiche e storico.",
    href: "/tools/simulazioni-scritte",
    color: "from-orange-500 to-red-500",
    bgColor: "bg-orange-50 dark:bg-orange-900/20",
    borderColor: "border-orange-200 dark:border-orange-800"
  },
  {
    icon: MessageSquare,
    title: "Simulazioni Esami Orali",
    desc: "Esaminatore AI con registrazione audio, valutazione real-time e feedback personalizzato.",
    href: "/tools/simulazioni-orali",
    color: "from-teal-500 to-cyan-500",
    bgColor: "bg-teal-50 dark:bg-teal-900/20",
    borderColor: "border-teal-200 dark:border-teal-800"
  },
  {
    icon: Target,
    title: "Spiegazione Avanzata",
    desc: "AgenteFox e Ingegnere STEM per spiegazioni personalizzate con SmartReader integrato.",
    href: "/tools/spiegazione",
    color: "from-indigo-500 to-purple-500",
    bgColor: "bg-indigo-50 dark:bg-indigo-900/20",
    borderColor: "border-indigo-200 dark:border-indigo-800"
  },
  {
    icon: Globe,
    title: "Allenamento Lingue",
    desc: "Teoria grammaticale, vocabolario tematico e simulazioni certificazioni per inglese, francese e spagnolo.",
    href: "/tools/home-lingue",
    color: "from-emerald-500 to-teal-500",
    bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
    borderColor: "border-emerald-200 dark:border-emerald-800"
  },
  {
    icon: BookOpen,
    title: "Biblioteca Condivisa",
    desc: "Accedi a riassunti pubblici, spiegazioni salvate e contenuti della community.",
    href: "/biblioteca",
    color: "from-pink-500 to-rose-500",
    bgColor: "bg-pink-50 dark:bg-pink-900/20",
    borderColor: "border-pink-200 dark:border-pink-800"
  }
];

const roadmap = [
  {
    icon: Globe,
    title: "Supporto multi-lingue",
    desc: "Aggiunta di francese, tedesco e portoghese per un apprendimento globale.",
    status: "In sviluppo",
    color: "from-emerald-500 to-green-500"
  },
  {
    icon: Handshake,
    title: "Partnership con aziende",
    desc: "Simulazioni di colloqui e placement post-laurea con aziende partner.",
    status: "Q2 2025",
    color: "from-blue-500 to-indigo-500"
  },
  {
    icon: Building,
    title: "White label per università",
    desc: "Piattaforma personalizzata per enti scolastici e accademici.",
    status: "Q3 2025",
    color: "from-purple-500 to-pink-500"
  },
];



export default function DashboardPage() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from("profiles")
          .select("name")
          .eq("id", user.id)
          .single();

        if (!error && data) {
          setName(data.name || "");
        }
      }
      setLoading(false);
    };

    fetchProfile();
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        duration: 0.4, 
        ease: "easeOut",
        staggerChildren: 0.1 
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.4, ease: "easeOut" }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3">
          <Sparkles className="w-6 h-6 animate-pulse text-blue-600" />
          <span className="text-lg text-gray-600 dark:text-gray-400">Caricamento dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {/* Welcome Header */}
      <motion.div 
        variants={cardVariants}
        className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-900/20 dark:via-indigo-900/20 dark:to-purple-900/20 rounded-xl p-8 border border-blue-200 dark:border-blue-800"
      >
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="text-center lg:text-left">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="flex items-center justify-center lg:justify-start gap-3 mb-4"
            >
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Benvenuto{name ? `, ${name}` : ""}!
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  La tua dashboard MyUniAgent
                </p>
              </div>
            </motion.div>
            <p className="text-lg text-gray-700 dark:text-gray-300 max-w-2xl">
              Accedi a tutti gli strumenti AI per il tuo percorso universitario. 
            </p>
          </div>
          </div>
      </motion.div>



      {/* Main Features */}
      <motion.div variants={cardVariants}>
        <div className="flex items-center gap-3 mb-6">
          <Zap className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Strumenti disponibili</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={index}
                variants={cardVariants}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Link href={feature.href}>
                  <div className={`${feature.bgColor} rounded-xl p-6 border ${feature.borderColor} hover:shadow-md transition-all group cursor-pointer h-full`}>
                    <div className="flex items-start gap-4 mb-4">
                      <div className={`w-12 h-12 bg-gradient-to-r ${feature.color} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {feature.title}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                          {feature.desc}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center text-blue-600 dark:text-blue-400 text-sm font-medium group-hover:gap-2 transition-all">
                      <span>Inizia ora</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Roadmap */}
      <motion.div variants={cardVariants}>
        <div className="flex items-center gap-3 mb-6">
          <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Roadmap sviluppo</h2>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {roadmap.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={index}
                variants={cardVariants}
                whileHover={{ scale: 1.02 }}
                className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className={`w-12 h-12 bg-gradient-to-r ${item.color} rounded-lg flex items-center justify-center`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {item.title}
                      </h3>
                      <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 px-2 py-1 rounded-full">
                        {item.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
                <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm">
                  <Clock className="w-4 h-4 mr-2" />
                  In arrivo prossimamente
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={cardVariants} className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl p-6 border border-indigo-200 dark:border-indigo-800">
        <div className="text-center">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Pronto per iniziare?
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Esplora i nostri strumenti più popolari e migliora il tuo apprendimento
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link href="/tools/riassunto">
                <div className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-all shadow-sm hover:shadow-md inline-flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Crea un riassunto
                </div>
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link href="/tools/mappa">
                <div className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 px-6 py-3 rounded-lg font-medium transition-all shadow-sm hover:shadow-md inline-flex items-center gap-2">
                  <Brain className="w-4 h-4" />
                  Genera mappa concettuale
                </div>
              </Link>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

DashboardPage.requireAuth = true;
DashboardPage.getLayout = function getLayout(page: React.ReactNode) {
  return (
    <DashboardLayout 
      title="Dashboard"
      breadcrumbs={[
        { label: "Dashboard" }
      ]}
    >
      {page}
    </DashboardLayout>
  );
};