import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/lib/supabaseClient";
import { saveAs } from "file-saver";
import { Document, Packer, Paragraph, TextRun } from "docx";

const MAX_CHARS = 3500;

export default function RiassuntoPage() {
  const [text, setText] = useState("");
  const [results, setResults] = useState<string[]>([]);
  const [loadingBlocks, setLoadingBlocks] = useState<boolean[]>([]);
  const [error, setError] = useState("");
  const [userChecked, setUserChecked] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        window.location.href = "/auth";
        return;
      }
      setUserChecked(true);
    };
    checkUser();
  }, []);

  const splitTextIntoBlocks = (input: string): string[] => {
    const chunks: string[] = [];
    for (let i = 0; i < input.length; i += MAX_CHARS) {
      chunks.push(input.slice(i, i + MAX_CHARS));
    }
    return chunks;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setResults([]);
    setLoadingBlocks([]);
  
    const blocks = splitTextIntoBlocks(text);
    const tempResults = Array(blocks.length).fill("");
    const tempLoading = Array(blocks.length).fill(true);
    setLoadingBlocks(tempLoading);
  
    // ✅ Recupera il token utente
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
  
    if (!accessToken) {
      setError("Utente non autenticato. Effettua il login.");
      return;
    }
  
    for (let i = 0; i < blocks.length; i++) {
      try {
        const res = await fetch("/api/riassunto", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ testo: blocks[i] }),
        });
  
        const data = await res.json();
  
        if (!res.ok) throw new Error(data.error || "Errore nella generazione del riassunto.");
  
        tempResults[i] = data.riassunto;
      } catch (err: any) {
        tempResults[i] = `❌ Errore nel blocco ${i + 1}: ${err.message}`;
      } finally {
        tempLoading[i] = false;
        setResults([...tempResults]);
        setLoadingBlocks([...tempLoading]);
      }
    }
  };
  

  const handleSubmitManual = async (manualText: string, accessToken: string) => {
    setError("");
    setResults([]);
    setLoadingBlocks([]);
  
    const blocks = splitTextIntoBlocks(manualText);
    const tempResults = Array(blocks.length).fill("");
    const tempLoading = Array(blocks.length).fill(true);
    setLoadingBlocks(tempLoading);
  
    for (let i = 0; i < blocks.length; i++) {
      try {
        const res = await fetch("/api/riassunto", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ testo: blocks[i] }),
        });
  
        const data = await res.json();
  
        if (!res.ok) throw new Error(data.error || "Errore nella generazione del riassunto.");
  
        tempResults[i] = data.riassunto;
      } catch (err: any) {
        tempResults[i] = `❌ Errore nel blocco ${i + 1}: ${err.message}`;
      } finally {
        tempLoading[i] = false;
        setResults([...tempResults]);
        setLoadingBlocks([...tempLoading]);
      }
    }
  };
  

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
  
    setError("");
    setText("");
    setResults([]);
    setLoadingBlocks([]);
  
    let fullText = "";
  
    for (let i = 0; i < files.length; i++) {
      const formData = new FormData();
      formData.append("file", files[i]);
  
      try {
        const response = await fetch("/api/estrai-testo", {
          method: "POST",
          body: formData,
        });
  
        const data = await response.json();
  
        if (!response.ok) throw new Error(data.error || "Errore nell'estrazione del testo");
  
        if (data.testo) {
          fullText += data.testo.trim() + "\n\n";
        }
      } catch (err: any) {
        setError(`Errore nel file ${files[i].name}: ${err.message}`);
        return;
      }
    }
  
    // Imposta il testo unificato
    setText(fullText.trim());
  
    // Recupera il token prima di chiamare handleSubmit
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
  
    if (!accessToken) {
      setError("Utente non autenticato. Effettua il login.");
      return;
    }
  
    // Richiama manualmente handleSubmit con accessToken
    await handleSubmitManual(fullText.trim(), accessToken);
  };
  
  
  

  const handleExport = async () => {
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: results.map((text, index) => [
            new Paragraph({
              children: [
                new TextRun({
                  text: `🧩 Blocco ${index + 1}`,
                  bold: true,
                  size: 28,
                }),
              ],
            }),
            new Paragraph({ text: text, spacing: { after: 300 } }),
          ]).flat(),
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, "Riassunto_MyUniAgent.docx");
  };

  if (!userChecked) return <DashboardLayout><p>Caricamento...</p></DashboardLayout>;

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold mb-4">🧠 Riassunto</h1>

      <div className="bg-blue-50 border-l-4 border-blue-500 text-blue-900 p-4 rounded mb-6">
        <h2 className="font-semibold text-lg mb-1">ℹ️ Come funziona il riassunto</h2>
        <p className="text-sm mb-2">
          Questo strumento genera <strong>riassunti dettagliati e professionali</strong> partendo da un testo che inserisci.
          Per garantire la qualità delle risposte, puoi inserire un massimo di <strong>3500 caratteri</strong> per volta.
        </p>
        <p className="text-sm mb-2">
          ✂️ Se il tuo testo è molto lungo (ad esempio un intero capitolo), ti consigliamo di <strong>suddividerlo in più parti</strong>.
        </p>
        <p className="text-sm mb-2">
          📌 Migliori risultati con testi <strong>strutturati</strong> (paragrafi completi, frasi chiare).
        </p>
        <p className="text-sm mb-2">
          🎯 Ideale per: <span className="italic">appunti, articoli, dispense, paragrafi di tesi, riassunti pre-esame</span>.
        </p>
        <div className="bg-white border border-blue-200 p-3 mt-3 rounded text-sm">
          <p className="font-medium mb-1">📖 Esempio consigliato:</p>
          <p className="mb-1">✅ Testo chiaro e coerente:</p>
          <p className="text-gray-700 italic">"Il concetto di inflazione rappresenta l’aumento generale dei prezzi in un’economia..."</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          className="w-full p-2 border rounded"
          rows={8}
          placeholder="Incolla il testo da riassumere..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="text-sm text-right text-gray-600">
          {text.length} caratteri
        </div>

        <button
          type="submit"
          disabled={!text}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          Riassumi
        </button>
      </form>

      <div className="mt-10">
        <h2 className="text-lg font-semibold mb-2">📂 Oppure carica un file (PDF, DOCX, TXT, Immagine)</h2>
        <input
  type="file"
  multiple
  accept=".pdf,.docx,.txt,.png,.jpg,.jpeg"
  onChange={handleFileUpload}
  className="mt-2"
/>

      </div>

      {error && <p className="text-red-600 mt-4 font-medium">{error}</p>}

      {results.length > 0 && (
        <div className="mt-6 space-y-6">
          {results.map((r, i) => (
            <div key={i} className="bg-gray-100 p-4 rounded whitespace-pre-wrap border-l-4 border-blue-400">
              <h2 className="font-semibold mb-1">🧩 Blocco {i + 1}</h2>
              {loadingBlocks[i] ? (
                <p className="italic text-gray-600">Generazione in corso...</p>
              ) : (
                <p>{r}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {results.length > 0 && !loadingBlocks.includes(true) && (
        <div className="mt-6">
          <button
            onClick={handleExport}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            📥 Esporta in DOCX
          </button>
        </div>
      )}
    </DashboardLayout>
  );
}

