import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import DashboardLayout from "@/components/DashboardLayout";

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

        if (!error && data?.name) {
          setName(data.name);
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

  if (loading) return <p>Caricamento...</p>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-10">
      {/* Benvenuto */}
      <div>
        <h1 className="text-3xl font-bold mb-2">👋 Benvenuto{name ? `, ${name}` : ""}!</h1>
        <p className="text-gray-700">
          Hai effettuato correttamente l’accesso a <strong>MyUniAgent</strong>. Usa la barra laterale per accedere alle funzionalità.
        </p>
      </div>

      {/* Novità */}
      <section>
        <h2 className="text-xl font-semibold mb-4">🆕 Novità sulla piattaforma</h2>
        <ul className="space-y-4">
          {[
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
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-3">
              <div className="text-xl">{item.icon}</div>
              <div>
                <p className="font-medium text-blue-700">{item.title}</p>
                <p className="text-sm text-gray-600">{item.desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Roadmap */}
      <section>
        <h2 className="text-xl font-semibold mb-4">🔭 In arrivo prossimamente</h2>
        <ul className="space-y-4">
          {[
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
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-3">
              <div className="text-xl">{item.icon}</div>
              <div>
                <p className="font-medium text-gray-800">{item.title}</p>
                <p className="text-sm text-gray-600">{item.desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Logout */}
      <div>
        <button
          onClick={handleLogout}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          🔓 Logout
        </button>
      </div>
    </div>
  );
}

// ✅ Layout e protezione
DashboardPage.requireAuth = true;
DashboardPage.getLayout = function getLayout(page: React.ReactNode) {
  return <DashboardLayout>{page}</DashboardLayout>;
};





