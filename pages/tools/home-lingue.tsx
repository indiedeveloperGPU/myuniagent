import { useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "react-hot-toast";

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
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <h1 className="text-3xl font-bold">🌍 Allenamento Lingue</h1>
          <div className="flex items-center gap-2">
            <p className="text-sm text-gray-500 mr-2">Seleziona la lingua da studiare:</p>
            {(["inglese", "francese", "spagnolo"] as Lingua[]).map((lang) => (
              <button
                key={lang}
                onClick={() => handleLinguaChange(lang)}
                className={`text-2xl transition-transform transform hover:scale-110 ${
                  lingua === lang ? "opacity-100" : "opacity-50"
                }`}
                title={lang.charAt(0).toUpperCase() + lang.slice(1)}
              >
                {bandiere[lang]}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 p-4 rounded-md shadow mb-6">
        <p className="text-lg font-medium text-blue-800 dark:text-blue-100">
            {saluti[lingua]}
          </p>
        </div>

        <div className="bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 text-yellow-900 dark:text-yellow-100 p-4 rounded-md shadow mb-6">
          <p className="text-sm">
            Puoi selezionare la lingua che desideri studiare cliccando sulle bandiere in alto. La preferenza verrà salvata nel tuo profilo e sarà utilizzata automaticamente in tutte le sezioni (teoria, vocabolario, certificazioni, conversazione). Puoi cambiarla in qualsiasi momento.
          </p>
        </div>

        <p className="text-gray-600 dark:text-gray-300 mb-8">
          Esplora le sezioni disponibili per migliorare la tua conoscenza delle lingue straniere. Tutti i contenuti sono curati da Agente Fox e sempre aggiornati.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link href="/lingue/teoria">
          <div className="p-6 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl shadow hover:shadow-lg transition cursor-pointer border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold mb-2">📘 Teoria Grammaticale</h2>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Studia la grammatica di {lingua} in modo chiaro e strutturato.
              </p>
            </div>
          </Link>

          <Link href="/lingue/vocabolario">
          <div className="p-6 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl shadow hover:shadow-lg transition cursor-pointer border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold mb-2">🧠 Vocabolario Tematico</h2>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Espandi il tuo lessico con vocabolari tematici e quiz per ogni livello.
              </p>
            </div>
          </Link>

          <Link href="/lingue/certificazioni">
          <div className="p-6 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl shadow hover:shadow-lg transition cursor-pointer border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold mb-2">🎓 Simulazioni Certificazioni</h2>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Allenati per certificazioni linguistiche con test reali creati da Agente Fox.
              </p>
            </div>
          </Link>

          <div
  onClick={showInDevelopment}
  className="p-6 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl shadow hover:shadow-lg transition cursor-pointer border border-gray-200 dark:border-gray-700"
>
  <h2 className="text-xl font-semibold mb-2">💬 Conversazione</h2>
  <p className="text-gray-600 dark:text-gray-300 text-sm">
    La sezione è in fase di sviluppo finale. Presto potrai simulare dialoghi reali.
  </p>
</div>


          <Link href="/lingue/notifiche-statistiche">
          <div className="p-6 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl shadow hover:shadow-lg transition cursor-pointer border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold mb-2">📚 Notifiche e Statistiche</h2>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Consulta le notifiche e i tuoi progressi generali in tutte le lingue.
              </p>
            </div>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}

LingueHomePage.requireAuth = true

