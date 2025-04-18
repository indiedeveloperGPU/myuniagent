import DocenteLayout from "@/components/DocenteLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { v4 as uuidv4 } from "uuid";
import Link from "next/link";

 function LezioniDocentePage() {
  const [lezioni, setLezioni] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [titolo, setTitolo] = useState("");
  const [contenuto, setContenuto] = useState("");
  const [generataAI, setGenerataAI] = useState(false);

  const fetchLezioni = async () => {
    setLoading(true);
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (!user || userError) {
      console.error("Utente non autenticato o errore:", userError);
      return;
    }

    const { data, error } = await supabase
      .from("lezioni")
      .select("*")
      .eq("user_id", user.id)
      .order("data_creazione", { ascending: false });

    if (!error) setLezioni(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchLezioni();
  }, []);

  const handleGeneraConAI = async () => {
    if (!titolo) {
      alert("Inserisci un titolo prima di generare la lezione.");
      return;
    }

    const response = await fetch("/api/generaLezione", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titolo }),
    });

    const data = await response.json();

    if (data?.contenuto) {
      setContenuto(data.contenuto);
      setGenerataAI(true);
    } else {
      alert("Errore nella generazione AI.");
    }
  };

  const handleCreaLezione = async () => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (!user || userError) {
      console.error("Utente non autenticato o errore:", userError);
      return;
    }

    const { error } = await supabase.from("lezioni").insert([
      {
        id: uuidv4(),
        user_id: user.id,
        titolo,
        contenuto,
        generata_da_ai: generataAI,
        stato: "bozza",
      },
    ]);

    if (!error) {
      setModalOpen(false);
      setTitolo("");
      setContenuto("");
      setGenerataAI(false);
      fetchLezioni();
    }
  };

  const handleEliminaLezione = async (id: string) => {
    await supabase.from("lezioni").delete().eq("id", id);
    fetchLezioni();
  };

  return (
    <DocenteLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">📚 Lezioni</h1>
        <button
          onClick={() => setModalOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          + Nuova Lezione
        </button>
      </div>

      {loading ? (
        <p>Caricamento...</p>
      ) : lezioni.length === 0 ? (
        <p>Nessuna lezione trovata.</p>
      ) : (
        <div className="space-y-4">
          {lezioni.map((lezione) => (
            <div
              key={lezione.id}
              className="border rounded p-4 bg-white shadow flex justify-between items-start"
            >
              <Link href={`/docente/lezioni/${lezione.id}`} className="flex-1">
                <div className="cursor-pointer">
                  <h2 className="text-lg font-semibold hover:underline">
                    {lezione.titolo}
                  </h2>
                  <p className="text-gray-600 text-sm mb-1">
                    Stato: <strong>{lezione.stato}</strong> |{" "}
                    {lezione.generata_da_ai ? "🧠 AI" : "✍️ Manuale"}
                  </p>
                  <p className="text-gray-700 text-sm line-clamp-2">
                    {lezione.contenuto?.slice(0, 100)}...
                  </p>
                </div>
              </Link>
              <div className="flex gap-2 ml-4">
                <button
                  onClick={() => handleEliminaLezione(lezione.id)}
                  className="text-red-600 hover:underline text-sm"
                >
                  Elimina
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL CREAZIONE */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-lg shadow-lg">
            <h2 className="text-xl font-semibold mb-4">Nuova Lezione</h2>

            <input
              type="text"
              placeholder="Titolo della lezione"
              className="w-full border rounded px-3 py-2 mb-3"
              value={titolo}
              onChange={(e) => setTitolo(e.target.value)}
            />

            <button
              onClick={handleGeneraConAI}
              className="mb-3 px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              🧠 Genera con AI
            </button>

            <textarea
              placeholder="Contenuto della lezione"
              className="w-full border rounded px-3 py-2 mb-3"
              rows={6}
              value={contenuto}
              onChange={(e) => setContenuto(e.target.value)}
            />

            <label className="inline-flex items-center mb-4">
              <input
                type="checkbox"
                checked={generataAI}
                onChange={(e) => setGenerataAI(e.target.checked)}
                className="mr-2"
              />
              Questa lezione è stata generata con l'AI
            </label>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Annulla
              </button>
              <button
                onClick={handleCreaLezione}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Salva
              </button>
            </div>
          </div>
        </div>
      )}
    </DocenteLayout>
  );
}

import { withAccess } from "@/lib/withRole";
export default withAccess(LezioniDocentePage, ["docente"]);

