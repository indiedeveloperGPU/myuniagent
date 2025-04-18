import DocenteLayout from "@/components/DocenteLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

function DashboardDocentePage() {
  const [nome, setNome] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (!user || userError) {
        console.error("Errore nel recupero utente:", userError);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", user.id)
        .single();

      if (!error && data?.name) {
        setNome(data.name);
      }

      setLoading(false);
    };

    fetchProfile();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  };

  if (loading) {
    return (
      <DocenteLayout>
        <p>Caricamento...</p>
      </DocenteLayout>
    );
  }

  return (
    <DocenteLayout>
      <h1 className="text-3xl font-bold mb-2">👨‍🏫 Benvenuto{nome ? `, ${nome}` : ""}!</h1>
      <p className="mb-6 text-gray-700">
        Questa è la tua dashboard docente. Da qui puoi gestire classi, materiali, test ed esercizi per i tuoi studenti.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
        <Link href="/docente/classi">
          <div className="p-4 border rounded bg-white shadow hover:shadow-md transition cursor-pointer">
            <h2 className="text-lg font-semibold mb-2">🏫 Le tue classi</h2>
            <p className="text-gray-600 text-sm">
              Crea e gestisci classi virtuali. Assegna studenti, materiali e test personalizzati.
            </p>
          </div>
        </Link>

        <Link href="/docente/materiali">
          <div className="p-4 border rounded bg-white shadow hover:shadow-md transition cursor-pointer">
            <h2 className="text-lg font-semibold mb-2">📄 Materiali didattici</h2>
            <p className="text-gray-600 text-sm">
              Carica e condividi file, documenti, spiegazioni ed esempi con gli studenti.
            </p>
          </div>
        </Link>

        <Link href="/docente/test">
          <div className="p-4 border rounded bg-white shadow hover:shadow-md transition cursor-pointer">
            <h2 className="text-lg font-semibold mb-2">🧪 Test ed esercizi</h2>
            <p className="text-gray-600 text-sm">
              Crea test scritti o orali, con correzione automatica o personalizzata.
            </p>
          </div>
        </Link>

        <Link href="/docente/lezioni">
          <div className="p-4 border rounded bg-white shadow hover:shadow-md transition cursor-pointer">
            <h2 className="text-lg font-semibold mb-2">📚 Lezioni</h2>
            <p className="text-gray-600 text-sm">
              Prepara le tue lezioni con l’aiuto dell’AI o manualmente. Aggiungi note, allegati e condividile con le classi.
            </p>
          </div>
        </Link>

        <Link href="/docente/monitoraggio">
          <div className="p-4 border rounded bg-white shadow hover:shadow-md transition cursor-pointer">
            <h2 className="text-lg font-semibold mb-2">📊 Monitoraggio</h2>
            <p className="text-gray-600 text-sm">
              Visualizza i progressi degli studenti, analizza i risultati e fornisci feedback.
            </p>
          </div>
        </Link>

        <Link href="/dashboard">
          <div className="p-4 border rounded bg-white shadow hover:shadow-md transition cursor-pointer">
            <h2 className="text-lg font-semibold mb-2">🏠 Home</h2>
            <p className="text-gray-600 text-sm">
              Visualizza la dashboard studente, utilizza i molteplici strumenti a disposizione.
            </p>
          </div>
        </Link>
      </div>

      <button
        onClick={handleLogout}
        className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
      >
        Logout
      </button>
    </DocenteLayout>
  );
}


import { withAccess } from "@/lib/withRole";
export default withAccess(DashboardDocentePage, ["docente"]);


