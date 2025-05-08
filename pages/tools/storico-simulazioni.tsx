import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import DashboardLayout from "@/components/DashboardLayout";
import { Dialog } from "@headlessui/react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import Link from "next/link";

export default function StoricoSimulazioniPage() {
  const [storico, setStorico] = useState<any[]>([]);
  const [filtrato, setFiltrato] = useState<any[]>([]);
  const [selectedSimulazione, setSelectedSimulazione] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [errore, setErrore] = useState("");

  // Filtri
  const [filtroMateria, setFiltroMateria] = useState<string>("");
  const [categoriaAttiva, setCategoriaAttiva] = useState<string>(""); // "" = tutte
  const [filtroVotoMinimo, setFiltroVotoMinimo] = useState<number>(0);
  const [filtroData, setFiltroData] = useState<string>("");

  useEffect(() => {
    const fetchUserAndStorico = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        window.location.href = "/auth";
        return;
      }
      setUser(data.user);
  
      setLoading(true);
      try {
        const [superioriRes, universitaRes] = await Promise.all([
          supabase
            .from("simulazioni_scritti_risposte_superiori")
            .select("*")
            .eq("user_id", data.user.id),
          supabase
            .from("simulazioni_scritti_risposte_universita")
            .select("*")
            .eq("user_id", data.user.id)
        ]);
  
        if (superioriRes.error || universitaRes.error)
          throw new Error(superioriRes.error?.message || universitaRes.error?.message);
  
        const tutte = [...(superioriRes.data || []), ...(universitaRes.data || [])]
          .sort((a, b) => new Date(b.creato_il || b.completata_il).getTime() - new Date(a.creato_il || a.completata_il).getTime());
  
        setStorico(tutte);
        setFiltrato(tutte);
      } catch (err: any) {
        setErrore(err.message || "Errore durante il caricamento dello storico.");
      } finally {
        setLoading(false);
      }
    };
  
    fetchUserAndStorico();
  }, []);
  

  useEffect(() => {
    let filtrato = [...storico];
    if (filtroMateria) filtrato = filtrato.filter(sim => sim.materia === filtroMateria);
    if (categoriaAttiva) filtrato = filtrato.filter(sim => sim.categoria === categoriaAttiva);
    if (filtroVotoMinimo) filtrato = filtrato.filter(sim => sim.voto >= filtroVotoMinimo);
    if (filtroData) filtrato = filtrato.filter(sim => new Date(sim.completata_il || sim.creato_il) >= new Date(filtroData));
    setFiltrato(filtrato);
  }, [filtroMateria, categoriaAttiva, filtroVotoMinimo, filtroData, storico]);
  

  const materieDisponibili = [...new Set(storico.map(sim => sim.materia))];

  const mediaVoti = filtrato.length ? (filtrato.reduce((acc, sim) => acc + sim.voto, 0) / filtrato.length).toFixed(2) : 0;

  if (!user) return <DashboardLayout><p>Caricamento...</p></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">📚 Le mie simulazioni svolte</h1>
        <Link href="/tools/simulazioni-scritte" className="text-blue-600 hover:underline font-medium">
          ➡️ Vai a Nuova Simulazione
        </Link>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-4 rounded-2xl shadow-sm mb-6 text-gray-700 dark:text-gray-100 text-sm animate-fadein">
  <div className="flex items-center gap-2">
    <span className="text-blue-500 text-lg">ℹ️</span>
    <p><strong>Info:</strong> Qui puoi consultare tutte le simulazioni che hai completato. Usa i filtri per analizzare i tuoi progressi e i grafici per visualizzare l'andamento dei voti.</p>
  </div>
</div>


      {/* Statistiche */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg p-4 shadow text-center border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500">Media Voto</p>
          <p className="text-2xl font-bold">{mediaVoti}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg p-4 shadow text-center border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500">Numero Simulazioni</p>
          <p className="text-2xl font-bold">{filtrato.length}</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow">
          <ResponsiveContainer width="100%" height={100}>
            <LineChart data={filtrato}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="completata_il" tickFormatter={(dateStr) => new Date(dateStr).toLocaleDateString()} />
              <YAxis domain={[0, 30]} />
              <Tooltip labelFormatter={(dateStr) => new Date(dateStr).toLocaleString()} />
              <Line type="monotone" dataKey="voto" stroke="#2563eb" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Filtri */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div>
          <label className="text-sm font-medium">Materia</label>
          <select value={filtroMateria} onChange={(e) => setFiltroMateria(e.target.value)} className="w-full border rounded p-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600">
            <option value="">Tutte</option>
            {materieDisponibili.map((mat) => (
              <option key={mat} value={mat}>{mat}</option>
            ))}
          </select>
        </div>
        <div>
  <label className="text-sm font-medium block mb-1">Categoria</label>
  <div className="flex gap-2">
    <button
      onClick={() => setCategoriaAttiva("")}className={`px-3 py-1 rounded border ${categoriaAttiva === "" ? "bg-blue-600 text-white": "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-100 border-gray-300 dark:border-gray-600"}`}>
      Tutte
    </button>
    <button
      onClick={() => setCategoriaAttiva("superiori")}className={`px-3 py-1 rounded border ${categoriaAttiva === "superiori" ? "bg-blue-600 text-white": "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-100 border-gray-300 dark:border-gray-600"}`}>
      Superiori
    </button>
    <button
      onClick={() => setCategoriaAttiva("università")}className={`px-3 py-1 rounded border ${categoriaAttiva === "università"? "bg-blue-600 text-white": "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-100 border-gray-300 dark:border-gray-600"}`}>
      Università
    </button>
  </div>
</div>

        <div>
          <label className="text-sm font-medium">Voto minimo</label>
          <input type="number" value={filtroVotoMinimo} onChange={(e) => setFiltroVotoMinimo(Number(e.target.value))} className="w-full border rounded p-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600" />
        </div>
        <div>
          <label className="text-sm font-medium">Data minima</label>
          <input type="date"value={filtroData}onChange={(e) => setFiltroData(e.target.value)}className="w-full border rounded p-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"/>
        </div>
      </div>

      {/* Tabella */}
      {errore && <p className="text-red-600">{errore}</p>}

      {loading ? (
        <p>Caricamento dati...</p>
      ) : filtrato.length === 0 ? (
        <p>Non hai ancora svolto simulazioni.</p>
      ) : (
        <div className="overflow-x-auto bg-white dark:bg-gray-900 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm text-gray-700 dark:text-gray-100">
          <thead className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100">
              <tr>
                <th className="p-3 text-left">Materia</th>
                <th className="p-3 text-left">Argomento</th>
                <th className="p-3 text-left">Tipo</th>
                <th className="p-3 text-left">Categoria</th>
                <th className="p-3 text-left">Voto</th>
                <th className="p-3 text-left">Data</th>
              </tr>
            </thead>
            <tbody>
              {filtrato.map((sim) => (
                <tr
                  key={sim.id}
                  className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer text-gray-800 dark:text-gray-100"
                  onClick={() => setSelectedSimulazione(sim)}
                >
                  <td className="p-3">{sim.materia}</td>
                  <td className="p-3">{sim.argomento}</td>
                  <td className="p-3">{sim.tipo}</td>
                  <td className="p-3">{sim.categoria}</td>
                  <td className="p-3">
                    {sim.voto}
                    {sim.lode && (
                      <span className="ml-2 bg-yellow-400 text-white px-2 py-0.5 rounded-full text-xs">Lode</span>
                    )}
                  </td>
                  <td className="p-3">{new Date(sim.completata_il).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modale dettagli */}
      <Dialog open={!!selectedSimulazione} onClose={() => setSelectedSimulazione(null)} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
          <button
  onClick={() => setSelectedSimulazione(null)}
  className="absolute top-3 right-4 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white text-2xl"
>
  &times;
</button>

            <Dialog.Title className="text-lg font-bold">Dettaglio Simulazione</Dialog.Title>
            {selectedSimulazione && (
              <>
                <div className="text-sm">
                  <p><strong>Materia:</strong> {selectedSimulazione.materia}</p>
                  <p><strong>Argomento:</strong> {selectedSimulazione.argomento}</p>
                  <p><strong>Categoria:</strong> {selectedSimulazione.categoria}</p>
                  <p><strong>Tipo:</strong> {selectedSimulazione.tipo}</p>
                  <p><strong>Voto:</strong> {selectedSimulazione.voto} {selectedSimulazione.lode ? "(Lode)" : ""}</p>
                  <p><strong>Data:</strong> {new Date(selectedSimulazione.completata_il).toLocaleDateString()}</p>
                </div>

                <div className="mt-4">
                  <h3 className="font-semibold mb-2">📝 Simulazione:</h3>
                  <p className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-3 rounded whitespace-pre-line">{selectedSimulazione.simulazione_id}</p>
                </div>

                <div className="mt-4">
  <h3 className="font-semibold mb-2">✍️ Risposte date:</h3>
  <div className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-3 rounded space-y-2">
    {(() => {
      try {
        const parsed = JSON.parse(selectedSimulazione.risposte_utente);
if (typeof parsed === "object" && parsed !== null) {
  return Object.keys(parsed)
    .sort((a, b) => Number(a) - Number(b)) // ordine numerico
    .map((key) => (
      <p key={key}>
        <b>{Number(key) + 1}.</b> {parsed[key]}
      </p>
    ));
}

        return <p className="whitespace-pre-line">{selectedSimulazione.risposte_utente}</p>;
      } catch (e) {
        return <p className="whitespace-pre-line">{selectedSimulazione.risposte_utente}</p>;
      }
    })()}
  </div>
</div>


                <div className="mt-4">
                  <h3 className="font-semibold mb-2">✅ Soluzione ideale:</h3>
                  <div className="bg-green-100 dark:bg-green-900/30 text-gray-900 dark:text-gray-100 p-3 rounded space-y-2">
  {Array.isArray(selectedSimulazione.correzione) ? (
    selectedSimulazione.correzione.map((item: any, index: number) => (
      <p key={index} className="whitespace-pre-line">
        <b>{index + 1}.</b> {item.soluzione}
      </p>
    ))
  ) : (
    <p className="whitespace-pre-line">{selectedSimulazione.correzione}</p> // fallback in caso vecchie risposte TEXT
  )}
</div>

                </div>

                <button
                  onClick={() => setSelectedSimulazione(null)}
                  className="mt-6 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full"
                >
                  Chiudi
                </button>
              </>
            )}
          </Dialog.Panel>
        </div>
      </Dialog>
    </DashboardLayout>
  );
}

StoricoSimulazioniPage.requireAuth = true;

