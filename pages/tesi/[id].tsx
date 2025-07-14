// File: pages/dashboard/tesi/[id].tsx
// Versione finale della dashboard, con il pulsante di avvio batch collegato all'API.

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "react-hot-toast";
import { PlusCircle, BookOpen, FileText, BarChart2, Zap, Edit3, Trash2 } from 'lucide-react';

const ThesisSmartPdfReaderBulk = dynamic(() => import("@/components/ThesisSmartPdfReaderBulk"), { ssr: false });

// =================================================================
// TYPESCRIPT INTERFACES
// =================================================================
interface ThesisProject {
  id: string;
  project_title: string;
  faculty: string;
  thesis_topic: string;
  level: 'triennale' | 'magistrale' | 'dottorato';
  status: 'active' | 'completed' | 'abandoned';
}

interface RawChunk {
  id: string;
  title: string;
  section: string | null;
  page_range: string | null;
  order_index: number;
  word_count: number;
  char_count: number;
  status: 'bozza' | 'pronto' | 'in_coda' | 'elaborazione' | 'completato' | 'errore';
  created_at: string;
}

interface ProjectStats {
    total_chunks: number;
    total_chars: number;
    total_words: number;
    status_breakdown: Record<string, number>;
}

// =================================================================
// ANALYSIS CONFIGURATION
// =================================================================
const ANALYSIS_CONFIG: Record<string, { key: string; name: string }[]> = {
  triennale: [
    { key: 'analisi_strutturale', name: 'Analisi Strutturale' },
    { key: 'analisi_metodologica', name: 'Analisi Metodologica' },
    { key: 'analisi_contenuti', name: 'Analisi dei Contenuti' },
    { key: 'analisi_bibliografica', name: 'Analisi Bibliografica' },
  ],
  magistrale: [
    { key: 'analisi_strutturale_avanzata', name: 'Strutturale Avanzata' },
    { key: 'analisi_metodologica_rigorosa', name: 'Metodologica Rigorosa' },
    { key: 'analisi_contenuti_specialistici', name: 'Contenuti Specialistici' },
    { key: 'analisi_critica_sintetica', name: 'Critica e Sintetica' },
    { key: 'analisi_bibliografica_completa', name: 'Bibliografica Completa' },
  ],
  dottorato: [
    { key: 'analisi_originalita_scientifica', name: 'Originalità Scientifica' },
    { key: 'analisi_metodologica_frontiera', name: 'Metodologica di Frontiera' },
    { key: 'analisi_impatto_scientifico', name: 'Impatto Scientifico' },
    { key: 'analisi_framework_teorico', name: 'Framework Teorico' },
    { key: 'analisi_stato_arte_internazionale', name: 'Stato dell\'Arte Internazionale' },
  ]
};

// =================================================================
// COMPONENT
// =================================================================
export default function ThesisProjectDashboardPage() {
  const router = useRouter();
  const { id: projectId } = router.query;

  const [project, setProject] = useState<ThesisProject | null>(null);
  const [rawChunks, setRawChunks] = useState<RawChunk[]>([]);
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedChunks, setSelectedChunks] = useState<Set<string>>(new Set());
  const [selectedAnalyses, setSelectedAnalyses] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [selectedPdfFile, setSelectedPdfFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchProjectData = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error("Utente non autenticato.");

      const response = await fetch(`/api/thesis-chunks/${id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        if (response.status === 404) throw new Error("Progetto non trovato o non autorizzato.");
        throw new Error("Errore nel caricamento dei dati del progetto.");
      }

      const data = await response.json();
      setProject(data.project);
      setRawChunks(data.chunks);
      setStats(data.stats);

    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (projectId && typeof projectId === 'string') {
      fetchProjectData(projectId);
    }
  }, [projectId, fetchProjectData]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === "application/pdf") {
      setSelectedPdfFile(file);
      setIsPdfModalOpen(true);
    } else {
      toast.error("Per favore, seleziona un file PDF.");
    }
    if(fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleChunkSaved = (newChunk: RawChunk) => {
    setRawChunks(prevChunks => [...prevChunks, newChunk].sort((a,b) => a.order_index - b.order_index));
    if(stats) {
        setStats(prevStats => ({
            ...prevStats!,
            total_chunks: prevStats!.total_chunks + 1,
            total_chars: prevStats!.total_chars + newChunk.char_count,
            total_words: prevStats!.total_words + newChunk.word_count,
            status_breakdown: {
                ...prevStats!.status_breakdown,
                bozza: (prevStats!.status_breakdown.bozza || 0) + 1
            }
        }));
    }
  };

  const handleAnalysisSelection = (analysisKey: string) => {
    const newSelection = new Set(selectedAnalyses);
    if (newSelection.has(analysisKey)) {
      newSelection.delete(analysisKey);
    } else {
      newSelection.add(analysisKey);
    }
    setSelectedAnalyses(newSelection);
  };
  
  const handleStartBatch = async () => {
    if (!projectId || selectedChunks.size === 0 || selectedAnalyses.size === 0) {
      toast.error("Seleziona almeno un materiale e un tipo di analisi.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error("Utente non autenticato.");

      const response = await fetch('/api/thesis-batch/queue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          projectId: projectId,
          chunkIds: Array.from(selectedChunks),
          analysisTypes: Array.from(selectedAnalyses),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Errore nell'avvio del batch.");
      }

      const result = await response.json();
      toast.success(result.message || "Batch messo in coda con successo!");

      setSelectedChunks(new Set());
      setSelectedAnalyses(new Set());
      // Qui si potrebbe implementare un refresh dei batch jobs in corso
      
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <DashboardLayout><div className="text-center p-8">Caricamento...</div></DashboardLayout>;
  if (error) return <DashboardLayout><div className="text-center p-8 text-red-500">{error}</div></DashboardLayout>;
  if (!project) return <DashboardLayout><p>Nessun progetto trovato.</p></DashboardLayout>;

  const isBatchButtonEnabled = selectedChunks.size > 0 && selectedAnalyses.size > 0 && !isSubmitting;
  
  return (
    <DashboardLayout>
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".pdf" className="hidden"/>
      <div className="space-y-8">
        <header className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{project.project_title}</h1>
              <div className="mt-2 flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                <span><BookOpen className="inline w-4 h-4 mr-1" /> {project.faculty}</span>
                <span className="capitalize px-2 py-1 bg-purple-100 text-purple-800 rounded-full">{project.level}</span>
              </div>
            </div>
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all">
              <PlusCircle className="w-5 h-5" />Aggiungi Materiale
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2"><FileText /> Materiali della Tesi ({rawChunks.length})</h2>
                     {selectedChunks.size > 0 && (
                       <div className="flex items-center gap-2">
                         <span className="text-sm text-gray-500">{selectedChunks.size} selezionati</span>
                         <button onClick={() => setSelectedChunks(new Set())} className="px-3 py-1 bg-gray-200 text-gray-700 rounded-lg text-xs hover:bg-gray-300">Deseleziona</button>
                       </div>
                     )}
                </div>
                <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-[60vh] overflow-y-auto">
                  {rawChunks.length > 0 ? (
                    rawChunks.map(chunk => (
                      <div key={chunk.id} className={`p-4 flex items-start gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${selectedChunks.has(chunk.id) ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}>
                        <input type="checkbox" className="mt-1.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" checked={selectedChunks.has(chunk.id)} onChange={() => { const newSelected = new Set(selectedChunks); if (newSelected.has(chunk.id)) {newSelected.delete(chunk.id)} else {newSelected.add(chunk.id)}; setSelectedChunks(newSelected); }}/>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-800 dark:text-gray-100">{chunk.title}</h3>
                          {chunk.section && <p className="text-sm text-gray-500 mt-1">Sezione: {chunk.section}</p>}
                          <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
                            <span>{chunk.char_count.toLocaleString()} caratteri</span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-gray-500">
                        <p>Nessun materiale caricato per questo progetto.</p>
                        <p className="text-sm mt-2">Usa il pulsante "Aggiungi Materiale" per iniziare.</p>
                    </div>
                  )}
                </div>
            </div>
          </div>
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2"><BarChart2 /> Tipi di Analisi</h2>
                </div>
                <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
                    {(ANALYSIS_CONFIG[project.level] || []).map(analysis => (
                        <label key={analysis.key} htmlFor={analysis.key} className={`p-3 flex items-center gap-3 rounded-lg border cursor-pointer transition-all ${selectedAnalyses.has(analysis.key) ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-400' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>
                            <input type="checkbox" id={analysis.key} checked={selectedAnalyses.has(analysis.key)} onChange={() => handleAnalysisSelection(analysis.key)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"/>
                            <span className="font-medium text-sm text-gray-800 dark:text-gray-100">{analysis.name}</span>
                        </label>
                    ))}
                </div>
            </div>
            <button 
              onClick={handleStartBatch} 
              disabled={!isBatchButtonEnabled} 
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all text-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Zap className="w-6 h-6" /> 
              {isSubmitting ? 'Invio in corso...' : `Avvia Analisi Batch (${selectedChunks.size * selectedAnalyses.size})`}
            </button>
          </div>
        </div>
      </div>
      {isPdfModalOpen && projectId && (
        <ThesisSmartPdfReaderBulk isOpen={isPdfModalOpen} onClose={() => setIsPdfModalOpen(false)} file={selectedPdfFile} projectId={projectId as string} onChunkSaved={handleChunkSaved}/>
      )}
    </DashboardLayout>
  );
}
