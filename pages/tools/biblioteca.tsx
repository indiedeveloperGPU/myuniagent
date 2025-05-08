import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";

export default function BibliotecaPage() {
  const [categoria, setCategoria] = useState("articoli");
  const [query, setQuery] = useState("");
  const [filtroFacolta, setFiltroFacolta] = useState("");
  const [filtroArgomento, setFiltroArgomento] = useState("");

  const handleCerca = () => {
    // Qui implementerai la logica reale di ricerca con chiamate API/DB
    console.log("Categoria:", categoria);
    console.log("Query:", query);
    console.log("Facoltà:", filtroFacolta);
    console.log("Argomento:", filtroArgomento);
  };

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">📚 Biblioteca</h1>
      <p className="text-gray-700 dark:text-gray-300 mb-6">
        Cerca tra migliaia di contenuti accademici: articoli scientifici, appunti, mappe e materiali condivisi da altri studenti.
      </p>

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

      {/* Qui verranno visualizzati i risultati della ricerca */}
      <div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded p-4 shadow">
        <h2 className="text-lg font-semibold mb-3">📂 Risultati</h2>
        <p className="text-gray-500 dark:text-gray-300">Nessun risultato ancora. Inserisci una query e premi "Cerca".</p>
      </div>
    </DashboardLayout>
  );
}

BibliotecaPage.requireAuth = true;
