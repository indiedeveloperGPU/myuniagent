import { useEffect, useState, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/lib/supabaseClient";
import { saveAs } from "file-saver";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { pdfjs, Document as PDFDocument, Page } from "react-pdf";
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf-worker/pdf.worker.min.js";
import dynamic from "next/dynamic";
const PdfModal = dynamic(() => import("@/components/PdfModal"), { ssr: false });


const MAX_CHARS = 4800;
const HARD_LIMIT = 5000;

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
  const editorRef = useRef<HTMLDivElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [selectedPdfFile, setSelectedPdfFile] = useState<File | null>(null);
  const [caricamentoFile, setCaricamentoFile] = useState(false);



useEffect(() => {
  // Sincronizza il contenuto del div solo se è diverso dallo stato 'text'.
  // Questo evita di aggiornare il DOM mentre l'utente sta scrivendo,
  // risolvendo il bug del cursore e della direzione RTL.
  if (editorRef.current && editorRef.current.innerText !== text) {
    editorRef.current.innerText = text;
  }
}, [text]); // Esegui questo effetto ogni volta che lo stato 'text' cambia.


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
  const segmenter = new Intl.Segmenter("it", { granularity: "sentence" });
  const sentences = Array.from(segmenter.segment(input)).map(s => s.segment.trim());

  const blocks: string[] = [];
  let currentBlock = "";

  const pushBlock = () => {
    if (currentBlock.trim().length > 0) {
      blocks.push(currentBlock.trim());
      currentBlock = "";
    }
  };

  for (const sentence of sentences) {
    const nextBlock = currentBlock + (currentBlock ? " " : "") + sentence;

    if (nextBlock.length <= MAX_CHARS) {
      currentBlock = nextBlock;
    } else if (nextBlock.length <= HARD_LIMIT) {
      // tolleranza massima accettata
      currentBlock = nextBlock;
      pushBlock();
    } else if (sentence.length > HARD_LIMIT) {
      // frase troppo lunga, la spezzettiamo a virgole o punti e virgola
      const subChunks = sentence.split(/[,;](?![^\(\[]*[\)\]])/g); // evita split in parentesi
      for (const part of subChunks) {
        const trimmed = part.trim();
        if (!trimmed) continue;
        if ((currentBlock + " " + trimmed).length > MAX_CHARS) {
          pushBlock();
        }
        currentBlock += (currentBlock ? " " : "") + trimmed;
      }
      pushBlock();
    } else {
      // normale push per frase che sfora oltre MAX_CHARS
      pushBlock();
      currentBlock = sentence;
    }
  }

  if (currentBlock.trim()) {
    blocks.push(currentBlock.trim());
  }

  return blocks;
};


  const formatText = () => {
  const formatted = text
    // Rimuove spazi multipli
    .replace(/\s+/g, ' ')
    // Gestisce i paragrafi (punto seguito da maiuscola)
    .replace(/\.\s*([A-Z])/g, '.\n\n$1')
    // Gestisce i due punti seguiti da maiuscola (definizioni)
    .replace(/:\s*([A-Z])/g, ':\n$1')
    // Gestisce separatori di pagina
    .replace(/(=== PAGINA \d+ ===)/g, '\n\n$1\n\n')
    // Gestisce titoli (righe corte in maiuscolo)
    .replace(/\n([A-Z\s]{3,30})\n/g, '\n\n**$1**\n\n')
    // Gestisce liste numerate
    .replace(/\n(\d+[\.\)])\s*/g, '\n$1 ')
    // Gestisce liste puntate
    .replace(/\n([-•])\s*/g, '\n$1 ')
    // Rimuove righe vuote multiple
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();
  
  setText(formatted);
};
  

  const handleSubmitGPT = async () => {
  if (isSubmitting) return;
  setIsSubmitting(true);
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
    setIsSubmitting(false);
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

      if (!res.ok || !res.body) {
        throw new Error("Errore nella generazione del riassunto.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let fullText = "";
let lastUpdate = Date.now();
const updateInterval = 100; // millisecondi

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value, { stream: true });
  fullText += chunk;

  const now = Date.now();
  if (now - lastUpdate >= updateInterval) {
    tempResults[i] = fullText;
    setResults([...tempResults]);
    lastUpdate = now;
  }
}

// aggiornamento finale
tempResults[i] = fullText;
setResults([...tempResults]);


    } catch (err: any) {
      tempResults[i] = `❌ Errore nel blocco ${i + 1}: ${err.message}`;
    } finally {
      tempLoading[i] = false;
      setResults([...tempResults]);
      setLoadingBlocks([...tempLoading]);
    }
  }

  setIsSubmitting(false);
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

  // ✅ Limite di 25MB solo per la modalità automatica
  if (!modalitaFox && file.size > 25 * 1024 * 1024) {
    setError("❌ File troppo grande. Il limite massimo è 25MB.");
    return;
  }

  e.target.value = "";
  setError("");
  setResults([]);
  setLoadingBlocks([]);
  setCaricamentoFile(true); // ⏳ Attiva loader

  if (modalitaFox) {
    const sessionResult = await supabase.auth.getSession();
    const accessToken = sessionResult.data.session?.access_token;
    const user = sessionResult.data.session?.user;
    if (!accessToken || !user?.id) {
      setError("⚠️ Sessione scaduta o utente non autenticato. Effettua di nuovo l’accesso.");
      setCaricamentoFile(false);
      return;
    }

    const safeName = file.name.replace(/\s+/g, "_").replace(/[^\w.]/gi, "");
    const filePath = `${user.id}/${Date.now()}_${safeName}`;

    const { error: uploadError } = await supabase.storage.from("uploads").upload(filePath, file);
    if (uploadError) {
      setError(`Errore nel caricamento del file ${file.name}: ${uploadError.message}`);
      setCaricamentoFile(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("uploads").getPublicUrl(filePath);
    setAllegatoFox(urlData.publicUrl);
    setFilePathFox(filePath);
    alert("✅ File caricato correttamente! Ora puoi aggiungere un commento e inviare la richiesta.");
    setCaricamentoFile(false);
    return;
  }

  const formData = new FormData();
  formData.append("file", file);

  try {
    // Se è un PDF, mostra la modale
    if (file.type === "application/pdf") {
      setSelectedPdfFile(file);
      setIsPdfModalOpen(true);
      setCaricamentoFile(false);
      return;
    }

    // Altrimenti, invia all'API per l'estrazione testo
    const response = await fetch("/api/estrai-testo", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Errore estrazione testo");

    if (data.testo) {
      setText(data.testo.trim());
    }
  } catch (err: any) {
    setError(`Errore nel file ${file.name}: ${err.message}`);
  } finally {
    setCaricamentoFile(false); // 🔚 Chiude il loader in ogni caso
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
          {modalitaFox !== null && (
  modalitaFox ? (
    <div className="bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-800 dark:to-orange-900 border-l-4 border-orange-500 text-orange-900 dark:text-orange-100 p-5 rounded-xl shadow-md transition-transform hover:scale-[1.02] mb-6">
  <h2 className="font-bold text-lg flex items-center gap-2 mb-2">
    <span>🦊</span>
    <span>Modalità Agente Fox attiva</span>
  </h2>
  <p className="text-sm leading-relaxed mb-1">
    In questa modalità puoi inviare <strong>documenti lunghi e complessi</strong> senza limiti rigidi. Il motore AI usato è più potente e adatto a testi accademici avanzati.
  </p>
  <p className="text-sm leading-relaxed mb-1">
    Ogni richiesta viene <strong>verificata manualmente</strong> per garantire qualità e prevenire abusi.
  </p>
  <p className="text-sm leading-relaxed">
    ⏳ L’elaborazione può richiedere <strong>fino a qualche ora</strong>, ma il risultato è altamente professionale.
  </p>
</div>
  ) : (
    <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 border-l-4 border-blue-500 text-blue-900 dark:text-blue-100 p-5 rounded-xl shadow-md transition-transform hover:scale-[1.02] mb-6">
  <h2 className="font-bold text-lg flex items-center gap-2 mb-2">
    <span>ℹ️</span>
    <span>Come funziona il riassunto</span>
  </h2>
  <p className="text-sm leading-relaxed mb-1">
    Puoi generare <strong>riassunti universitari avanzati</strong> incollando testo o caricando un PDF. Il sistema accetta <strong>fino a 60.000 caratteri</strong> per richiesta.
  </p>
  <p className="text-sm leading-relaxed">
    🦊 Per testi lunghi e complessi, ti consigliamo di usare <strong>Agente Fox</strong>, che lavora su canali dedicati.
  </p>
</div>
  )
)}

          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">✅ Modalità attiva: <strong>{modalitaFox ? "Riassunto avanzato con Agente Fox 🦊" : "Riassunto automatico 📝"}</strong></p>

          <button onClick={() => { setModalitaFox(null); setText(""); setResults([]); setError(""); }} className="text-sm bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-100 px-3 py-1 rounded hover:bg-gray-300 dark:hover:bg-gray-700 mb-6">🔙 Torna alla scelta modalità</button>

          {modalitaFox === false && (
            <div className="mb-4">
  <div className="flex flex-col">
    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
      ✏️ Testo da riassumere
    </label>
    
    <div
  ref={editorRef}
  contentEditable
  suppressContentEditableWarning
  dir="ltr"
  style={{
    textAlign: 'left',
    unicodeBidi: 'plaintext'
  }}
  className="w-full p-4 border rounded bg-white dark:bg-gray-900
             text-gray-900 dark:text-gray-100 font-mono text-sm leading-relaxed
             whitespace-pre-wrap min-h-[220px] max-h-[400px] overflow-y-auto
             outline-none focus:ring-2 focus:ring-blue-500"
  onInput={(e) => setText(e.currentTarget.innerText)}
/>


    <div className="flex justify-between items-center mt-2">
      <span className="text-xs text-gray-500">{text.length} caratteri • Max {MAX_CHARS} per blocco</span>
      <button
        onClick={() => setText("")}
        disabled={!text.trim()}
        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs disabled:opacity-30"
      >
        🧹 Pulisci testo
      </button>
    </div>

    <button
      onClick={handleSubmitGPT}
      disabled={!text || isSubmitting}
      className={`bg-blue-600 text-white px-4 py-2 rounded mt-4 hover:bg-blue-700 transition ${
        isSubmitting ? "opacity-50 cursor-not-allowed" : ""
      }`}
    >
      {isSubmitting ? "⏳ Generazione in corso..." : "📝 Riassumi"}
    </button>
  </div>
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
            {caricamentoFile && (
  <div className="w-full mt-3 h-2 rounded bg-gray-200 dark:bg-gray-700 overflow-hidden">
    <div className="h-full bg-blue-500 dark:bg-blue-400 animate-loading-bar"></div>
  </div>
)}

          </div>

          {pdfUrl && (
  <div className="mb-6 border border-gray-300 dark:border-gray-700 rounded p-2 bg-white dark:bg-gray-900">
    <PDFDocument
      file={pdfUrl}
      onLoadSuccess={({ numPages }) => setNumPages(numPages)}
      className="w-full"
    >
      {Array.from(new Array(numPages), (el, index) => (
        <Page key={`page_${index + 1}`} pageNumber={index + 1} width={600} />
      ))}
    </PDFDocument>
    <p className="text-xs text-gray-500 mt-2">📄 Puoi selezionare e copiare il testo da qui, poi incollarlo nella textarea sopra per generare il riassunto.</p>
  </div>
)}


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
          {selectedPdfFile && (
  <PdfModal
    isOpen={isPdfModalOpen}
    onClose={() => setIsPdfModalOpen(false)}
    file={selectedPdfFile}
    onTextSelected={(text) => setText(text)}
  />
)}
        </>
      )}
    </DashboardLayout>
  );
}

RiassuntoPage.requireAuth = true;
