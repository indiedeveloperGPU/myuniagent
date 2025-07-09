import { useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "react-hot-toast";
import { BookOpen, Brain, Award, MessageCircle, BarChart3, Check } from "lucide-react";

type Lingua = "inglese" | "francese" | "spagnolo";

const bandiere: Record<Lingua, string> = {
  inglese: "🇬🇧",
  francese: "🇫🇷",
  spagnolo: "🇪🇸",
};

const saluti: Record<Lingua, string> = {
  inglese: "Welcome to your English training!",
  francese: "Bienvenue dans ton entraînement de français !",
  spagnolo: "¡Bienvenido a tu entrenamiento de español!",
};

const languageCards = [
  {
    href: "/lingue/teoria",
    icon: BookOpen,
    title: "Teoria Grammaticale",
    description: "Studia la grammatica in modo chiaro e strutturato",
    available: true
  },
  {
    href: "/lingue/vocabolario",
    icon: Brain,
    title: "Vocabolario Tematico",
    description: "Espandi il tuo lessico con vocabolari tematici e quiz per ogni livello",
    available: true
  },
  {
    href: "/lingue/certificazioni",
    icon: Award,
    title: "Simulazioni Certificazioni",
    description: "Allenati per certificazioni linguistiche con test reali creati da Agente Fox",
    available: true
  },
  {
    href: "#",
    icon: MessageCircle,
    title: "Conversazione",
    description: "La sezione è in fase di sviluppo finale. Presto potrai simulare dialoghi reali",
    available: false
  },
  {
    href: "/lingue/notifiche-statistiche",
    icon: BarChart3,
    title: "Notifiche e Statistiche",
    description: "Consulta le notifiche e i tuoi progressi generali in tutte le lingue",
    available: true
  }
];

export default function LingueHomePage() {
  const [lingua, setLingua] = useState<Lingua>("inglese");

  useEffect(() => {
    const fetchLingua = async () => {
      const { data: session } = await supabase.auth.getUser();
      const user = session?.user;
      if (!user) return;
  
      const { data: profilo } = await supabase
        .from("profiles")
        .select("lingua_preferita")
        .eq("id", user.id)
        .single();
  
      if (profilo?.lingua_preferita) {
        setLingua(profilo.lingua_preferita as Lingua);
        console.log("Lingua caricata dal profilo:", profilo.lingua_preferita);
      }
    };
    fetchLingua();
  }, []);

  const handleLinguaChange = async (nuovaLingua: Lingua) => {
    setLingua(nuovaLingua);
    const { data: session, error: userError } = await supabase.auth.getUser();
    const user = session?.user;
  
    if (!user || userError) {
      toast.error("Errore: utente non autenticato.");
      return;
    }
  
    const { error } = await supabase
      .from("profiles")
      .update({ lingua_preferita: nuovaLingua })
      .eq("id", user.id);
  
    if (error) {
      toast.error("Errore nel salvataggio della lingua.");
      console.error("Errore Supabase:", error);
    } else {
      toast.success("Lingua aggiornata nel profilo!");
      console.log("Lingua salvata con successo su Supabase:", nuovaLingua);
    }
  };

  const showInDevelopment = () => {
    toast("💬 La sezione Conversazione è in arrivo! Siamo nelle fasi finali dello sviluppo.", {
      icon: "🚧",
    });
  };

  return (
    <DashboardLayout
      title="Allenamento Lingue"
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Allenamento" },
        { label: "Lingue" }
      ]}
    >
      <div className="space-y-6">
        {/* Language Selection Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <span className="text-2xl">🌍</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Seleziona la lingua da studiare
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                La preferenza verrà salvata nel tuo profilo
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {(["inglese", "francese", "spagnolo"] as Lingua[]).map((lang) => (
              <button
                key={lang}
                onClick={() => handleLinguaChange(lang)}
                className={`relative w-12 h-12 rounded-xl border-2 transition-all hover:scale-105 flex items-center justify-center ${
                  lingua === lang 
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-sm" 
                    : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-800"
                }`}
                title={lang.charAt(0).toUpperCase() + lang.slice(1)}
              >
                <span className="text-2xl">{bandiere[lang]}</span>
                {lingua === lang && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Welcome Message */}
        <div className="p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl">
          <p className="text-lg font-medium text-blue-900 dark:text-blue-100">
            {saluti[lingua]}
          </p>
        </div>

        {/* Info Banner */}
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <strong>💡 Suggerimento:</strong> Tutti i contenuti sono curati da Agente Fox e sempre aggiornati. 
            La lingua selezionata sarà utilizzata automaticamente in tutte le sezioni di allenamento.
          </p>
        </div>

        {/* Language Sections Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {languageCards.map((card) => {
            const Icon = card.icon;
            
            if (!card.available) {
              return (
                <div
                  key={card.title}
                  onClick={showInDevelopment}
                  className="group p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all cursor-pointer relative overflow-hidden"
                >
                  <div className="absolute top-4 right-4">
                    <div className="px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-medium rounded-full">
                      In sviluppo
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center group-hover:bg-gray-200 dark:group-hover:bg-gray-600 transition-colors">
                      <Icon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        {card.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                        {card.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <Link key={card.title} href={card.href}>
                <div className="group p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-blue-200 dark:hover:border-blue-700 transition-all cursor-pointer">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 transition-colors">
                      <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                        {card.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                        {card.description.replace("di " + lingua, `di ${lingua}`)}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Statistics Preview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-green-900 dark:text-green-100">Lezioni Completate</p>
                <p className="text-xs text-green-700 dark:text-green-300">Visualizza i tuoi progressi</p>
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <Brain className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-purple-900 dark:text-purple-100">Vocabolario Appreso</p>
                <p className="text-xs text-purple-700 dark:text-purple-300">Parole memorizzate</p>
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                <Award className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-orange-900 dark:text-orange-100">Certificazioni</p>
                <p className="text-xs text-orange-700 dark:text-orange-300">Obiettivi raggiunti</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

LingueHomePage.requireAuth = true;