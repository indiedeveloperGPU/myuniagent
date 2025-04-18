import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import DashboardLayout from "@/components/DashboardLayout";
import toast, { Toaster } from "react-hot-toast";

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

    if (!error && data) {
      setStorico(data);
    }

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
      <h1 className="text-2xl font-bold mb-6">🎟️ Supporto Studente</h1>

      <div className="mb-4">
        <label className="block font-semibold mb-1">Tipo di richiesta</label>
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
          className="w-full border rounded px-3 py-2"
        >
          <option value="problema tecnico">Problema tecnico</option>
          <option value="generale">Generale</option>
          <option value="pagamento/abbonamento">Pagamento / Abbonamento</option>
        </select>
      </div>

      <div className="mb-4">
        <label className="block font-semibold mb-1">Oggetto</label>
        <input
          type="text"
          value={oggetto}
          onChange={(e) => setOggetto(e.target.value)}
          className="w-full border rounded px-3 py-2"
          placeholder="Es: Problema caricamento tesi"
        />
      </div>

      <div className="mb-4">
        <label className="block font-semibold mb-1">Messaggio</label>
        <textarea
          value={messaggio}
          onChange={(e) => setMessaggio(e.target.value)}
          rows={5}
          className="w-full border rounded px-3 py-2"
          placeholder="Descrivi il problema o la tua richiesta"
        />
      </div>

      <button
        onClick={handleInvio}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        Invia ticket
      </button>

      <div className="mt-10">
        <h2 className="text-xl font-bold mb-4">📂 I miei ticket precedenti</h2>
        {loading ? (
          <p>Caricamento...</p>
        ) : storico.length === 0 ? (
          <p className="text-gray-600">Nessun ticket inviato finora.</p>
        ) : (
          <table className="w-full table-auto border border-gray-200">
            <thead className="bg-gray-100">
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
                <tr key={ticket.id} className="border-t hover:bg-gray-50">
                  <td className="px-3 py-2">{ticket.oggetto}</td>
                  <td className="px-3 py-2">{ticket.tipo}</td>
                  <td className="px-3 py-2">{new Date(ticket.creato_il).toLocaleDateString()}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded text-white ${
                        ticket.stato === "aperto" ? "bg-green-600" : "bg-red-600"
                      }`}
                    >
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
      </div>

      {selectedTicket && (
        <div className="fixed inset-0 bg-white bg-opacity-40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded shadow-lg p-6 w-full max-w-xl relative">
            <button
              onClick={() => setSelectedTicket(null)}
              className="absolute top-2 right-2 text-gray-600 hover:text-black"
            >
              ✖️
            </button>

            <h2 className="text-xl font-bold mb-4">🎫 Dettaglio Ticket</h2>
            <p><strong>📝 Oggetto:</strong> {selectedTicket.oggetto}</p>
            <p><strong>📂 Tipo:</strong> {selectedTicket.tipo}</p>
            <p><strong>📅 Inviato il:</strong> {new Date(selectedTicket.creato_il).toLocaleString()}</p>
            <p className="mt-2"><strong>✉️ Messaggio:</strong> {selectedTicket.messaggio}</p>
            {selectedTicket.risposta && (
              <div className="mt-2 bg-gray-100 p-3 rounded">
                <strong>📩 Risposta staff:</strong>
                <p>{selectedTicket.risposta}</p>
              </div>
            )}
            {selectedTicket.stato === "aperto" && (
              <div className="mt-3">
                <label className="block font-semibold mb-1">💬 Rispondi:</label>
                <textarea
                  className="w-full border rounded px-3 py-2"
                  rows={2}
                  value={newReply[selectedTicket.id] || ""}
                  onChange={(e) =>
                    setNewReply({ ...newReply, [selectedTicket.id]: e.target.value })
                  }
                  placeholder="Scrivi una risposta..."
                />
                <button
                  onClick={() => handleReply(selectedTicket.id)}
                  className="mt-2 bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700"
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


