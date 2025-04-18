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

interface Ticket {
  id: number;
  stato: "aperto" | "chiuso";
  tipo: string;
}

function StaffDashboard() {
  const [utenti, setUtenti] = useState<Profile[]>([]);
  const [filtro, setFiltro] = useState<"tutti" | "studenti" | "docenti_approvati" | "docenti_attesa">("tutti");
  const [loading, setLoading] = useState(false);
  const [ticketStats, setTicketStats] = useState<{
    totale: number;
    aperti: number;
    chiusi: number;
    perTipo: Record<string, number>;
  }>({ totale: 0, aperti: 0, chiusi: 0, perTipo: {} });

  const fetchUtenti = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("profiles").select("*");
    if (!error && data) setUtenti(data);
    setLoading(false);
  };

  const fetchTicketStats = async () => {
    const { data, error } = await supabase.from("support_tickets").select("stato, tipo");
    if (!error && data) {
      const stats = {
        totale: data.length,
        aperti: data.filter(t => t.stato === "aperto").length,
        chiusi: data.filter(t => t.stato === "chiuso").length,
        perTipo: {} as Record<string, number>
      };
      data.forEach(ticket => {
        stats.perTipo[ticket.tipo] = (stats.perTipo[ticket.tipo] || 0) + 1;
      });
      setTicketStats(stats);
    }
  };

  useEffect(() => {
    fetchUtenti();
    fetchTicketStats();
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

  const handleToggleAbbonamento = async (id: string, attuale: boolean) => {
    await supabase.from("profiles").update({ abbonamento_attivo: !attuale }).eq("id", id);
    fetchUtenti();
  };

  const utentiFiltrati = utenti.filter((u) => {
    if (filtro === "studenti") return u.ruolo === "studente";
    if (filtro === "docenti_approvati") return u.ruolo === "docente" && u.is_verified;
    if (filtro === "docenti_attesa") return u.ruolo === "docente" && !u.is_verified;
    return true;
  });

  return (
    <>
      <h1 className="text-3xl font-bold mb-6">🛠️ Pannello Staff</h1>

      {/* 🔍 Riepilogo ticket supporto */}
      <div className="mb-8 p-4 bg-white rounded shadow border border-blue-200">
        <h2 className="text-xl font-semibold mb-2">📬 Riepilogo ticket supporto</h2>
        <p><strong>Totali:</strong> {ticketStats.totale}</p>
        <p><strong>Aperti:</strong> {ticketStats.aperti}</p>
        <p><strong>Chiusi:</strong> {ticketStats.chiusi}</p>
        <p className="mt-2"><strong>Per tipo:</strong></p>
        <ul className="list-disc list-inside text-sm text-gray-700">
          {Object.entries(ticketStats.perTipo).map(([tipo, count]) => (
            <li key={tipo}>{tipo}: {count}</li>
          ))}
        </ul>
      </div>

      {/* 🎓 Gestione utenti */}
      <div className="flex gap-2 mb-6">
        <button onClick={() => setFiltro("tutti")} className={`px-4 py-2 rounded ${filtro === "tutti" ? "bg-blue-600 text-white" : "bg-gray-200"}`}>
          Tutti
        </button>
        <button onClick={() => setFiltro("studenti")} className={`px-4 py-2 rounded ${filtro === "studenti" ? "bg-blue-600 text-white" : "bg-gray-200"}`}>
          Studenti
        </button>
        <button onClick={() => setFiltro("docenti_approvati")} className={`px-4 py-2 rounded ${filtro === "docenti_approvati" ? "bg-blue-600 text-white" : "bg-gray-200"}`}>
          Docenti approvati
        </button>
        <button onClick={() => setFiltro("docenti_attesa")} className={`px-4 py-2 rounded ${filtro === "docenti_attesa" ? "bg-blue-600 text-white" : "bg-gray-200"}`}>
          Docenti in attesa
        </button>
      </div>

      {loading ? (
        <p>Caricamento utenti...</p>
      ) : (
        <div className="space-y-4">
          {utentiFiltrati.length === 0 && <p className="text-gray-600">Nessun utente trovato.</p>}
          {utentiFiltrati.map((utente) => (
            <div key={utente.id} className="border p-4 rounded shadow bg-white">
              <p><strong>📧 Email:</strong> {utente.email}</p>
              <p><strong>👤 Nome:</strong> {utente.name || "—"}</p>
              <p><strong>🎓 Ruolo:</strong> {utente.ruolo}</p>
              {utente.ruolo === "docente" && (
                <p><strong>✅ Verificato:</strong> {utente.is_verified ? "Sì" : "No"}</p>
              )}
              <p><strong>💳 Abbonamento:</strong> {utente.abbonamento_attivo ? "Attivo" : "Non attivo"}</p>

              <div className="mt-3 flex flex-wrap gap-2">
                {utente.ruolo === "docente" && !utente.is_verified && (
                  <button onClick={() => handleApprovaDocente(utente.id)} className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700">
                    ✅ Approva docente
                  </button>
                )}
                <button onClick={() => handleToggleAbbonamento(utente.id, utente.abbonamento_attivo)} className="bg-yellow-600 text-white px-3 py-1 rounded hover:bg-yellow-700">
                  {utente.abbonamento_attivo ? "🔒 Disattiva abbonamento" : "🔓 Attiva abbonamento"}
                </button>
                <button onClick={() => handleResetProfilo(utente.id)} className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">
                  ♻️ Reset profilo
                </button>
                <button onClick={() => handleBannaUtente(utente.id)} className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700">
                  🚫 Banna utente
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

StaffDashboard.getLayout = (page: React.ReactNode) => <StaffLayout>{page}</StaffLayout>;
StaffDashboard.requireAuth = true;

export default StaffDashboard;
