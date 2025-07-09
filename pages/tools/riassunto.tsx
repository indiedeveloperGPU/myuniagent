import { useEffect, useState, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/lib/supabaseClient";
import { saveAs } from "file-saver";
import { Document, Packer, Paragraph, TextRun } from "docx";
import dynamic from "next/dynamic";
import { toast } from "react-hot-toast";
import { TokenEstimationService } from "@/lib/tokenEstimation";
import HITLGuideModal from "@/components/HITLGuideModal";

// 🔄 DYNAMIC IMPORTS: SmartPdfReader normale e Bulk
const SmartPdfReader = dynamic(() => import("@/components/SmartPdfReader"), { ssr: false });
const SmartPdfReaderBulk = dynamic(() => import("@/components/SmartPdfReaderBulk"), { ssr: false });

// 🎯 LIMITI OTTIMALI PER QUALITÀ
const MAX_CHARS = 25000; // ~5k token, 7-10 pagine
const SOFT_WARNING = 15000; // Warning a 15k caratteri
const HARD_LIMIT = 25000; // Limite assoluto

export default function RiassuntoPage() {
  const [text, setText] = useState("");
  const [result, setResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [userChecked, setUserChecked] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [selectedPdfFile, setSelectedPdfFile] = useState<File | null>(null);
  const [caricamentoFile, setCaricamentoFile] = useState(false);
  const [facolta, setFacolta] = useState("");
  const [materia, setMateria] = useState("");
  const [titolo, setTitolo] = useState("");
  const [showGuide, setShowGuide] = useState(false);
  
  // 🔄 STATI PER MODALITÀ PROGETTO BULK
  const [workMode, setWorkMode] = useState<'single' | 'project'>('single');
  const [currentSession, setCurrentSession] = useState<any>(null);
  const [sessionTitle, setSessionTitle] = useState("");
  const [rawChunks, setRawChunks] = useState<any[]>([]);
  const [showChunksManager, setShowChunksManager] = useState(false);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerText !== text) {
      editorRef.current.innerText = text;
    }
  }, [text]);

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

  // 🔄 FUNZIONE PER CREARE NUOVO PROGETTO BULK
  const createNewProject = async () => {
    if (!sessionTitle.trim() || !facolta.trim() || !materia.trim()) {
      setError("❌ Titolo progetto, Facoltà e Materia sono obbligatori per iniziare un progetto.");
      return;
    }

    try {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user) {
        setError("❌ Utente non autenticato");
        return;
      }

      // Crea progetto direttamente nella tabella summary_sessions
      const { data: project, error } = await supabase
        .from('summary_sessions')
        .insert({
          user_id: user.id,
          project_title: sessionTitle.trim(),
          facolta: facolta.trim(),
          materia: materia.trim(),
          status: 'attivo'
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentSession(project);
      setRawChunks([]);
      setError("");
      toast.success("🚀 Progetto bulk iniziato!");
      
      // Carica chunks esistenti se ci sono
      await loadProjectChunks(project.id);
      
    } catch (error: any) {
      setError("❌ Errore nella creazione del progetto: " + error.message);
      console.error(error);
    }
  };

  // 🔄 CARICA CHUNKS ESISTENTI QUANDO SI ATTIVA UNA SESSIONE
  const loadProjectChunks = async (projectId: string) => {
    try {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      if (!accessToken) return;

      const response = await fetch(`/api/chunks/${projectId}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      
      if (response.ok) {
        const { chunks } = await response.json();
        setRawChunks(chunks || []);
        console.log(`📦 Caricati ${chunks?.length || 0} chunks per progetto ${projectId}`);
      }
    } catch (error) {
      console.error('Errore caricamento chunks:', error);
    }
  };

  // 🔄 ABBANDONA PROGETTO BULK
  const abandonProject = async () => {
    if (!currentSession) return;
    
    if (confirm(`Sei sicuro di voler abbandonare il progetto "${currentSession.project_title}"? Tutti i progressi andranno persi.`)) {
      try {
        // Elimina progetto e tutti i chunks associati (CASCADE)
        const { error } = await supabase
          .from('summary_sessions')
          .delete()
          .eq('id', currentSession.id);

        if (error) throw error;

        setCurrentSession(null);
        setRawChunks([]);
        setSessionTitle("");
        setWorkMode('single');
        
        toast.success("🗑️ Progetto abbandonato");
      } catch (error) {
        console.error('Errore abbandono progetto:', error);
        toast.error("❌ Errore nell'abbandono del progetto");
      }
    }
  };

  // 🔄 CALLBACK PER CHUNK SALVATO DA SMARTPDFREADER BULK
  const handleChunkSaved = (savedChunk: any) => {
    setRawChunks(prev => [...prev, savedChunk]);
    toast.success(`📦 Chunk "${savedChunk.title}" salvato nel progetto!`);
  };

  // 🎨 FORMATTAZIONE TESTO INTELLIGENTE
  const formatText = () => {
    const formatted = text
      .replace(/\s+/g, ' ')
      .replace(/\.\s*([A-Z])/g, '.\n\n$1')
      .replace(/:\s*([A-Z])/g, ':\n$1')
      .replace(/(=== PAGINA \d+ ===)/g, '\n\n$1\n\n')
      .replace(/\n([A-Z\s]{3,30})\n/g, '\n\n**$1**\n\n')
      .replace(/\n(\d+[\.\)])\s*/g, '\n$1 ')
      .replace(/\n([-•])\s*/g, '\n$1 ')
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .trim();
    
    setText(formatted);
    toast.success("🎨 Testo formattato con successo!");
  };

  // 🧠 RIASSUNTO INTELLIGENTE HITL (SOLO MODALITÀ SINGOLA)
  const handleSubmitGPT = async () => {
    if (isLoading) return;
    
    // Validazione lunghezza
    if (text.length > HARD_LIMIT) {
      setError(`❌ Testo troppo lungo: ${text.length.toLocaleString()} caratteri. Massimo consentito: ${HARD_LIMIT.toLocaleString()}. Usa SmartPdfReader per selezionare solo le sezioni necessarie.`);
      return;
    }

    if (!facolta.trim() || !materia.trim()) {
      setError("❌ Facoltà e Materia sono obbligatorie per personalizzare il riassunto.");
      return;
    }

    if (!titolo.trim()) {
      setError("❌ Il titolo è obbligatorio per salvare il riassunto nella tua Biblioteca.");
      return;
    }

    setIsLoading(true);
    setResult("");
    setError("");

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        setError("Utente non autenticato.");
        setIsLoading(false);
        return;
      }

      console.log('🎯 Avvio riassunto HITL singolo:', { chars: text.length, facolta, materia });
      
      const res = await fetch("/api/riassunto", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ 
          text: text.trim(),
          facolta: facolta.trim(), 
          materia: materia.trim(),
          titolo: titolo.trim()
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error("Errore nella generazione del riassunto.");
      }

      // 📡 STREAMING RESPONSE
      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let accumulatedResult = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        accumulatedResult += chunk;
        setResult(accumulatedResult);
      }

      if (accumulatedResult.trim()) {
        setTimeout(() => {
          toast.success(
            "🎉 Riassunto completato con successo!",
            {
              duration: 5000,
              position: 'top-right',
            }
          );
        }, 1000);
      }

      console.log(`✅ Riassunto HITL singolo completato`);

    } catch (err: any) {
      setError(`❌ Errore nella generazione: ${err.message}`);
      console.error('Errore elaborazione:', err);
      toast.error("❌ Errore durante l'elaborazione del riassunto");
    } finally {
      setIsLoading(false);
    }
  };

  // 📁 GESTIONE FILE CON SMART PDF READER
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      setError("⚠️ Nessun file selezionato.");
      return;
    }
    if (files.length > 1) {
      toast("📎 Puoi inviare un solo file per volta. Per più documenti, usa SmartPdfReader per selezionare le sezioni specifiche.");
    }

    const file = files[0];

    if (!file) {
      setError("⚠️ File non valido.");
      return;
    }

    e.target.value = "";
    setError("");
    setResult("");
    setCaricamentoFile(true);

    try {
      if (file.type === "application/pdf") {
        setSelectedPdfFile(file);
        setIsPdfModalOpen(true);
        setCaricamentoFile(false);
        
        // 🔄 MESSAGGIO DIVERSO IN BASE ALLA MODALITÀ
        if (workMode === 'project' && currentSession) {
          toast.success("📚 Usa SmartPdfReaderBulk per selezionare e salvare chunks!");
        } else {
          toast.success("📖 Usa SmartPdfReader per selezionare le sezioni specifiche da riassumere!");
        }
        return;
      }

      // Altri formati - estrazione testo diretta
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/estrai-testo", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Errore estrazione testo");

      if (data.testo) {
        const extractedText = data.testo.trim();
        if (extractedText.length > HARD_LIMIT) {
          toast.error(`⚠️ Testo estratto troppo lungo (${extractedText.length.toLocaleString()} caratteri). Usa SmartPdfReader per selezionare solo le sezioni necessarie.`);
        } else {
          setText(extractedText);
          toast.success("✅ Testo estratto con successo!");
        }
      }
    } catch (err: any) {
      setError(`Errore nel file ${file.name}: ${err.message}`);
      toast.error(`Errore nel file ${file.name}`);
    } finally {
      setCaricamentoFile(false);
    }
  };

  // 📥 ESPORTAZIONE RISULTATO
  const handleExport = async () => {
    if (!result.trim()) {
      toast.error("❌ Nessun riassunto da esportare");
      return;
    }

    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({ 
              children: [new TextRun({ text: `Riassunto MyUniAgent - ${facolta} / ${materia}`, bold: true, size: 28 })] 
            }),
            new Paragraph({ text: "" }), // Spazio
            new Paragraph({ 
              children: [new TextRun({ text: `Generato il: ${new Date().toLocaleDateString('it-IT')}`, italics: true })] 
            }),
            new Paragraph({ text: "" }), // Spazio
            new Paragraph({ text: result, spacing: { after: 200 } }),
          ],
        },
      ],
    });
    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${titolo.replace(/[^a-zA-Z0-9]/g, '_')}_MyUniAgent.docx`);
    toast.success("📥 File DOCX esportato con successo!");
  };

  // 🎯 STATISTICHE TESTO
  const tokenService = new TokenEstimationService();

  const getTextStats = () => {
    if (!text.trim()) {
      return { 
        chars: 0, 
        words: 0, 
        estimatedTokens: 0,
        promptTokens: undefined,
        maxOutputTokens: undefined,
        estimatedCost: undefined,
        limits: undefined,
        readability: undefined
      };
    }
    
    // Se abbiamo facoltà e materia, usa analisi completa
    if (facolta.trim() && materia.trim()) {
      return tokenService.getDetailedStats(text, facolta, materia);
    }
    
    // Altrimenti usa stima base (compatibilità) con proprietà undefined
    const chars = text.length;
    const words = text.trim().split(/\s+/).length;
    const estimatedTokens = Math.ceil(chars / 4);
    
    return { 
      chars, 
      words, 
      estimatedTokens,
      promptTokens: undefined,
      maxOutputTokens: undefined,
      estimatedCost: undefined,
      limits: undefined,
      readability: undefined
    };
  };

  const stats = getTextStats();
  const isOverLimit = stats.chars > HARD_LIMIT;
  const isNearLimit = stats.chars > SOFT_WARNING;

  if (!userChecked) return <DashboardLayout><p>Caricamento...</p></DashboardLayout>;

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">🧠 Riassunto Intelligente HITL</h1>

      <div className="bg-gradient-to-br from-blue-50 to-purple-100 dark:from-blue-900 dark:to-purple-800 border-l-4 border-blue-500 text-blue-900 dark:text-blue-100 p-4 rounded-xl shadow-md mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="font-bold text-lg flex items-center gap-2 mb-2">
              🧠 Riassunto Intelligente HITL
            </h2>
            <p className="text-sm leading-relaxed">
              <strong>Tu sei il vero "chunker semantico"!</strong> Seleziona intelligentemente solo il contenuto che vuoi riassumere.
              <br />
              Limite ottimale: <strong>25k caratteri</strong> per massima qualità e zero allucinazioni.
            </p>
          </div>
          <button 
            onClick={() => setShowGuide(true)}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm transition-all flex items-center gap-2"
          >
            📖 Come funziona
          </button>
        </div>
      </div>

      {/* 🎯 MODALITÀ DI LAVORO SELECTOR */}
      {!currentSession && (
        <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900 dark:to-blue-900 rounded-xl border border-purple-200 dark:border-purple-700">
          <h3 className="font-semibold mb-3 text-purple-900 dark:text-purple-100 flex items-center gap-2">
            🎯 Modalità di Lavoro
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <button
              onClick={() => setWorkMode('single')}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                workMode === 'single' 
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-md transform scale-[1.02]' 
                  : 'border-gray-200 dark:border-gray-600 hover:border-blue-300'
              }`}
            >
              <div className="font-medium text-blue-900 dark:text-blue-100 flex items-center gap-2 mb-2">
                📄 Riassunto Singolo
              </div>
              <div className="text-sm text-blue-700 dark:text-blue-300">
                Per documenti brevi (fino a 20k caratteri)
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                ✅ Risultato immediato • Salvato direttamente in Biblioteca
              </div>
            </button>
            
            <button
              onClick={() => setWorkMode('project')}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                workMode === 'project' 
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30 shadow-md transform scale-[1.02]' 
                  : 'border-gray-200 dark:border-gray-600 hover:border-purple-300'
              }`}
            >
              <div className="font-medium text-purple-900 dark:text-purple-100 flex items-center gap-2 mb-2">
                📚 Riassunto Bulk
              </div>
              <div className="text-sm text-purple-700 dark:text-purple-300">
                Per testi lunghi (libri, dispense complete)
              </div>
              <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                📦 Selezione chunks • Elaborazione batch
              </div>
            </button>
          </div>
          
          {/* 📝 SETUP PROGETTO MULTI-PARTE */}
          {workMode === 'project' && (
            <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-purple-200 dark:border-purple-700">
              <h4 className="font-medium text-purple-900 dark:text-purple-100 mb-3 flex items-center gap-2">
                📝 Configura Nuovo Progetto
              </h4>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    📚 Titolo del progetto
                  </label>
                  <input
                    type="text"
                    value={sessionTitle}
                    onChange={(e) => setSessionTitle(e.target.value)}
                    placeholder="Es. Diritto Privato - Manuale Completo"
                    className="w-full p-2 border rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-purple-500 transition-all"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      🏛️ Facoltà
                    </label>
                    <input
                      type="text"
                      value={facolta}
                      onChange={(e) => setFacolta(e.target.value)}
                      placeholder="Es. Giurisprudenza"
                      className="w-full p-2 border rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-purple-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      📘 Materia
                    </label>
                    <input
                      type="text"
                      value={materia}
                      onChange={(e) => setMateria(e.target.value)}
                      placeholder="Es. Diritto Privato"
                      className="w-full p-2 border rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-purple-500 transition-all"
                    />
                  </div>
                </div>
                
                <button
                  onClick={createNewProject}
                  disabled={!sessionTitle.trim() || !facolta.trim() || !materia.trim()}
                  className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all transform hover:scale-[1.02]"
                >
                  🚀 Inizia Progetto Bulk
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 📊 PROJECT MANAGER (quando è attivo un progetto) */}
      {currentSession && (
        <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900 dark:to-blue-900 rounded-xl border border-green-200 dark:border-green-700">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="font-semibold text-green-900 dark:text-green-100 flex items-center gap-2">
                📚 {currentSession.project_title}
              </h3>
              <p className="text-sm text-green-700 dark:text-green-300">
                {currentSession.facolta} • {currentSession.materia}
              </p>
              <p className="text-xs text-green-600 dark:text-green-400">
                {rawChunks.length} chunks selezionati • Iniziato il {new Date(currentSession.created_at).toLocaleDateString('it-IT')}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowChunksManager(!showChunksManager)}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-all"
              >
                {showChunksManager ? '👁️ Nascondi' : '📊 Gestisci'} Chunks
              </button>
              <button
                onClick={() => toast("🚧 Batch processing in sviluppo!", { icon: 'ℹ️' })}
                disabled={rawChunks.length === 0}
                className="px-3 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                ⚡ Elabora Batch
              </button>
              <button
                onClick={abandonProject}
                className="px-3 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-all"
              >
                🗑️ Abbandona
              </button>
            </div>
          </div>
          
          {/* 📋 CHUNKS OVERVIEW */}
          {showChunksManager && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-green-200 dark:border-green-700 overflow-hidden">
              <div className="p-3 bg-green-100 dark:bg-green-800 border-b border-green-200 dark:border-green-700">
                <h4 className="font-medium text-green-900 dark:text-green-100">
                  📋 Chunks Selezionati ({rawChunks.length})
                </h4>
              </div>
              <div className="max-h-40 overflow-y-auto">
                {rawChunks.map((chunk, index) => (
                  <div key={chunk.id} className="p-3 border-b border-gray-200 dark:border-gray-600 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {chunk.title}
                          </span>
                          <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100 px-2 py-1 rounded-full">
                            {chunk.char_count?.toLocaleString() || 0} caratteri
                          </span>
                          <span className="text-xs bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 px-2 py-1 rounded-full">
                            {chunk.status || 'draft'}
                          </span>
                        </div>
                        {chunk.section && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            📚 {chunk.section}
                          </p>
                        )}
                        {chunk.page_range && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            📄 {chunk.page_range}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-500 ml-4">
                        {new Date(chunk.created_at).toLocaleDateString('it-IT', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <strong>Totale:</strong> {rawChunks.reduce((sum, chunk) => sum + (chunk.char_count || 0), 0).toLocaleString()} caratteri selezionati
                </div>
              </div>
            </div>
          )}
          
          {rawChunks.length === 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg border border-blue-200 dark:border-blue-700">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                🎯 <strong>Pronto per iniziare!</strong> Carica un PDF per selezionare e salvare chunks con SmartPdfReaderBulk.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ✏️ TESTO DA RIASSUMERE (Solo modalità singola) */}
      {workMode === 'single' && (
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
              className={`w-full p-4 border rounded bg-white dark:bg-gray-900
                         text-gray-900 dark:text-gray-100 font-mono text-sm leading-relaxed
                         whitespace-pre-wrap min-h-[220px] max-h-[400px] overflow-y-auto
                         outline-none focus:ring-2 transition-all
                         ${isOverLimit ? 'border-red-500 focus:ring-red-500' : 
                           isNearLimit ? 'border-yellow-500 focus:ring-yellow-500' : 
                           'border-gray-300 focus:ring-blue-500'}`}
              onInput={(e) => setText(e.currentTarget.innerText)}
            />

            <div className="flex justify-between items-center mt-2">
              <div className="text-xs space-y-1">
                <div className={`${isOverLimit ? 'text-red-600' : isNearLimit ? 'text-yellow-600' : 'text-gray-500'}`}>
                  📊 {stats.chars.toLocaleString()} caratteri • {stats.words.toLocaleString()} parole • ~{stats.estimatedTokens.toLocaleString()} token
                </div>
                
                {/* Statistiche avanzate se disponibili */}
                {stats.promptTokens !== undefined && (
                  <div className="text-gray-400">
                    🧠 Token prompt: {stats.promptTokens.toLocaleString()} • Output previsto: {stats.maxOutputTokens?.toLocaleString()} • Compressione: {((stats.readability?.compressionRatio || 0) * 100).toFixed(1)}%
                  </div>
                )}
                
                {/* Avvisi intelligenti */}
                {stats.limits?.warnings && stats.limits.warnings.length > 0 && (
                  <div className="text-yellow-600">
                    {stats.limits.warnings.join(' • ')}
                  </div>
                )}
                
                <div className={`${isOverLimit ? 'text-red-600' : isNearLimit ? 'text-yellow-600' : 'text-gray-400'}`}>
                  💡 Limite ottimale: {MAX_CHARS.toLocaleString()} caratteri per massima qualità
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={formatText}
                  disabled={!text.trim()}
                  className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 text-xs disabled:opacity-30 transition-all"
                >
                  🎨 Formatta
                </button>
                <button
                  onClick={() => setText("")}
                  disabled={!text.trim()}
                  className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs disabled:opacity-30 transition-all"
                >
                  🧹 Pulisci
                </button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4">
              {/* TITOLO - Solo per modalità singola */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  📝 Titolo del riassunto (obbligatorio)
                </label>
                <input
                  type="text"
                  value={titolo}
                  onChange={(e) => setTitolo(e.target.value)}
                  placeholder="Es. Diritto Privato - I Contratti"
                  className="w-full p-2 border rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-all focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              {/* FACOLTÀ E MATERIA */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    🏛️ Facoltà (obbligatoria)
                  </label>
                  <input
                    type="text"
                    value={facolta}
                    onChange={(e) => setFacolta(e.target.value)}
                    placeholder="Es. Giurisprudenza"
                    className="w-full p-2 border rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-all focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    📘 Materia (obbligatoria)
                  </label>
                  <input
                    type="text"
                    value={materia}
                    onChange={(e) => setMateria(e.target.value)}
                    placeholder="Es. Diritto Privato"
                    className="w-full p-2 border rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-all focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleSubmitGPT}
              disabled={!text || isLoading || !facolta || !materia || !titolo || isOverLimit}
              className={`bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg mt-4 hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105 font-medium ${
                isLoading || !facolta || !materia || !titolo || isOverLimit ? "opacity-50 cursor-not-allowed transform-none" : ""
              }`}
            >
              {isLoading ? "🧠 Elaborazione in corso..." : "🚀 Riassumi con AgenteFox"}
            </button>
          </div>
        </div>
      )}

      {/* 📁 CARICA FILE */}
      <div className="mb-6">
        <input 
          ref={fileInputRef} 
          type="file" 
          accept=".pdf,.docx,.txt,.png,.jpg,.jpeg" 
          onChange={handleFileUpload} 
          className="hidden" 
        />
        <button 
          type="button" 
          onClick={() => fileInputRef.current?.click()} 
          className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 px-4 py-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-sm text-gray-800 dark:text-gray-100 transition-all transform hover:scale-105"
        >
          📁 Carica file {workMode === 'project' ? '(consigliato: PDF per SmartReaderBulk)' : '(consigliato: PDF per SmartReader)'}
        </button>
        {caricamentoFile && (
          <div className="w-full mt-3 h-2 rounded bg-gray-200 dark:bg-gray-700 overflow-hidden">
            <div className="h-full bg-blue-500 dark:bg-blue-400 animate-pulse"></div>
          </div>
        )}
      </div>

      {/* 🧠 PROCESSING MESSAGE (Solo modalità singola) */}
      {workMode === 'single' && isLoading && (
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900 rounded-lg border-l-4 border-blue-500">
          <div className="flex items-center">
            <div className="animate-spin mr-3 w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                🧠 Elaborazione HITL in corso...
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                AgenteFox sta analizzando il tuo testo per {facolta}.
                <br />Il risultato apparirà in tempo reale.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 📄 RISULTATO RIASSUNTO (Solo modalità singola) */}
      {workMode === 'single' && result && (
        <div className="mb-6 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              📄 Riassunto Generato
              {isLoading && <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>}
            </h2>
            <div className="flex gap-2">
              <button 
                onClick={() => navigator.clipboard.writeText(result)} 
                className="text-sm bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700 transition-all"
              >
                📋 Copia
              </button>
              <button 
                onClick={handleExport} 
                className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-all"
              >
                📥 Esporta DOCX
              </button>
            </div>
          </div>
          <div className="p-4">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <pre className="whitespace-pre-wrap font-sans text-gray-800 dark:text-gray-200 leading-relaxed">
                {result}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* ✅ COMPLETION NOTIFICATION (Solo modalità singola) */}
      {workMode === 'single' && result && !isLoading && (
        <div className="mt-6 p-4 bg-green-50 dark:bg-green-900 rounded-lg border-l-4 border-green-500">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-green-800 dark:text-green-200">
                ✅ Riassunto completato con successo!
              </h3>
              <p className="text-sm text-green-700 dark:text-green-300">
                {stats.chars.toLocaleString()} caratteri processati • {result.length.toLocaleString()} caratteri generati • Ratio: {((result.length / stats.chars) * 100).toFixed(1)}%
              </p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                Il riassunto è stato salvato automaticamente nella tua Biblioteca.
              </p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => window.location.href = '/biblioteca'} 
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition text-sm"
              >
                📚 Vai alla Biblioteca
              </button>
              <button 
                onClick={handleExport} 
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition text-sm"
              >
                📥 Esporta DOCX
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ❌ ERRORI */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 dark:bg-red-900 border-l-4 border-red-500 rounded">
          <p className="text-red-600 dark:text-red-400 font-medium">{error}</p>
        </div>
      )}

      {/* 📚 SMARTPDF READERS */}
      {selectedPdfFile && (
        <>
          {/* 📄 MODALITÀ SINGOLA: SmartPdfReader normale */}
          {workMode === 'single' && (
            <SmartPdfReader
              isOpen={isPdfModalOpen}
              onClose={() => setIsPdfModalOpen(false)}
              file={selectedPdfFile}
              onTextSelected={(selectedText) => {
                setText(selectedText);
                toast.success(`📖 Testo selezionato: ${selectedText.length.toLocaleString()} caratteri`);
              }}
            />
          )}
          
          {/* 📚 MODALITÀ PROGETTO: SmartPdfReaderBulk */}
          {workMode === 'project' && currentSession && (
            <SmartPdfReaderBulk
              isOpen={isPdfModalOpen}
              onClose={() => setIsPdfModalOpen(false)}
              file={selectedPdfFile}
              projectId={currentSession.id}
              onChunkSaved={handleChunkSaved}
            />
          )}
        </>
      )}

      <HITLGuideModal 
        isOpen={showGuide} 
        onClose={() => setShowGuide(false)} 
      />
    </DashboardLayout>
  );
}

RiassuntoPage.requireAuth = true;