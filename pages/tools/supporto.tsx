import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import DashboardLayout from "@/components/DashboardLayout";
import toast, { Toaster } from "react-hot-toast";
import { motion } from "framer-motion";

function SupportoPage() {
  const [tipo, setTipo] = useState("generale");
  const [oggetto, setOggetto] = useState("");
  const [messaggio, setMessaggio] = useState("");
  const [storico, setStorico] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newReply, setNewReply] = useState<Record<string, string>>({});
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);

  const fetchMieiTicket = async () => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;

    if (!userId) return;

    const { data, error } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("user_id", userId)
      .order("creato_il", { ascending: false });

    if (!error && data) setStorico(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchMieiTicket();

    const channel = supabase
      .channel("ticket_updates")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "support_tickets",
        },
        (payload) => {
          const updated = payload.new;
          setStorico((prev) =>
            prev.map((ticket) => (ticket.id === updated.id ? updated : ticket))
          );
          toast.success("📩 Nuova risposta dello staff su un ticket!");
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const handleInvio = async () => {
    if (!oggetto.trim() || !messaggio.trim()) {
      toast.error("Inserisci oggetto e messaggio.");
      return;
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    const email = userData?.user?.email;

    if (userError || !userId || !email) {
      toast.error("Utente non autenticato.");
      return;
    }

    const { error } = await supabase.from("support_tickets").insert({
      user_id: userId,
      email,
      tipo,
      oggetto,
      messaggio,
      stato: "aperto",
    });

    if (!error) {
      toast.success("✅ Ticket inviato correttamente!");
      setOggetto("");
      setMessaggio("");
      setTipo("generale");
      fetchMieiTicket();
    } else {
      toast.error("Errore durante l'invio del ticket.");
    }
  };

  const handleReply = async (ticketId: string) => {
    const risposta = newReply[ticketId];
    if (!risposta?.trim()) return;

    const { error } = await supabase
      .from("support_tickets")
      .update({ messaggio: risposta })
      .eq("id", ticketId);

    if (!error) {
      toast.success("Risposta inviata!");
      setNewReply((prev) => ({ ...prev, [ticketId]: "" }));
      fetchMieiTicket();
    } else {
      toast.error("Errore durante la risposta.");
    }
  };

  return (
    <>
      <Toaster />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-5xl mx-auto px-4 pt-10 space-y-10"
      >
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          🎟️ Supporto Studente
        </h1>

        {/* Sezione invio ticket */}
        <section className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-xl shadow space-y-4 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100">
          <h2 className="text-xl font-semibold text-blue-800 dark:text-blue-300">
            📨 Invia una richiesta di supporto
          </h2>

          <div>
            <label className="block font-medium mb-1">Tipo di richiesta</label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700"
            >
              <option value="problema tecnico">Problema tecnico</option>
              <option value="generale">Generale</option>
              <option value="pagamento/abbonamento">Pagamento / Abbonamento</option>
            </select>
          </div>

          <div>
            <label className="block font-medium mb-1">Oggetto</label>
            <input
              type="text"
              value={oggetto}
              onChange={(e) => setOggetto(e.target.value)}
              className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700"
              placeholder="Es: Problema caricamento tesi"
            />
          </div>

          <div>
            <label className="block font-medium mb-1">Messaggio</label>
            <textarea
              value={messaggio}
              onChange={(e) => setMessaggio(e.target.value)}
              rows={4}
              className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700"
              placeholder="Descrivi il problema o la tua richiesta"
            />
          </div>

          <button
            onClick={handleInvio}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg shadow"
          >
            Invia ticket
          </button>
        </section>

        {/* Storico ticket */}
        <section className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            📂 I miei ticket precedenti
          </h2>

          {loading ? (
            <p>Caricamento...</p>
          ) : storico.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-300">Nessun ticket inviato finora.</p>
          ) : (
            <table className="w-full table-auto border border-gray-200 dark:border-gray-700 text-sm">
              <thead className="bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100">
                <tr>
                  <th className="text-left px-3 py-2">📝 Oggetto</th>
                  <th className="text-left px-3 py-2">📂 Tipo</th>
                  <th className="text-left px-3 py-2">📅 Data</th>
                  <th className="text-left px-3 py-2">📌 Stato</th>
                  <th className="text-left px-3 py-2">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {storico.map((ticket) => (
                  <tr key={ticket.id} className="border-t hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-3 py-2">{ticket.oggetto}</td>
                    <td className="px-3 py-2">{ticket.tipo}</td>
                    <td className="px-3 py-2">{new Date(ticket.creato_il).toLocaleDateString()}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                        ticket.stato === "aperto"
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                      }`}>
                        {ticket.stato === "aperto" ? "Aperto" : "Chiuso"}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <button
                        className="text-blue-600 hover:underline"
                        onClick={() => setSelectedTicket(ticket)}
                      >
                        Apri
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </motion.div>

      {/* Modale dettaglio ticket */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl shadow-xl p-6 w-full max-w-xl relative">
            <button
              onClick={() => setSelectedTicket(null)}
              className="absolute top-2 right-2 text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white"
            >
              ✖️
            </button>

            <h2 className="text-xl font-bold mb-4">🎫 Dettaglio Ticket</h2>
            <p><strong>📝 Oggetto:</strong> {selectedTicket.oggetto}</p>
            <p><strong>📂 Tipo:</strong> {selectedTicket.tipo}</p>
            <p><strong>📅 Inviato il:</strong> {new Date(selectedTicket.creato_il).toLocaleString()}</p>
            <p className="mt-2"><strong>✉️ Messaggio:</strong> {selectedTicket.messaggio}</p>

            {selectedTicket.risposta && (
              <div className="mt-2 bg-gray-100 dark:bg-gray-800 p-3 rounded">
                <strong>📩 Risposta staff:</strong>
                <p>{selectedTicket.risposta}</p>
              </div>
            )}

            {selectedTicket.stato === "aperto" && (
              <div className="mt-4">
                <label className="block font-medium mb-1">💬 Rispondi:</label>
                <textarea
                  rows={3}
                  className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700"
                  value={newReply[selectedTicket.id] || ""}
                  onChange={(e) =>
                    setNewReply({ ...newReply, [selectedTicket.id]: e.target.value })
                  }
                  placeholder="Scrivi una risposta..."
                />
                <button
                  onClick={() => handleReply(selectedTicket.id)}
                  className="mt-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg shadow"
                >
                  Invia risposta
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

SupportoPage.requireAuth = true;
SupportoPage.getLayout = (page: React.ReactNode) => (
  <DashboardLayout>{page}</DashboardLayout>
);

export default SupportoPage;


