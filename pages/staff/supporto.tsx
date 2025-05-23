import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import StaffLayout from "@/components/StaffLayout";
import toast from "react-hot-toast";

interface Ticket {
  id: string;
  user_id: string;
  email: string;
  oggetto: string;
  tipo: string;
  messaggio: string;
  risposta: string | null;
  stato: "aperto" | "chiuso";
  creato_il: string;
  chiuso_il?: string;
}

function StaffSupport() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [risposte, setRisposte] = useState<Record<string, string>>({});
  const [statoFiltro, setStatoFiltro] = useState<string>("tutti");
  const [search, setSearch] = useState<string>("");

  const fetchTickets = async () => {
    const { data, error } = await supabase
      .from("support_tickets")
      .select("*")
      .order("creato_il", { ascending: false });

    if (!error && data) {
      setTickets(data);
      setFilteredTickets(data);
    }
    setLoading(false);
  };

  const filterAndSearch = () => {
    let filtered = [...tickets];

    if (statoFiltro !== "tutti") {
      filtered = filtered.filter((t) => t.stato === statoFiltro);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.email.toLowerCase().includes(q) ||
          t.oggetto.toLowerCase().includes(q) ||
          t.messaggio.toLowerCase().includes(q)
      );
    }

    setFilteredTickets(filtered);
  };

  useEffect(() => {
    fetchTickets();

    const channel = supabase
      .channel("realtime-support")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "support_tickets",
        },
        () => {
          toast("🔔 Ticket aggiornato");
          fetchTickets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    filterAndSearch();
  }, [statoFiltro, search, tickets]);

  const handleRispondi = async (ticketId: string, risposta: string) => {
    if (!risposta.trim()) return toast.error("Inserisci una risposta valida.");

    const originale = tickets.find((t) => t.id === ticketId);
    if (originale?.risposta === risposta) {
      toast("Risposta invariata");
      return;
    }

    const { error } = await supabase
      .from("support_tickets")
      .update({ risposta })
      .eq("id", ticketId);

    if (!error) {
      toast.success("Risposta salvata ✅");
      fetchTickets();
      setSelectedTicket(null);
    } else {
      toast.error("Errore durante l'invio");
    }
  };

  const handleChiudi = async (ticketId: string) => {
    const { error } = await supabase
      .from("support_tickets")
      .update({ stato: "chiuso", chiuso_il: new Date().toISOString() })
      .eq("id", ticketId);

    if (!error) {
      toast.success("Ticket chiuso ✅");
      fetchTickets();
      setSelectedTicket(null);
    } else {
      toast.error("Errore durante la chiusura");
    }
  };

  const handleElimina = async (ticketId: string) => {
    const conferma = window.confirm("Sei sicuro di voler eliminare questo ticket?");
    if (!conferma) return;

    const { error } = await supabase.from("support_tickets").delete().eq("id", ticketId);

    if (!error) {
      toast.success("Ticket eliminato ✅");
      fetchTickets();
      setSelectedTicket(null);
    } else {
      toast.error("Errore durante l'eliminazione");
    }
  };

  return (
    <div className="p-6 text-gray-900 dark:text-gray-100 transition-colors duration-200">
      <h1 className="text-3xl font-bold mb-4 text-gray-800 dark:text-white">📬 Ticket di Supporto</h1>

      <div className="flex flex-wrap items-center gap-4 mb-6">
        <select
          className="border px-3 py-2 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700"
          value={statoFiltro}
          onChange={(e) => setStatoFiltro(e.target.value)}
        >
          <option value="tutti">Tutti</option>
          <option value="aperto">Aperti</option>
          <option value="chiuso">Chiusi</option>
        </select>
        <input
          type="text"
          placeholder="🔍 Cerca per email, oggetto, testo..."
           className="border px-3 py-2 rounded w-full md:w-1/3 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <p>Caricamento...</p>
      ) : (
        <table className="w-full table-auto border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-800">
          <thead className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
            <tr>
              <th className="text-left px-3 py-2">📝 Oggetto</th>
              <th className="text-left px-3 py-2">📂 Tipo</th>
              <th className="text-left px-3 py-2">📅 Data</th>
              <th className="text-left px-3 py-2">📌 Stato</th>
              <th className="text-left px-3 py-2">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {filteredTickets.map((ticket) => (
              <tr key={ticket.id} className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
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

      {selectedTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex items-center justify-center z-50">
           <div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded shadow-lg p-6 w-full max-w-xl relative">
            <button
              onClick={() => setSelectedTicket(null)}
              className="absolute top-2 right-2 text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white"
            >
              ✖️
            </button>

            <h2 className="text-xl font-bold mb-4">🎫 Dettaglio Ticket</h2>
            <p><strong>📧 Email:</strong> {selectedTicket.email}</p>
            <p><strong>📝 Oggetto:</strong> {selectedTicket.oggetto}</p>
            <p><strong>📂 Tipo:</strong> {selectedTicket.tipo}</p>
            <p><strong>📅 Inviato il:</strong> {new Date(selectedTicket.creato_il).toLocaleString()}</p>
            {selectedTicket.chiuso_il && (
              <p><strong>📌 Chiuso il:</strong> {new Date(selectedTicket.chiuso_il).toLocaleString()}</p>
            )}
            <p className="mt-2"><strong>✉️ Messaggio:</strong> {selectedTicket.messaggio}</p>

            <div className="mt-4">
              <label className="block mb-1 font-semibold">✍️ Risposta staff:</label>
              <textarea
                className="w-full border rounded p-2 mb-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700"
                rows={3}
                disabled={selectedTicket.stato === "chiuso"}
                value={risposte[selectedTicket.id] ?? selectedTicket.risposta ?? ""}
                onChange={(e) =>
                  setRisposte({ ...risposte, [selectedTicket.id]: e.target.value })
                }
                placeholder="Scrivi o modifica la risposta..."
              />
              <button
                onClick={() => handleRispondi(selectedTicket.id, risposte[selectedTicket.id] || "")}
                className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700 mr-2"
                disabled={selectedTicket.stato === "chiuso"}
              >
                Invia
              </button>
              <button
                onClick={() => handleChiudi(selectedTicket.id)}
                className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 mr-2"
                disabled={selectedTicket.stato === "chiuso"}
              >
                Chiudi
              </button>
              <button
                onClick={() => handleElimina(selectedTicket.id)}
                className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
              >
                Elimina
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

StaffSupport.getLayout = (page: React.ReactNode) => <StaffLayout>{page}</StaffLayout>;
StaffSupport.requireAuth = true;
export default StaffSupport;
