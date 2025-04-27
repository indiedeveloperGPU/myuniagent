import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import DashboardLayout from "@/components/DashboardLayout";

function TesiPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [fileUtente, setFileUtente] = useState<any[]>([]);
  const [fileSelezionato, setFileSelezionato] = useState<string>("");
  const [richieste, setRichieste] = useState<any[]>([]);

  // ✅ Recupera file caricati e richieste
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

  // ✅ Upload file
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    setMessage("");
    setError("");
    setPreview("");

    if (file?.type === "text/plain") {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview((e.target?.result as string)?.slice(0, 1000));
      };
      reader.readAsText(file);
    }
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

      setMessage("Upload completato ✅");
      setSelectedFile(null);
      setPreview("");
      await fetchData(); // 🔄 aggiorna lista file dopo l'upload
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Richiesta analisi
 const inviaRichiesta = async (tipo: string) => {
  if (!fileSelezionato) {
    setError("Seleziona un file prima di inviare la richiesta");
    return;
  }

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) return;

  // ✅ Crea il percorso del file con solo userId e filename
  const filePath = `${userId}/${fileSelezionato}`; // Usa solo l'ID dell'utente come prefisso

  // ✅ Recupera l'URL pubblico del file nel bucket "tesi"
  const { data: publicData } = supabase
    .storage
    .from('tesi')
    .getPublicUrl(filePath);

  // ✅ Verifica se l'URL è stato generato correttamente
  if (!publicData || !publicData.publicUrl) {
    setError("Errore nel recuperare il file dal server");
    return;
  }

  // ✅ Ora salva l'URL vero dentro agente_fox
  await supabase.from("agente_fox").insert({
    user_id: userId,
    domanda: `Richiesta analisi ${tipo} per la tesi ${fileSelezionato}`,
    tipo: "tesi",
    analisi_tipo: tipo,
    stato: "in_attesa",
    inviata_il: new Date().toISOString(),
    allegati: publicData.publicUrl, // 🔥 Salva l'URL corretto qui
  });

  setMessage("Richiesta inviata ✅");
  await fetchData(); // aggiorna lo storico
};

  
  
  

  // ✅ Scarica PDF
  const handleDownloadPDF = async (contenuto: string, tipo: string) => {
    const html2pdf = (await import("html2pdf.js")).default;
    const element = document.createElement("div");
    element.innerText = contenuto;
    html2pdf().from(element).save(`analisi-${tipo}.pdf`);
  };

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold mb-6">📄 Analisi Tesi</h1>

      <input type="file" onChange={handleFileChange} className="mb-2" />
      {selectedFile && <p className="text-sm text-gray-600 mb-2">File: {selectedFile.name}</p>}
      <button onClick={handleUpload} className="bg-blue-600 text-white px-4 py-2 rounded mb-6">
        {loading ? "Caricamento..." : "Carica"}
      </button>

      <div className="mb-4">
        <label className="block font-medium mb-2">Seleziona una tesi già caricata:</label>
        <select
          className="w-full border rounded p-2"
          value={fileSelezionato}
          onChange={(e) => setFileSelezionato(e.target.value)}
        >
          <option value="">-- Seleziona un file --</option>
          {fileUtente.map((f) => (
            <option key={f.id} value={f.filename}>{f.filename}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <button onClick={() => inviaRichiesta("generale")} className="bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700">
          🔍 Richiedi analisi generale
        </button>
        <button onClick={() => inviaRichiesta("struttura")} className="bg-indigo-600 text-white py-2 px-4 rounded hover:bg-indigo-700">
          📚 Richiedi analisi struttura
        </button>
        <button onClick={() => inviaRichiesta("metodologia")} className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700">
          🧠 Richiedi analisi metodologia
        </button>
        <button onClick={() => inviaRichiesta("linguaggio")} className="bg-yellow-500 text-white py-2 px-4 rounded hover:bg-yellow-600">
          🖊️ Richiedi analisi linguaggio
        </button>
        <button onClick={() => inviaRichiesta("bibliografia")} className="bg-orange-600 text-white py-2 px-4 rounded hover:bg-orange-700">
          📖 Richiedi analisi bibliografia
        </button>
        <button onClick={() => inviaRichiesta("plagio")} className="bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700">
          🧬 Richiedi analisi plagio
        </button>
        <button onClick={() => inviaRichiesta("completa")} className="bg-black text-white py-2 px-4 rounded hover:bg-gray-800" title="Richiede più tempo, consigliata a fine tesi">
          🧾 Richiedi analisi completa
        </button>
      </div>

      {message && <p className="text-green-600 mb-4">{message}</p>}
      {error && <p className="text-red-600 mb-4">{error}</p>}

      <h2 className="text-xl font-semibold mb-2">📜 Storico richieste</h2>
      {richieste.length === 0 && <p className="text-gray-500">Nessuna richiesta ancora inviata.</p>}
      <ul className="space-y-4">
        {richieste.map((r) => (
          <li key={r.id} className="border rounded p-4 bg-gray-50">
            <p className="text-sm text-gray-600">🕒 {new Date(r.inviata_il).toLocaleString()}</p>
            <p className="font-medium">📄 {r.domanda}</p>
            <p className="text-sm text-blue-600">Stato: {r.stato}</p>
            {r.risposta && (
              <>
                <div className="mt-2 whitespace-pre-wrap border-t pt-2">🧾 {r.risposta}</div>
                <button
                  onClick={() => handleDownloadPDF(r.risposta, r.tipo || "tesi")}
                  className="mt-2 bg-green-600 text-white px-3 py-1 rounded"
                >
                  ⬇️ Scarica risposta in PDF
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
    </DashboardLayout>
  );
}

TesiPage.requireAuth = true;
export default TesiPage;



