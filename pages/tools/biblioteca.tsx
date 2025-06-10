import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/router";

export default function BibliotecaPage() {
  const [sezioneAttiva, setSezioneAttiva] = useState<"biblioteca" | "spiegazioni">("biblioteca");
  const [query, setQuery] = useState("");
  const [filtroFacolta, setFiltroFacolta] = useState("");
  const [filtroArgomento, setFiltroArgomento] = useState("");
  const [categoria, setCategoria] = useState("articoli");

  const handleCerca = () => {
    console.log("Categoria:", categoria);
    console.log("Query:", query);
    console.log("Facoltà:", filtroFacolta);
    console.log("Argomento:", filtroArgomento);
  };

  return (
    <DashboardLayout>
      {/* Tab Switch */}
      <div className="mb-6">
        <div className="flex gap-4 mb-2">
          <button
            className={`px-4 py-2 rounded-t-md border-b-2 transition ${
              sezioneAttiva === "biblioteca"
                ? "border-blue-600 text-blue-600 font-semibold"
                : "border-transparent text-gray-500 hover:text-blue-600"
            }`}
            onClick={() => setSezioneAttiva("biblioteca")}
          >
            📚 Biblioteca
          </button>
          <button
            className={`px-4 py-2 rounded-t-md border-b-2 transition ${
              sezioneAttiva === "spiegazioni"
                ? "border-blue-600 text-blue-600 font-semibold"
                : "border-transparent text-gray-500 hover:text-blue-600"
            }`}
            onClick={() => setSezioneAttiva("spiegazioni")}
          >
            💬 Spiegazioni salvate
          </button>
        </div>
      </div>

      {/* Contenuto condizionato */}
      {sezioneAttiva === "biblioteca" ? (
        <>
          <div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded p-4 shadow mb-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100">🔍 Ricerca avanzata</h2>

            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700"
              >
                <option value="articoli">📄 Articoli scientifici</option>
                <option value="appunti">📝 Appunti e materiali</option>
                <option value="mappe">🧠 Mappe concettuali</option>
              </select>

              <input
                type="text"
                placeholder="Cerca per parole chiave..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700"
              />

              <input
                type="text"
                placeholder="Facoltà (opzionale)"
                value={filtroFacolta}
                onChange={(e) => setFiltroFacolta(e.target.value)}
                className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700"
              />

              <input
                type="text"
                placeholder="Argomento (opzionale)"
                value={filtroArgomento}
                onChange={(e) => setFiltroArgomento(e.target.value)}
                className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700"
              />
            </div>

            <button
              onClick={handleCerca}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-transform transform hover:-translate-y-1 hover:shadow-lg transition"
            >
              🔍 Cerca contenuti
            </button>
          </div>

          <div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded p-4 shadow">
            <h2 className="text-lg font-semibold mb-3">📂 Risultati</h2>
            <p className="text-gray-500 dark:text-gray-300">Nessun risultato ancora. Inserisci una query e premi "Cerca".</p>
          </div>
        </>
      ) : (
        <SpiegazioniSalvate />
      )}
    </DashboardLayout>
  );
}

BibliotecaPage.requireAuth = true;

// COMPONENTE aggiuntivo
function SpiegazioniSalvate() {
  const [spiegazioni, setSpiegazioni] = useState<
    { titolo: string; creata_il: string; ultima_modifica: string }[]
  >([]);
  const router = useRouter();

  useEffect(() => {
    const caricaSpiegazioni = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) return;

      const { data, error } = await supabase
        .from("chat_spiegazioni")
        .select("titolo, creata_il, ultima_modifica")
        .eq("user_id", user.id)
        .order("ultima_modifica", { ascending: false });

      if (data) {
        setSpiegazioni(
          data.map((s) => ({
            titolo: s.titolo,
            creata_il: new Date(s.creata_il).toLocaleDateString(),
            ultima_modifica: new Date(s.ultima_modifica).toLocaleString(),
          }))
        );
      } else {
        console.error("Errore nel caricamento spiegazioni:", error);
      }
    };

    caricaSpiegazioni();
  }, []);

  return (
    <div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded p-4 shadow">
      <h2 className="text-lg font-semibold mb-3">💬 Le tue spiegazioni salvate</h2>

      {spiegazioni.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-300">
          Nessuna spiegazione salvata ancora.
        </p>
      ) : (
        <div className="space-y-4">
          {spiegazioni.map((s, i) => (
            <div
              key={i}
              className="p-4 border border-gray-300 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800 shadow-sm flex justify-between items-center"
            >
              <div>
                <div className="text-blue-700 dark:text-blue-300 font-medium">{s.titolo}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Creata il: {s.creata_il} • Ultima modifica: {s.ultima_modifica}
                </div>
              </div>
              <button
                className="text-sm text-white bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded transition"
                onClick={() =>
                  router.push(`/spiegazione?concetto=${encodeURIComponent(s.titolo)}`)
                }
              >
                ↩️ Riprendi
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
