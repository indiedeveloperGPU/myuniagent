import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import StaffLayout from "@/components/StaffLayout";

interface Profile {
  id: string;
  email: string;
  ruolo: "studente" | "docente" | "staff";
  is_verified: boolean;
  abbonamento_attivo: boolean;
  abbonamento_scadenza?: string;
  ultimo_accesso?: string;
}

function GestioneUtenti() {
  const [utenti, setUtenti] = useState<Profile[]>([]);
  const [filtro, setFiltro] = useState<"tutti" | "studenti" | "docenti_approvati" | "docenti_attesa">("tutti");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [dropUpId, setDropUpId] = useState<string | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  const fetchUtenti = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("profiles").select("*");
    if (!error && data) setUtenti(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchUtenti();
  }, []);

  useEffect(() => {
    const handleClickOutside = () => setOpenDropdownId(null);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const handleToggleAbbonamento = async (id: string, attivo: boolean) => {
    const nuovaScadenza = !attivo ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null;
    await supabase
      .from("profiles")
      .update({
        abbonamento_attivo: !attivo,
        abbonamento_scadenza: nuovaScadenza,
      })
      .eq("id", id);
    fetchUtenti();
  };

  const handleBannaUtente = async (id: string) => {
    const conferma = confirm("Sei sicuro di voler bannare questo utente?");
    if (!conferma) return;
    await supabase.from("profiles").delete().eq("id", id);
    fetchUtenti();
  };

  const exportCsv = () => {
    const csv = [
      "Email,Ruolo,Verificato,Abbonamento,Scadenza,Ultimo Accesso",
      ...utentiFiltrati.map((u) =>
        `"${u.email}","${u.ruolo}","${u.is_verified ? "Sì" : "No"}","${
          u.abbonamento_attivo ? "Attivo" : "Non attivo"
        }","${u.abbonamento_scadenza || "-"}","${u.ultimo_accesso || "-"}"`
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "utenti.csv";
    a.click();
  };

  const utentiFiltrati = utenti.filter((u) => {
    const match = u.email.toLowerCase().includes(search.toLowerCase());
    if (filtro === "studenti") return u.ruolo === "studente" && match;
    if (filtro === "docenti_approvati") return u.ruolo === "docente" && u.is_verified && match;
    if (filtro === "docenti_attesa") return u.ruolo === "docente" && !u.is_verified && match;
    return match;
  });

  const giorniRimanenti = (scadenza?: string) => {
    if (!scadenza) return null;
    const ms = new Date(scadenza).getTime() - Date.now();
    return Math.max(Math.ceil(ms / (1000 * 60 * 60 * 24)), 0);
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">👥 Gestione Utenti</h1>

      <div className="flex flex-wrap gap-2 mb-4">
        {["tutti", "studenti", "docenti_approvati", "docenti_attesa"].map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f as any)}
            className={`px-4 py-2 rounded ${filtro === f ? "bg-blue-600 text-white" : "bg-gray-200"}`}
          >
            {f.replace("_", " ")}
          </button>
        ))}
        <button onClick={exportCsv} className="bg-gray-800 text-white px-3 py-2 rounded">
          ⬇️ Esporta CSV
        </button>
      </div>

      <input
        type="text"
        placeholder="Cerca per email..."
        className="border p-2 rounded w-full mb-6"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {loading ? (
        <p>Caricamento utenti...</p>
      ) : (
        <div className="overflow-x-auto rounded shadow">
          <table className="min-w-full text-sm text-gray-800">
            <thead className="bg-gray-100 text-xs uppercase tracking-wide text-gray-600">
              <tr>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="text-center">Ruolo</th>
                <th className="text-center">Verificato</th>
                <th className="text-center">Abbonamento</th>
                <th className="text-center">Scadenza</th>
                <th className="text-center">Ultimo accesso</th>
                <th className="text-center">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {utentiFiltrati.map((u, idx) => (
                <tr key={u.id} className={`${idx % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-blue-50`}>
                  <td className="px-4 py-3 align-middle">
  <div className="flex items-center gap-2">
    <span
      className={`w-2 h-2 rounded-full ${
        u.ultimo_accesso && Date.now() - new Date(u.ultimo_accesso).getTime() < 5 * 60 * 1000
          ? "bg-green-500"
          : "bg-gray-300"
      }`}
      title={
        u.ultimo_accesso
          ? `Ultimo accesso: ${new Date(u.ultimo_accesso).toLocaleString()}`
          : "Mai effettuato"
      }
    ></span>
    {u.email}
  </div>
</td>

                  <td className="text-center align-middle capitalize">{u.ruolo}</td>
                  <td className="text-center align-middle">{u.ruolo === "docente" ? (u.is_verified ? "✅" : "❌") : "—"}</td>
                  <td className="text-center align-middle">{u.abbonamento_attivo ? "✅" : "❌"}</td>
                  <td className="text-center align-middle">
                    {u.abbonamento_attivo && u.abbonamento_scadenza
                      ? `${giorniRimanenti(u.abbonamento_scadenza)} giorni`
                      : "—"}
                  </td>
                  <td className="text-center align-middle">
                    {u.ultimo_accesso ? new Date(u.ultimo_accesso).toLocaleString() : "—"}
                  </td>
                  <td className="text-center align-middle">
                    <div className="relative inline-block text-left">
                      <button
                        className="flex items-center gap-1 bg-white border border-gray-300 hover:border-gray-500 text-gray-700 px-3 py-1 rounded shadow-sm text-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          const rect = (e.target as HTMLElement).getBoundingClientRect();
                          const shouldDropUp = window.innerHeight - rect.bottom < 200;
                          setDropUpId(shouldDropUp ? u.id : null);
                          setOpenDropdownId(openDropdownId === u.id ? null : u.id);
                        }}
                      >
                        ⚙️ Azioni
                      </button>
                      <div
  className={`absolute ${
    dropUpId === u.id ? "bottom-10" : "top-full mt-2"
  } right-0 w-56 bg-white border border-gray-200 rounded shadow-md z-10 ${
    openDropdownId === u.id ? "" : "hidden"
  }`}
  onClick={(e) => e.stopPropagation()}
>

                        <button
                          onClick={() => handleToggleAbbonamento(u.id, u.abbonamento_attivo)}
                          className="block w-full text-left px-4 py-2 text-sm text-yellow-700 hover:bg-yellow-100"
                        >
                          🔁 {u.abbonamento_attivo ? "Disattiva" : "Attiva"} abbonamento
                        </button>
                        <button
                          onClick={() => handleBannaUtente(u.id)}
                          className="block w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-100"
                        >
                          🚫 Banna utente
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {utentiFiltrati.length === 0 && <p className="text-gray-500 p-4">Nessun utente trovato.</p>}
        </div>
      )}
    </div>
  );
}

GestioneUtenti.getLayout = function getLayout(page: React.ReactNode) {
  return <StaffLayout>{page}</StaffLayout>;
};

GestioneUtenti.requireAuth = true;
export default GestioneUtenti;

