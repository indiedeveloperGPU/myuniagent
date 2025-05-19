import { useEffect, useState, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/lib/supabaseClient";
import { saveAs } from "file-saver";
import { Document, Packer, Paragraph, TextRun } from "docx";

const MAX_CHARS = 3500;

export default function RiassuntoPage() {
  const [modalitaFox, setModalitaFox] = useState<boolean | null>(null);
  const [text, setText] = useState("");
  const [results, setResults] = useState<string[]>([]);
  const [loadingBlocks, setLoadingBlocks] = useState<boolean[]>([]);
  const [error, setError] = useState("");
  const [inviatoAFox, setInviatoAFox] = useState(false);
  const [fade, setFade] = useState(false);
  const [userChecked, setUserChecked] = useState(false);
  const [filePathFox, setFilePathFox] = useState<string | null>(null);
  const [allegatoFox, setAllegatoFox] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);


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

  useEffect(() => {
    if (!userChecked) return;
    const checkRisposteFox = async () => {
      const sessionResult = await supabase.auth.getSession();
      const accessToken = sessionResult.data.session?.access_token;
      const user = sessionResult.data.session?.user;
      if (!accessToken || !user?.id) {
        setError("⚠️ Sessione scaduta o utente non autenticato. Effettua di nuovo l’accesso.");
        return;
      }
      const { data, error } = await supabase
        .from("agente_fox")
        .select("id, stato")
        .eq("user_id", user.id)
        .eq("tipo", "riassunto")
        .eq("stato", "completato");
      if (error) return;
      if (data && data.length > 0) {
        alert("🦊 L'Agente Fox ha completato una tua richiesta di riassunto!");
      }
    };
    const interval = setInterval(() => {
      checkRisposteFox();
    }, 30000);
    return () => clearInterval(interval);
  }, [userChecked]);

  const splitTextIntoBlocks = (input: string): string[] => {
    const chunks: string[] = [];
    for (let i = 0; i < input.length; i += MAX_CHARS) {
      chunks.push(input.slice(i, i + MAX_CHARS));
    }
    return chunks;
  };

  const handleSubmitGPT = async () => {
  if (isSubmitting) return;           // blocca invii multipli
  setIsSubmitting(true);              // disattiva il pulsante

  setResults([]);
  setLoadingBlocks([]);
  const blocks = splitTextIntoBlocks(text.trim());
  const tempResults = Array(blocks.length).fill("");
  const tempLoading = Array(blocks.length).fill(true);
  setLoadingBlocks(tempLoading);

  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) {
    setError("Utente non autenticato.");
    setIsSubmitting(false);          // riattiva se fallisce
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
      if (!res.ok) throw new Error(data.error || "Errore nel riassunto.");
      tempResults[i] = data.riassunto;
    } catch (err: any) {
      tempResults[i] = `❌ Errore nel blocco ${i + 1}: ${err.message}`;
    } finally {
      tempLoading[i] = false;
      setResults([...tempResults]);
      setLoadingBlocks([...tempLoading]);
    }
  }

  setIsSubmitting(false);             // riattiva alla fine
};


  const inviaAFox = async () => {
    const sessionResult = await supabase.auth.getSession();
    const accessToken = sessionResult.data.session?.access_token;
    const user = sessionResult.data.session?.user;
    if (!accessToken || !user?.id) {
      setError("⚠️ Sessione scaduta o utente non autenticato. Effettua di nuovo l’accesso.");
      return;
    }
    const { error } = await supabase.from("agente_fox").insert({
      user_id: user.id,
      tipo: "riassunto",
      stato: "in_attesa",
      domanda: text || "",
      allegati: allegatoFox || null,
      inviata_il: new Date().toISOString(),
    });
    if (!error) {
      setInviatoAFox(true);
      setFade(true);
      setText("");
      setResults([]);
      setAllegatoFox(null);
      setTimeout(() => {
        setFade(false);
        setTimeout(() => setInviatoAFox(false), 500);
      }, 7500);
    } else {
      setError("❌ Errore durante l'invio ad Agente Fox.");
    }
  };

  const handleRemoveFile = async () => {
    if (!filePathFox) return;
    const { error } = await supabase.storage.from("uploads").remove([filePathFox]);
    if (error) {
      setError(`❌ Errore durante la rimozione del file: ${error.message}`);
      return;
    }
    setAllegatoFox(null);
    setFilePathFox(null);
    alert("✅ File eliminato correttamente.");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      setError("⚠️ Nessun file selezionato.");
      return;
    }
    if (files.length > 1) {
      alert("📎 Puoi inviare un solo file per volta. Per più documenti, invia più richieste separate.");
    }
    const file = files[0];
    if (!file) {
      setError("⚠️ File non valido.");
      return;
    }
    e.target.value = "";
    setError("");
    setResults([]);
    setLoadingBlocks([]);
    if (modalitaFox) {
      const sessionResult = await supabase.auth.getSession();
      const accessToken = sessionResult.data.session?.access_token;
      const user = sessionResult.data.session?.user;
      if (!accessToken || !user?.id) {
        setError("⚠️ Sessione scaduta o utente non autenticato. Effettua di nuovo l’accesso.");
        return;
      }
      const safeName = file.name.replace(/\s+/g, "_").replace(/[^\w.]/gi, "");
      const filePath = `${user.id}/${Date.now()}_${safeName}`;
      const { error: uploadError } = await supabase.storage.from("uploads").upload(filePath, file);
      if (uploadError) {
        setError(`Errore nel caricamento del file ${file.name}: ${uploadError.message}`);
        return;
      }
      const { data: urlData } = supabase.storage.from("uploads").getPublicUrl(filePath);
      setAllegatoFox(urlData.publicUrl);
      setFilePathFox(filePath);
      alert("✅ File caricato correttamente! Ora puoi aggiungere un commento e inviare la richiesta.");
      return;
    }
    const formData = new FormData();
    formData.append("file", file);
    try {
      const response = await fetch("/api/estrai-testo", { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Errore estrazione testo");
      if (data.testo) {
        setText(data.testo.trim());
      }
    } catch (err: any) {
      setError(`Errore nel file ${file.name}: ${err.message}`);
      return;
    }
  };

  const handleExport = async () => {
    const doc = new Document({
      sections: [
        {
          children: results
            .map((text, i) => [
              new Paragraph({ children: [new TextRun({ text: `🧩 Blocco ${i + 1}`, bold: true })] }),
              new Paragraph({ text: text, spacing: { after: 300 } }),
            ])
            .flat(),
        },
      ],
    });
    const blob = await Packer.toBlob(doc);
    saveAs(blob, "Riassunto_MyUniAgent.docx");
  };

  if (!userChecked) return <DashboardLayout><p>Caricamento...</p></DashboardLayout>;

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">🧠 Riassunto</h1>

      {modalitaFox === null && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-2">📌 Scegli il tipo di riassunto che vuoi ottenere:</h2>
          <div className="flex gap-4">
            <button onClick={() => setModalitaFox(false)} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">📝 Riassunto automatico</button>
            <button onClick={() => setModalitaFox(true)} className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700">🦊 Riassunto avanzato con Agente Fox</button>
          </div>
        </div>
      )}

      {modalitaFox !== null && (
        <>
          <div className="bg-blue-50 dark:bg-blue-900 border-l-4 border-blue-500 text-blue-900 dark:text-blue-100 p-4 rounded mb-6">
            <h2 className="font-semibold text-lg mb-1">ℹ️ Come funziona il riassunto</h2>
            <p className="text-sm mb-2">Questo strumento genera <strong>riassunti dettagliati</strong> partendo da testo o file. Max 3500 caratteri in modalità classica.</p>
            <p className="text-sm mb-2">🦊 Usa Fox per documenti lunghi!</p>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">✅ Modalità attiva: <strong>{modalitaFox ? "Riassunto avanzato con Agente Fox 🦊" : "Riassunto automatico 📝"}</strong></p>

          <button onClick={() => { setModalitaFox(null); setText(""); setResults([]); setError(""); }} className="text-sm bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-100 px-3 py-1 rounded hover:bg-gray-300 dark:hover:bg-gray-700 mb-6">🔙 Torna alla scelta modalità</button>

          {modalitaFox === false && (
            <div className="mb-4">
              <textarea className="w-full p-2 border rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700" rows={8} placeholder="Incolla il testo da riassumere..." value={text} onChange={(e) => setText(e.target.value)} />
              <button onClick={handleSubmitGPT}disabled={!text || isSubmitting}className={`bg-blue-600 text-white px-4 py-2 rounded mt-2 hover:bg-blue-700 transition ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}>{isSubmitting ? "⏳ Generazione in corso..." : "📝 Riassumi"}</button>

            </div>
          )}

          {modalitaFox === true && (
            <div className="mb-4">
              <textarea className="w-full p-2 border rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700" rows={6} placeholder="Commento per Agente Fox (opzionale)" value={text} onChange={(e) => setText(e.target.value)} />
              <button onClick={inviaAFox} className="bg-orange-600 text-white px-4 py-2 rounded mt-2 hover:bg-orange-700">🦊 Invia richiesta all’Agente Fox</button>

              {allegatoFox && (
                <div className="mt-2 text-sm text-green-600 dark:text-green-400 flex items-center gap-4">
                  📎 File allegato pronto per l'invio.
                  <button onClick={handleRemoveFile} className="text-red-500 text-sm underline hover:text-red-700">❌ Rimuovi file</button>
                </div>
              )}

              {inviatoAFox && (
                <div className={`bg-yellow-50 dark:bg-yellow-900 border-l-4 border-yellow-400 text-yellow-800 dark:text-yellow-100 p-4 rounded mt-4 text-sm transition-all duration-500 ease-in-out ${fade ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}>
                  <strong>🦊 L’Agente Fox sta elaborando la tua richiesta.</strong><br />
                  Potrai visualizzare la risposta nella sezione <span className="font-medium">“Le mie richieste Agente Fox”</span>.
                </div>
              )}
            </div>
          )}

          <div className="mb-6">
            <input ref={fileInputRef} type="file" multiple accept=".pdf,.docx,.txt,.png,.jpg,.jpeg" onChange={handleFileUpload} className="hidden" />
            <button type="button" onClick={() => fileInputRef.current?.click()} className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 px-4 py-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-sm text-gray-800 dark:text-gray-100 transition">📁 Carica file</button>
          </div>

          {results.length > 0 && results.map((r, i) => (
            <div key={i} className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-4 rounded whitespace-pre-wrap border-l-4 border-blue-400">
              <h2 className="font-semibold mb-1">🧩 Blocco {i + 1}</h2>
              {loadingBlocks[i] ? <p className="italic text-gray-600">Generazione in corso...</p> : <p>{r}</p>}
            </div>
          ))}

          {results.length > 0 && !loadingBlocks.includes(true) && (
            <div className="mt-6">
              <button onClick={handleExport} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">📥 Esporta in DOCX</button>
            </div>
          )}

          {error && (
            <p className="text-red-600 dark:text-red-400 mt-4 font-medium">{error}</p>
          )}
        </>
      )}
    </DashboardLayout>
  );
}

RiassuntoPage.requireAuth = true;



