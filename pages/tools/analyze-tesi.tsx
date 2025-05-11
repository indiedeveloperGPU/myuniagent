import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import DashboardLayout from "@/components/DashboardLayout";
import { motion } from "framer-motion";

function TesiPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [fileUtente, setFileUtente] = useState<any[]>([]);
  const [fileSelezionato, setFileSelezionato] = useState<any | null>(null);
  const [richieste, setRichieste] = useState<any[]>([]);

  const fetchData = async () => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) return;

    const { data: files } = await supabase
      .from("uploaded_files")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    setFileUtente(files || []);

    const { data: richiesteFox } = await supabase
      .from("agente_fox")
      .select("*")
      .eq("user_id", userId)
      .eq("tipo", "tesi")
      .order("inviata_il", { ascending: false });

    setRichieste(richiesteFox || []);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    setMessage("");
    setError("");
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append("file", selectedFile);

    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const res = await fetch("/api/upload-tesi", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessage("✅ Upload completato!");
      setSelectedFile(null);
      await fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inviaRichiesta = async (tipo: string) => {
    if (!fileSelezionato) {
      setError("Seleziona un file prima di inviare la richiesta");
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) return;

    const originalname = fileSelezionato.originalname;
    const filePath = `${userId}/${originalname}`;
    const { data: publicData } = supabase.storage.from("tesi").getPublicUrl(filePath);

    if (!publicData?.publicUrl) {
      setError("Errore nel recuperare il file dal server");
      return;
    }

    await supabase.from("agente_fox").insert({
      user_id: userId,
      domanda: `Richiesta analisi ${tipo} per la tesi ${originalname}`,
      tipo: "tesi",
      analisi_tipo: tipo,
      stato: "in_attesa",
      inviata_il: new Date().toISOString(),
      allegati: publicData.publicUrl,
    });

    setMessage("✅ Richiesta inviata");
    await fetchData();
  };

  const handleDownloadPDF = async (contenuto: string, tipo: string) => {
    const html2pdf = (await import("html2pdf.js")).default;
    const element = document.createElement("div");
    element.innerText = contenuto;
    html2pdf().from(element).save(`analisi-${tipo}.pdf`);
  };

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-5xl mx-auto px-4 pt-10 space-y-10"
      >
        <div className="space-y-1">
          <p className="text-sm text-gray-500 dark:text-gray-400">Area personale / Analisi tesi</p>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">📊 Analisi Tesi</h1>
        </div>

        {/* Caricamento */}
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Scegli file
          </label>
          <section className="bg-gray-50 dark:bg-gray-800 p-6 rounded-xl shadow space-y-4">
  <h2 className="text-xl font-semibold text-blue-800 dark:text-blue-300">📤 Carica una nuova tesi</h2>

  <input
    type="file"
    onChange={handleFileChange}
    className="block w-full text-sm text-gray-900 dark:text-gray-100 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
  />

  {selectedFile && (
    <p className="text-sm text-gray-600 dark:text-gray-300">📎 {selectedFile.name}</p>
  )}

  <button
    onClick={handleUpload}
    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow"
  >
    {loading ? "Caricamento..." : "Carica"}
  </button>
</section>

        </div>

        {/* Selezione file */}
        <div className="space-y-2">
          <label className="block font-medium text-gray-800 dark:text-gray-200">
            Seleziona una tesi già caricata:
          </label>
          <select
            className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700"
            value={fileSelezionato?.id || ""}
            onChange={(e) => {
              const file = fileUtente.find((f) => f.id === e.target.value);
              setFileSelezionato(file || null);
            }}
          >
            <option value="">-- Seleziona un file --</option>
            {fileUtente.map((f) => (
              <option key={f.id} value={f.id}>
                {f.originalname}
              </option>
            ))}
          </select>
        </div>

        {/* Analisi richieste */}
        <section className="bg-gray-50 dark:bg-gray-800 p-6 rounded-xl shadow space-y-4">

  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    <button onClick={() => inviaRichiesta("generale")} className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded shadow text-left">
      🔍 Richiedi analisi generale
    </button>
    <button onClick={() => inviaRichiesta("struttura")} className="bg-violet-600 hover:bg-violet-700 text-white py-2 px-4 rounded shadow text-left">
      🧱 Richiedi analisi struttura
    </button>
    <button onClick={() => inviaRichiesta("metodologia")} className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded shadow text-left">
      🧠 Richiedi analisi metodologia
    </button>
    <button onClick={() => inviaRichiesta("linguaggio")} className="bg-yellow-500 hover:bg-yellow-600 text-white py-2 px-4 rounded shadow text-left">
      ✏️ Richiedi analisi linguaggio
    </button>
    <button onClick={() => inviaRichiesta("bibliografia")} className="bg-orange-600 hover:bg-orange-700 text-white py-2 px-4 rounded shadow text-left">
      📖 Richiedi analisi bibliografia
    </button>
    <button onClick={() => inviaRichiesta("plagio")} className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded shadow text-left">
      🧬 Richiedi analisi plagio
    </button>
    <button
      title="Analisi approfondita di tutti gli aspetti. Richiede più tempo."
      onClick={() => inviaRichiesta("completa")}
      className="bg-black hover:bg-gray-800 text-white py-2 px-4 rounded shadow col-span-full text-left"
    >
      🧾 Richiedi analisi completa
    </button>
  </div>
</section>

        {/* Messaggi */}
        {message && <p className="text-green-600 dark:text-green-400">{message}</p>}
        {error && <p className="text-red-600 dark:text-red-400">{error}</p>}

        {/* Storico */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">📜 Storico richieste</h2>
          {richieste.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">Nessuna richiesta ancora inviata.</p>
          ) : (
            <ul className="space-y-4">
              {richieste.map((r) => (
                <li key={r.id} className="border border-gray-300 dark:border-gray-700 rounded-xl p-4 bg-white dark:bg-gray-900 shadow">
                  <p className="text-sm text-gray-600 dark:text-gray-300">🕒 {new Date(r.inviata_il).toLocaleString("it-IT")}</p>
                  <p className="font-medium text-gray-900 dark:text-white">📄 {r.domanda}</p>
                  <span className={`inline-block mt-2 px-2 py-1 text-xs font-semibold rounded-full ${
  r.stato === "evasa"
    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
    : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
}`}>
  Stato: {r.stato}
</span>
                  {r.risposta && (
                    <>
                      <div className="mt-2 whitespace-pre-wrap border-t pt-2 border-gray-200 dark:border-gray-600 text-sm">
                        🧾 {r.risposta}
                      </div>
                      <button
                        onClick={() => handleDownloadPDF(r.risposta, r.tipo || "tesi")}
                        className="mt-2 bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg shadow"
                      >
                        ⬇️ Scarica PDF
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </motion.div>
    </DashboardLayout>
  );
}

TesiPage.requireAuth = true;
export default TesiPage;




