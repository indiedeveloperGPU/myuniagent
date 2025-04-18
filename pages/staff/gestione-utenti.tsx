import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import StaffLayout from "@/components/StaffLayout";

interface Profile {
  id: string;
  email: string;
  name: string;
  ruolo: "studente" | "docente" | "staff";
  is_verified: boolean;
  abbonamento_attivo: boolean;
}

function GestioneUtenti() {
  const [utenti, setUtenti] = useState<Profile[]>([]);
  const [filtro, setFiltro] = useState<"tutti" | "studenti" | "docenti_approvati" | "docenti_attesa">("tutti");
  const [loading, setLoading] = useState(false);

  const fetchUtenti = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("profiles").select("*");
    if (!error && data) setUtenti(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchUtenti();
  }, []);

  const handleApprovaDocente = async (id: string) => {
    await supabase.from("profiles").update({ is_verified: true }).eq("id", id);
    fetchUtenti();
  };

  const handleBannaUtente = async (id: string) => {
    const conferma = confirm("Sei sicuro di voler bannare questo utente?");
    if (!conferma) return;
    await supabase.from("profiles").delete().eq("id", id);
    fetchUtenti();
  };

  const handleResetProfilo = async (id: string) => {
    await supabase.from("profiles").update({ name: "", abbonamento_attivo: false }).eq("id", id);
    fetchUtenti();
  };

  const handleToggleAbbonamento = async (id: string, attivo: boolean) => {
    await supabase.from("profiles").update({ abbonamento_attivo: !attivo }).eq("id", id);
    fetchUtenti();
  };

  const utentiFiltrati = utenti.filter((u) => {
    if (filtro === "studenti") return u.ruolo === "studente";
    if (filtro === "docenti_approvati") return u.ruolo === "docente" && u.is_verified;
    if (filtro === "docenti_attesa") return u.ruolo === "docente" && !u.is_verified;
    return true;
  });

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">👥 Gestione Utenti</h1>

      <div className="flex gap-2 mb-6">
        {["tutti", "studenti", "docenti_approvati", "docenti_attesa"].map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f as any)}
            className={`px-4 py-2 rounded ${filtro === f ? "bg-blue-600 text-white" : "bg-gray-200"}`}
          >
            {f.replace("_", " ")}
          </button>
        ))}
      </div>

      {loading ? (
        <p>Caricamento utenti...</p>
      ) : (
        <div className="space-y-4">
          {utentiFiltrati.length === 0 && <p className="text-gray-600">Nessun utente trovato.</p>}
          {utentiFiltrati.map((u) => (
            <div key={u.id} className="border p-4 rounded shadow bg-white">
              <p><strong>Email:</strong> {u.email}</p>
              <p><strong>Nome:</strong> {u.name || "—"}</p>
              <p><strong>Ruolo:</strong> {u.ruolo}</p>
              {u.ruolo === "docente" && (
                <p><strong>Verificato:</strong> {u.is_verified ? "✅ Sì" : "❌ No"}</p>
              )}
              <p><strong>Abbonamento:</strong> {u.abbonamento_attivo ? "Attivo ✅" : "Non attivo ❌"}</p>

              <div className="flex gap-2 mt-3 flex-wrap">
                {u.ruolo === "docente" && !u.is_verified && (
                  <button
                    onClick={() => handleApprovaDocente(u.id)}
                    className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                  >
                    ✅ Approva
                  </button>
                )}
                <button
                  onClick={() => handleToggleAbbonamento(u.id, u.abbonamento_attivo)}
                  className="bg-yellow-600 text-white px-3 py-1 rounded hover:bg-yellow-700"
                >
                  {u.abbonamento_attivo ? "🔒 Disattiva" : "🔓 Attiva"}
                </button>
                <button
                  onClick={() => handleResetProfilo(u.id)}
                  className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                >
                  ♻️ Reset profilo
                </button>
                <button
                  onClick={() => handleBannaUtente(u.id)}
                  className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                >
                  🚫 Banna
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ✅ Layout dedicato e protezione pagina
GestioneUtenti.getLayout = function getLayout(page: React.ReactNode) {
  return <StaffLayout>{page}</StaffLayout>;
};

GestioneUtenti.requireAuth = true;

export default GestioneUtenti;
