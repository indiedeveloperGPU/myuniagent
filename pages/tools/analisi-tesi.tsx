import { useEffect, useState, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/lib/supabaseClient";
import { saveAs } from "file-saver";
import { Document, Packer, Paragraph, TextRun } from "docx";
import dynamic from "next/dynamic";
import { toast } from "react-hot-toast";
import { TokenEstimationService } from "@/lib/tokenEstimation";
import HITLTesiGuidaModal from "@/components/HITLTesiGuidaModal";

const SmartPdfReader = dynamic(() => import("@/components/SmartPdfReader"), { ssr: false });

// 🎯 LIMITI OTTIMALI PER QUALITÀ
const MAX_CHARS = 25000; // ~5k token, 7-10 pagine
const SOFT_WARNING = 15000; // Warning a 15k caratteri
const HARD_LIMIT = 25000; // Limite assoluto

// 🎓 TYPESCRIPT INTERFACES ENTERPRISE
interface ThesisAnalysisSession {
  id: string;
  project_title: string;
  faculty: string;
  thesis_topic: string;
  level: 'triennale' | 'magistrale' | 'dottorato';
  status: 'active' | 'completed' | 'abandoned';
  is_public: boolean;
  created_at: string;
  stats?: {
    completed_analyses: number;
    expected_analyses: number;
    completion_percentage: number;
    remaining_analyses: number;
    completed_analysis_types: string[];
    remaining_analysis_types: string[];
    days_since_creation: number;
    days_since_last_activity: number;
    is_stale: boolean;
    estimated_completion_time: string;
  };
}

interface AnalysisChunk {
  id: string;
  chunk_number: number;
  analysis_type: string;
  input_text: string;
  output_analysis: string;
  created_at: string;
}

// 🎯 CONFIGURAZIONE ANALISI PER LIVELLO
const ANALYSIS_TYPES = {
  triennale: [
    { key: 'analisi_strutturale', name: 'Analisi Strutturale', description: 'Valutazione organizzazione logica e coerenza espositiva' },
    { key: 'analisi_metodologica', name: 'Analisi Metodologica', description: 'Appropriatezza e applicazione del metodo di ricerca' },
    { key: 'analisi_contenuti', name: 'Analisi dei Contenuti', description: 'Padronanza degli argomenti e qualità dei contenuti' },
    { key: 'analisi_bibliografica', name: 'Analisi Bibliografica', description: 'Qualità e pertinenza delle fonti utilizzate' },
    { key: 'analisi_formale', name: 'Analisi Formale', description: 'Correttezza espositiva e linguistica' },
    { key: 'analisi_coerenza_argomentativa', name: 'Coerenza Argomentativa', description: 'Logica e consistenza delle argomentazioni' },
    { key: 'analisi_originalita_contributo', name: 'Originalità del Contributo', description: 'Elementi di novità e contributo personale' },
    { key: 'analisi_rilevanza_disciplinare', name: 'Rilevanza Disciplinare', description: 'Significatività nel contesto disciplinare' }
  ],
  magistrale: [
    { key: 'analisi_strutturale_avanzata', name: 'Strutturale Avanzata', description: 'Architettura argomentativa complessa' },
    { key: 'analisi_metodologica_rigorosa', name: 'Metodologica Rigorosa', description: 'Rigore scientifico e innovazione metodologica' },
    { key: 'analisi_contenuti_specialistici', name: 'Contenuti Specialistici', description: 'Profondità e specializzazione disciplinare' },
    { key: 'analisi_critica_sintetica', name: 'Critica e Sintetica', description: 'Capacità di analisi e sintesi critica' },
    { key: 'analisi_bibliografica_completa', name: 'Bibliografica Completa', description: 'Completezza dello stato dell\'arte' },
    { key: 'analisi_empirica_sperimentale', name: 'Empirica/Sperimentale', description: 'Validità di dati e sperimentazione' },
    { key: 'analisi_implicazioni', name: 'Delle Implicazioni', description: 'Rilevanza teorica e pratica' },
    { key: 'analisi_innovazione_metodologica', name: 'Innovazione Metodologica', description: 'Originalità nell\'approccio metodologico' },
    { key: 'analisi_validita_statistica', name: 'Validità Statistica', description: 'Robustezza statistica e validità dei risultati' },
    { key: 'analisi_applicabilita_pratica', name: 'Applicabilità Pratica', description: 'Trasferibilità e utilità pratica' },
    { key: 'analisi_limiti_criticita', name: 'Limiti e Criticità', description: 'Identificazione limitazioni e criticità' },
    { key: 'analisi_posizionamento_teorico', name: 'Posizionamento Teorico', description: 'Collocazione nel panorama teorico' }
  ],
  dottorato: [
    { key: 'analisi_originalita_scientifica', name: 'Originalità Scientifica', description: 'Innovazione e contributo alla conoscenza' },
    { key: 'analisi_metodologica_frontiera', name: 'Metodologica di Frontiera', description: 'Sofisticazione metodologica avanzata' },
    { key: 'analisi_stato_arte_internazionale', name: 'Stato dell\'Arte Internazionale', description: 'Completezza panorama internazionale' },
    { key: 'analisi_framework_teorico', name: 'Framework Teorico', description: 'Solidità dell\'impianto teorico' },
    { key: 'analisi_empirica_avanzata', name: 'Empirica Avanzata', description: 'Robustezza dati e validazione avanzata' },
    { key: 'analisi_critica_profonda', name: 'Critica Profonda', description: 'Discussione critica approfondita' },
    { key: 'analisi_impatto_scientifico', name: 'Impatto Scientifico', description: 'Potenziale impatto sulla disciplina' },
    { key: 'analisi_riproducibilita', name: 'Riproducibilità', description: 'Trasparenza e replicabilità' },
    { key: 'analisi_standard_internazionali', name: 'Standard Internazionali', description: 'Conformità standard internazionali' },
    { key: 'analisi_significativita_statistica', name: 'Significatività Statistica', description: 'Robustezza statistica avanzata' },
    { key: 'analisi_etica_ricerca', name: 'Etica della Ricerca', description: 'Aspetti etici e deontologici' },
    { key: 'analisi_sostenibilita_metodologica', name: 'Sostenibilità Metodologica', description: 'Sostenibilità dell\'approccio metodologico' },
    { key: 'analisi_interdisciplinarieta', name: 'Interdisciplinarità', description: 'Approcci interdisciplinari e multidisciplinari' },
    { key: 'analisi_scalabilita_risultati', name: 'Scalabilità Risultati', description: 'Generalizzabilità e scalabilità' },
    { key: 'analisi_pubblicabilita_internazionale', name: 'Pubblicabilità Internazionale', description: 'Potenziale pubblicazione riviste internazionali' },
    { key: 'analisi_gap_conoscenza_colmato', name: 'Gap di Conoscenza', description: 'Lacune conoscitive colmate dalla ricerca' }
  ]
};

export default function AnalisiTesiPage() {
  // 🎯 STATE MANAGEMENT ENTERPRISE
  const [text, setText] = useState("");
  const [result, setResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [userChecked, setUserChecked] = useState(false);
  
  // 📁 FILE HANDLING
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [selectedPdfFile, setSelectedPdfFile] = useState<File | null>(null);
  const [caricamentoFile, setCaricamentoFile] = useState(false);
  
  // 🎓 PROJECT SETUP
  const [projectName, setProjectName] = useState("");
  const [faculty, setFaculty] = useState("");
  const [thesisTopic, setThesisTopic] = useState("");
  const [level, setLevel] = useState<'triennale' | 'magistrale' | 'dottorato' | ''>('');
  const [isPublic, setIsPublic] = useState(false);
  
  // 📊 SESSION MANAGEMENT
  const [currentSession, setCurrentSession] = useState<ThesisAnalysisSession | null>(null);
  const [chunks, setChunks] = useState<AnalysisChunk[]>([]);
  const [activeSessions, setActiveSessions] = useState<ThesisAnalysisSession[]>([]);
  const [showSessionManager, setShowSessionManager] = useState(false);
  
  // 🎯 ANALYSIS SELECTION
  const [selectedAnalysisType, setSelectedAnalysisType] = useState("");
  const [completedAnalysisTypes, setCompletedAnalysisTypes] = useState<string[]>([]);
  
  // 🎨 UI STATE
  const [showGuide, setShowGuide] = useState(false);
  const [isFormatted, setIsFormatted] = useState(false);

  // 🔄 USEEFFECT HOOKS
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

  // 🔄 CARICA SESSIONI ATTIVE
  useEffect(() => {
    const loadActiveSessions = async () => {
      if (!userChecked) return;
      
      try {
        const { data } = await supabase.auth.getSession();
        const accessToken = data.session?.access_token;
        if (!accessToken) return;

        const response = await fetch('/api/thesis-sessions/active', {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        
        if (response.ok) {
          const { sessions } = await response.json();
          setActiveSessions(sessions);
        }
      } catch (error) {
        console.error('Errore caricamento sessioni:', error);
      }
    };

    loadActiveSessions();
  }, [userChecked]);

  // 🔄 AGGIORNA ANALISI COMPLETATE QUANDO CAMBIA SESSIONE
  useEffect(() => {
    if (currentSession?.stats?.completed_analysis_types) {
      setCompletedAnalysisTypes(currentSession.stats.completed_analysis_types);
    }
  }, [currentSession]);

  // 🚀 CREAZIONE NUOVA SESSIONE
  const createNewSession = async () => {
    if (!projectName.trim() || !faculty.trim() || !thesisTopic.trim() || !level) {
      setError("❌ Tutti i campi del progetto sono obbligatori.");
      return;
    }

    try {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      if (!accessToken) return;

      const response = await fetch('/api/thesis-sessions/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          project_title: projectName.trim(),
          faculty: faculty.trim(),
          thesis_topic: thesisTopic.trim(),
          level: level,
          is_public: isPublic
        })
      });

      if (response.ok) {
        const session = await response.json();
        setCurrentSession(session);
        setChunks([]);
        setCompletedAnalysisTypes([]);
        toast.success("🚀 Progetto di analisi tesi iniziato!");
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore nella creazione della sessione');
      }
    } catch (error: any) {
      setError("❌ Errore nella creazione del progetto: " + error.message);
      console.error(error);
    }
  };

  // 📚 RIPRESA SESSIONE ESISTENTE
  const resumeSession = async (sessionId: string) => {
    try {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      if (!accessToken) return;

      const response = await fetch(`/api/thesis-sessions/${sessionId}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (response.ok) {
        const { session } = await response.json();
        setCurrentSession(session);
        setChunks(session.chunks || []);
        setFaculty(session.faculty);
        setThesisTopic(session.thesis_topic);
        setLevel(session.level);
        setProjectName(session.project_title);
        setIsPublic(session.is_public);
        setCompletedAnalysisTypes(session.chunks?.map((c: AnalysisChunk) => c.analysis_type) || []);
        toast.success(`📚 Ripreso progetto: ${session.project_title}`);
      }
    } catch (error) {
      console.error('Errore ripresa sessione:', error);
    }
  };

  // ✅ FINALIZZAZIONE PROGETTO
  const finalizeProject = async () => {
    if (!currentSession) {
      toast.error("❌ Nessun progetto attivo da finalizzare");
      return;
    }

    if (completedAnalysisTypes.length === 0) {
      toast.error("❌ Nessun'analisi completata da finalizzare");
      return;
    }

    try {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      if (!accessToken) return;

      const response = await fetch(`/api/thesis-sessions/${currentSession.id}/finalize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        }
      });

      if (response.ok) {
        const { message, chunks_count, analysis_quality_score } = await response.json();
        
        // Reset stato
        setCurrentSession(null);
        setChunks([]);
        setCompletedAnalysisTypes([]);
        setProjectName("");
        setFaculty("");
        setThesisTopic("");
        setLevel('');
        setText("");
        setResult("");
        setSelectedAnalysisType("");
        
        // Aggiorna lista sessioni attive
        setActiveSessions(prev => prev.filter(s => s.id !== currentSession.id));
        
        toast.success(`🎉 Progetto completato! ${chunks_count} analisi unite. Quality Score: ${analysis_quality_score}/100`, {
          duration: 8000
        });
        
        // Opzionale: redirect alla biblioteca
        setTimeout(() => {
          if (confirm("Vuoi visualizzare l'analisi completa in Biblioteca?")) {
            window.location.href = '/biblioteca';
          }
        }, 2000);
      } else {
        throw new Error('Errore nella finalizzazione');
      }
    } catch (error: any) {
      setError("❌ Errore nella finalizzazione del progetto: " + error.message);
      console.error(error);
    }
  };

  // 🗑️ ABBANDONA SESSIONE
  const abandonSession = async () => {
    if (!currentSession) return;
    
    if (confirm(`Sei sicuro di voler abbandonare il progetto "${currentSession.project_title}"? Tutti i progressi andranno persi.`)) {
      try {
        const { data } = await supabase.auth.getSession();
        const accessToken = data.session?.access_token;
        if (!accessToken) return;

        await fetch(`/api/thesis-sessions/${currentSession.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` }
        });

        setCurrentSession(null);
        setChunks([]);
        setCompletedAnalysisTypes([]);
        setProjectName("");
        setFaculty("");
        setThesisTopic("");
        setLevel('');
        setActiveSessions(prev => prev.filter(s => s.id !== currentSession.id));
        
        toast.success("🗑️ Progetto abbandonato");
      } catch (error) {
        console.error('Errore abbandono sessione:', error);
      }
    }
  };

  // 🧠 ESECUZIONE ANALISI
  const handleAnalysisSubmit = async () => {
    if (isLoading) return;
    
    // Validazioni
    if (!currentSession) {
      setError("❌ Nessun progetto attivo. Crea prima un progetto.");
      return;
    }

    if (!selectedAnalysisType) {
      setError("❌ Seleziona il tipo di analisi da eseguire.");
      return;
    }

    if (completedAnalysisTypes.includes(selectedAnalysisType)) {
      setError("❌ Questa analisi è già stata completata per questo progetto.");
      return;
    }

    if (!text.trim()) {
      setError("❌ Inserisci il testo da analizzare.");
      return;
    }
    
    // Validazione lunghezza
    if (text.length > HARD_LIMIT) {
      setError(`❌ Testo troppo lungo: ${text.length.toLocaleString()} caratteri. Massimo consentito: ${HARD_LIMIT.toLocaleString()}. Usa SmartPdfReader per selezionare solo le sezioni necessarie.`);
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

      console.log('🎯 Avvio analisi:', { 
        type: selectedAnalysisType, 
        chars: text.length, 
        level: currentSession.level 
      });
      
      const res = await fetch("/api/analisi-tesi", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ 
          text: text.trim(),
          faculty: currentSession.faculty,
          thesis_topic: currentSession.thesis_topic,
          level: currentSession.level,
          analysis_type: selectedAnalysisType,
          session_id: currentSession.id,
          chunk_number: completedAnalysisTypes.length + 1,
          project_title: currentSession.project_title
        }),
      });

      if (!res.ok || !res.body) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Errore nella generazione dell'analisi.");
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
        // Aggiungi al tracking analisi completate
        setCompletedAnalysisTypes(prev => [...prev, selectedAnalysisType]);
        
        // Reset per prossima analisi
        setTimeout(() => {
          setText("");
          setResult("");
          setSelectedAnalysisType("");
          toast.success(
            `✅ Analisi "${getAnalysisName(selectedAnalysisType)}" completata! Continua con la prossima o finalizza il progetto.`,
            { duration: 7000, position: 'top-right' }
          );
        }, 2000);
      }

      console.log(`✅ Analisi ${selectedAnalysisType} completata`);

    } catch (err: any) {
      setError(`❌ Errore nella generazione: ${err.message}`);
      console.error('Errore elaborazione:', err);
      toast.error("❌ Errore durante l'elaborazione dell'analisi");
    } finally {
      setIsLoading(false);
    }
  };

  // 🎯 HELPER FUNCTIONS
  const getAnalysisName = (analysisType: string): string => {
    if (!level) return analysisType;
    const analysis = ANALYSIS_TYPES[level].find(a => a.key === analysisType);
    return analysis?.name || analysisType;
  };

  const getExpectedAnalysesCount = (sessionLevel: string): number => {
    switch (sessionLevel) {
      case 'triennale': return 8;
      case 'magistrale': return 12;
      case 'dottorato': return 16;
      default: return 0;
    }
  };

  // 🎨 PLACEHOLDER TEXT
  const placeholderText = currentSession && selectedAnalysisType 
    ? `Inserisci qui il materiale della tesi da sottoporre ad analisi "${getAnalysisName(selectedAnalysisType)}"...`
    : "Seleziona prima il tipo di analisi da eseguire...";

  // 📁 GESTIONE FILE
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      setError("⚠️ Nessun file selezionato.");
      return;
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
        toast.success("📖 Usa SmartPdfReader per selezionare le sezioni specifiche da analizzare!");
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

  // 🎨 FORMATTAZIONE TESTO
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
    setIsFormatted(true);
    toast.success("🎨 Testo formattato con successo!");
  };

  // 📥 ESPORTAZIONE RISULTATO
  const handleExport = async () => {
    if (!result.trim()) {
      toast.error("❌ Nessuna analisi da esportare");
      return;
    }

    if (!currentSession) {
      toast.error("❌ Nessun progetto attivo");
      return;
    }

    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({ 
              children: [new TextRun({ text: `Analisi Tesi MyUniAgent - ${currentSession.project_title}`, bold: true, size: 28 })] 
            }),
            new Paragraph({ text: "" }), // Spazio
            new Paragraph({ 
              children: [new TextRun({ text: `${currentSession.faculty} • ${currentSession.thesis_topic} • ${currentSession.level.toUpperCase()}`, italics: true })] 
            }),
            new Paragraph({ 
              children: [new TextRun({ text: `Analisi: ${getAnalysisName(selectedAnalysisType)}`, italics: true })] 
            }),
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
    const filename = `${currentSession.project_title.replace(/[^a-zA-Z0-9]/g, '_')}_${selectedAnalysisType}_MyUniAgent.docx`;
    saveAs(blob, filename);
    toast.success("📥 File DOCX esportato con successo!");
  };

  // 🎯 STATISTICHE TESTO
  const tokenService = new TokenEstimationService();
  
  const getTextStats = () => {
    if (!text.trim() || !currentSession) {
      return { 
        chars: text.length, 
        words: text.trim() ? text.trim().split(/\s+/).length : 0, 
        estimatedTokens: text.trim() ? Math.ceil(text.length / 4) : 0
      };
    }
    
    return tokenService.getDetailedStats(text, currentSession.faculty, currentSession.thesis_topic);
  };

  const stats = getTextStats();
  const isOverLimit = stats.chars > HARD_LIMIT;
  const isNearLimit = stats.chars > SOFT_WARNING;

  if (!userChecked) return <DashboardLayout><p>Caricamento...</p></DashboardLayout>;

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">🎓 Analisi Tesi Enterprise</h1>

      <div className="bg-gradient-to-br from-purple-50 to-blue-100 dark:from-purple-900 dark:to-blue-800 border-l-4 border-purple-500 text-purple-900 dark:text-purple-100 p-4 rounded-xl shadow-md mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="font-bold text-lg flex items-center gap-2 mb-2">
              🎓 AgenteFox - Esperto Relatore Universitario
            </h2>
            <p className="text-sm leading-relaxed">
              <strong>Analisi accademica professionale a 360°!</strong> Sistema enterprise per valutazione completa di tesi universitarie.
              <br />
              <strong>Triennale:</strong> 8 analisi • <strong>Magistrale:</strong> 12 analisi • <strong>Dottorato:</strong> 16 analisi specializzate
            </p>
          </div>
          <button 
            onClick={() => setShowGuide(true)}
            className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm transition-all flex items-center gap-2"
          >
            📖 Come funziona
          </button>
        </div>
      </div>

      {/* 🔄 SESSIONI ATTIVE */}
      {activeSessions.length > 0 && !currentSession && (
        <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900 dark:to-blue-900 rounded-xl border border-green-200 dark:border-green-700">
          <h3 className="font-semibold mb-3 text-green-900 dark:text-green-100 flex items-center gap-2">
            📊 Progetti di Analisi in Corso
          </h3>
          <div className="space-y-3">
            {activeSessions.map(session => (
              <div key={session.id} className="flex justify-between items-center p-3 bg-white dark:bg-gray-800 rounded-lg border border-green-200 dark:border-green-700">
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">{session.project_title}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {session.faculty} • {session.thesis_topic} • {session.level.toUpperCase()}
                  </div>
                  {session.stats && (
                    <div className="text-xs text-gray-500 dark:text-gray-500">
                      {session.stats.completed_analyses}/{session.stats.expected_analyses} analisi completate ({session.stats.completion_percentage}%)
                      {session.stats.is_stale && <span className="text-orange-600 ml-2">⚠️ Inattivo da {session.stats.days_since_last_activity} giorni</span>}
                    </div>
                  )}
                  <div className="text-xs text-gray-500 dark:text-gray-500">
                    Iniziato il {new Date(session.created_at).toLocaleDateString('it-IT')}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => resumeSession(session.id)}
                    className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm transition-all"
                  >
                    📚 Continua
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 🎯 SETUP NUOVO PROGETTO */}
      {!currentSession && (
        <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900 dark:to-blue-900 rounded-xl border border-purple-200 dark:border-purple-700">
          <h3 className="font-semibold mb-3 text-purple-900 dark:text-purple-100 flex items-center gap-2">
            🚀 Nuovo Progetto di Analisi Tesi
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                📚 Nome del progetto
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Es. Analisi Tesi - Blockchain nel Diritto Commerciale"
                className="w-full p-2 border rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-purple-500 transition-all"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  🏛️ Facoltà
                </label>
                <input
                  type="text"
                  value={faculty}
                  onChange={(e) => setFaculty(e.target.value)}
                  placeholder="Es. Giurisprudenza"
                  className="w-full p-2 border rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-purple-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  📘 Argomento della tesi
                </label>
                <input
                  type="text"
                  value={thesisTopic}
                  onChange={(e) => setThesisTopic(e.target.value)}
                  placeholder="Es. Blockchain e Smart Contracts"
                  className="w-full p-2 border rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-purple-500 transition-all"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  🎓 Livello di tesi
                </label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value as 'triennale' | 'magistrale' | 'dottorato')}
                  className="w-full p-2 border rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-purple-500 transition-all"
                >
                  <option value="">Seleziona livello</option>
                  <option value="triennale">📖 Triennale (8 analisi)</option>
                  <option value="magistrale">📚 Magistrale (12 analisi)</option>
                  <option value="dottorato">🎯 Dottorato (16 analisi)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  🔒 Visibilità
                </label>
                <div className="flex items-center space-x-4 pt-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="visibility"
                      checked={!isPublic}
                      onChange={() => setIsPublic(false)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">🔒 Privato</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="visibility"
                      checked={isPublic}
                      onChange={() => setIsPublic(true)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">🌐 Pubblico</span>
                  </label>
                </div>
              </div>
            </div>
            
            <button
              onClick={createNewSession}
              disabled={!projectName.trim() || !faculty.trim() || !thesisTopic.trim() || !level}
              className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all transform hover:scale-[1.02]"
            >
              🚀 Inizia Progetto di Analisi Tesi
            </button>
          </div>
        </div>
      )}

      {/* 📊 SESSION MANAGER (quando è attiva una sessione) */}
      {currentSession && (
        <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900 dark:to-blue-900 rounded-xl border border-green-200 dark:border-green-700">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="font-semibold text-green-900 dark:text-green-100 flex items-center gap-2">
                🎓 {currentSession.project_title}
              </h3>
              <p className="text-sm text-green-700 dark:text-green-300">
                {currentSession.faculty} • {currentSession.thesis_topic} • {currentSession.level.toUpperCase()}
              </p>
              <p className="text-xs text-green-600 dark:text-green-400">
                {completedAnalysisTypes.length}/{getExpectedAnalysesCount(currentSession.level)} analisi completate • Iniziato il {new Date(currentSession.created_at).toLocaleDateString('it-IT')}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowSessionManager(!showSessionManager)}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-all"
              >
                {showSessionManager ? '👁️ Nascondi' : '📊 Gestisci'} Progetto
              </button>
              <button
                onClick={finalizeProject}
                disabled={completedAnalysisTypes.length === 0}
                className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                ✅ Finalizza Progetto
              </button>
              <button
                onClick={abandonSession}
                className="px-3 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-all"
              >
                🗑️ Abbandona
              </button>
            </div>
          </div>
          
          {/* 📋 PROGRESS OVERVIEW */}
          {showSessionManager && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-green-200 dark:border-green-700 overflow-hidden">
              <div className="p-3 bg-green-100 dark:bg-green-800 border-b border-green-200 dark:border-green-700">
                <h4 className="font-medium text-green-900 dark:text-green-100">
                  📋 Analisi Completate ({completedAnalysisTypes.length}/{getExpectedAnalysesCount(currentSession.level)})
                </h4>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {ANALYSIS_TYPES[currentSession.level as keyof typeof ANALYSIS_TYPES].map((analysis) => (
                    <div 
                      key={analysis.key}
                      className={`p-2 rounded-lg border text-sm ${
                        completedAnalysisTypes.includes(analysis.key)
                          ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900 dark:border-green-700 dark:text-green-100'
                          : 'bg-gray-50 border-gray-200 text-gray-600 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300'
                      }`}
                    >
                      <div className="font-medium">
                        {completedAnalysisTypes.includes(analysis.key) ? '✅' : '⏳'} {analysis.name}
                      </div>
                      <div className="text-xs opacity-75">
                        {analysis.description}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {completedAnalysisTypes.length === 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg border border-blue-200 dark:border-blue-700 mt-4">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                🎯 <strong>Progetto pronto!</strong> Seleziona il tipo di analisi e carica il materiale della tesi nel form sottostante.
              </p>
            </div>
          )}
        </div>
      )}

      {/* 🎯 SELEZIONE TIPO DI ANALISI */}
      {currentSession && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            🎯 Tipo di analisi da eseguire
          </label>
          <select
            value={selectedAnalysisType}
            onChange={(e) => setSelectedAnalysisType(e.target.value)}
            className="w-full p-3 border rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-purple-500 transition-all"
          >
            <option value="">Seleziona il tipo di analisi</option>
            {ANALYSIS_TYPES[currentSession.level as keyof typeof ANALYSIS_TYPES]
              .filter(analysis => !completedAnalysisTypes.includes(analysis.key))
              .map((analysis) => (
                <option key={analysis.key} value={analysis.key}>
                  {analysis.name} - {analysis.description}
                </option>
              ))}
          </select>
          
          {selectedAnalysisType && (
            <div className="mt-2 p-3 bg-purple-50 dark:bg-purple-900/30 rounded-lg border border-purple-200 dark:border-purple-700">
              <div className="text-sm text-purple-800 dark:text-purple-200">
                📝 <strong>Analisi selezionata:</strong> {getAnalysisName(selectedAnalysisType)}
                <br />
                <span className="text-xs">
                  Questa analisi valuterà specificamente gli aspetti legati a "{getAnalysisName(selectedAnalysisType).toLowerCase()}" secondo gli standard accademici per il livello {currentSession.level}.
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ✏️ EDITOR TESTO */}
      <div className="mb-4">
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            ✏️ Materiale della tesi da analizzare
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
                         'border-gray-300 focus:ring-blue-500'}
                       ${!text.trim() ? 'text-gray-400' : ''}`}
            onInput={(e) => setText(e.currentTarget.innerText)}
            onFocus={(e) => {
              if (e.currentTarget.innerText === placeholderText) {
                e.currentTarget.innerText = '';
                e.currentTarget.classList.remove('text-gray-400');
              }
            }}
            onBlur={(e) => {
              if (!e.currentTarget.innerText.trim()) {
                e.currentTarget.innerText = placeholderText;
                e.currentTarget.classList.add('text-gray-400');
              }
            }}
          >
            {!text.trim() && (currentSession && selectedAnalysisType 
              ? `Inserisci qui il materiale della tesi da sottoporre ad analisi "${getAnalysisName(selectedAnalysisType)}"...`
              : "Seleziona prima il tipo di analisi da eseguire..."
            )}
          </div>

          <div className="flex justify-between items-center mt-2">
            <div className="text-xs space-y-1">
              <div className={`${isOverLimit ? 'text-red-600' : isNearLimit ? 'text-yellow-600' : 'text-gray-500'}`}>
                📊 {stats.chars.toLocaleString()} caratteri • {stats.words.toLocaleString()} parole • ~{stats.estimatedTokens.toLocaleString()} token
              </div>
              
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

          {/* 🚀 SUBMIT BUTTON */}
          <button
            onClick={handleAnalysisSubmit}
            disabled={!text || isLoading || !currentSession || !selectedAnalysisType || isOverLimit}
            className={`bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg mt-4 hover:from-purple-700 hover:to-blue-700 transition-all transform hover:scale-105 font-medium ${
              isLoading || !currentSession || !selectedAnalysisType || isOverLimit ? "opacity-50 cursor-not-allowed transform-none" : ""
            }`}
          >
            {isLoading ? (
              `🧠 Elaborando ${getAnalysisName(selectedAnalysisType)}...`
            ) : (
              selectedAnalysisType ? 
                `🚀 Esegui ${getAnalysisName(selectedAnalysisType)}` : 
                "🎯 Seleziona tipo di analisi"
            )}
          </button>
        </div>
      </div>

      {/* 📁 CARICAMENTO FILE */}
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
          📁 Carica materiale tesi (consigliato: PDF per SmartReader)
        </button>
        {caricamentoFile && (
          <div className="w-full mt-3 h-2 rounded bg-gray-200 dark:bg-gray-700 overflow-hidden">
            <div className="h-full bg-purple-500 dark:bg-purple-400 animate-pulse"></div>
          </div>
        )}
      </div>

      {/* 🧠 PROCESSING MESSAGE */}
      {isLoading && (
        <div className="mb-6 p-4 bg-purple-50 dark:bg-purple-900 rounded-lg border-l-4 border-purple-500">
          <div className="flex items-center">
            <div className="animate-spin mr-3 w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full"></div>
            <div>
              <h3 className="font-semibold text-purple-900 dark:text-purple-100">
                🧠 Analisi in corso con AgenteFox...
              </h3>
              <p className="text-sm text-purple-700 dark:text-purple-300">
                Sto eseguendo l'analisi "{getAnalysisName(selectedAnalysisType)}" per {currentSession?.faculty}.
                <br />
                <span className="text-xs">Progetto: {currentSession?.project_title} • Livello: {currentSession?.level}</span>
                <br />Il risultato apparirà in tempo reale.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 📄 RISULTATO ANALISI */}
      {result && (
        <div className="mb-6 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              📄 {selectedAnalysisType ? getAnalysisName(selectedAnalysisType) : 'Analisi'} Generata
              {isLoading && <div className="animate-spin w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full"></div>}
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
                className="text-sm bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700 transition-all"
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

      {/* ✅ COMPLETION NOTIFICATION */}
      {result && !isLoading && currentSession && (
        <div className="mt-6 p-4 bg-green-50 dark:bg-green-900 rounded-lg border-l-4 border-green-500">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-green-800 dark:text-green-200">
                ✅ Analisi "{getAnalysisName(selectedAnalysisType)}" completata con successo!
              </h3>
              <p className="text-sm text-green-700 dark:text-green-300">
                {stats.chars.toLocaleString()} caratteri processati • {result.length.toLocaleString()} caratteri generati • Ratio: {((result.length / stats.chars) * 100).toFixed(1)}%
              </p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                Progresso: {completedAnalysisTypes.length + 1}/{getExpectedAnalysesCount(currentSession.level)} analisi completate per "{currentSession.project_title}"
              </p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => {
                  setText("");
                  setResult("");
                  setSelectedAnalysisType("");
                  toast.success("✨ Pronto per la prossima analisi!");
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition text-sm"
              >
                ➕ Prossima Analisi
              </button>
              <button 
                onClick={finalizeProject}
                disabled={completedAnalysisTypes.length === 0}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition text-sm disabled:opacity-50"
              >
                ✅ Finalizza Progetto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ❌ ERROR MESSAGE */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 dark:bg-red-900 border-l-4 border-red-500 rounded">
          <p className="text-red-600 dark:text-red-400 font-medium">{error}</p>
        </div>
      )}

      {/* 📖 SMART PDF READER MODAL */}
      {selectedPdfFile && (
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

      {/* 📖 GUIDE MODAL */}
      <HITLTesiGuidaModal 
        isOpen={showGuide} 
        onClose={() => setShowGuide(false)} 
      />
    </DashboardLayout>
  );
}

AnalisiTesiPage.requireAuth = true;