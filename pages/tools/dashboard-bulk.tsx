import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "react-hot-toast";
import { TokenEstimationService } from "@/lib/tokenEstimation";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@radix-ui/react-dialog';

// 🎯 TYPES
interface Project {
  id: string;
  project_title: string;
  facolta: string;
  materia: string;
  status: 'attivo' | 'annullato' | 'completato';
  created_at: string;
  chunks_count?: number;
  total_chars?: number;
  ready_chunks?: number;
}

interface Chunk {
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

interface BatchJob {
  id: string;
  status: 'in_coda' | 'elaborazione' | 'completato' | 'fallito' | 'annullato';
  total_chunks: number;
  processed_chunks: number;
  estimated_cost_usd: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  progress_percentage?: number;
}

interface BatchResult {
  id: string;
  raw_chunk_id: string;
  status: 'in_attesa' | 'elaborazione' | 'completato' | 'fallito';
  input_tokens?: number;
  output_tokens?: number;
  cost_usd?: number;
  processing_time_ms?: number;
  error_message?: string;
  completed_at?: string;
  chunk_title?: string;
}

export default function DashboardBulkPage() {
  // 🔐 AUTH STATE
  const [userChecked, setUserChecked] = useState(false);
  const [user, setUser] = useState<any>(null);

  // 📊 DATA STATES
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [batchJobs, setBatchJobs] = useState<BatchJob[]>([]);
  const [selectedBatchJob, setSelectedBatchJob] = useState<BatchJob | null>(null);
  const [batchResults, setBatchResults] = useState<BatchResult[]>([]);

  // 🔄 LOADING STATES
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingChunks, setIsLoadingChunks] = useState(false);
  const [isLoadingBatch, setIsLoadingBatch] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // 📋 UI STATES
  const [selectedChunks, setSelectedChunks] = useState<Set<string>>(new Set());
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showBatchDetails, setShowBatchDetails] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'created' | 'title' | 'chars'>('created');

  const [editingChunk, setEditingChunk] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<{ title: string; section: string; }>({ title: '', section: '' });
  const [isFinalizing, setIsFinalizing] = useState(false);

  // 🧮 TOKEN SERVICE
  const tokenService = new TokenEstimationService();

  // 🔐 AUTH CHECK
  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        window.location.href = "/auth";
        return;
      }
      setUser(data.user);
      setUserChecked(true);
    };
    checkUser();
  }, []);

  // 📊 LOAD PROJECTS
  const loadProjects = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);

      // Carica progetti con statistiche chunks
      const { data: projectsData, error } = await supabase
        .from('summary_sessions')
        .select(`
          id,
          project_title,
          facolta,
          materia,
          status,
          created_at,
          raw_chunks!inner(
            id,
            char_count,
            status
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Processa statistiche per ogni progetto
      const projectsWithStats: Project[] = projectsData?.map(project => {
        const chunks = project.raw_chunks || [];
        return {
          id: project.id,
          project_title: project.project_title,
          facolta: project.facolta,
          materia: project.materia,
          status: project.status,
          created_at: project.created_at,
          chunks_count: chunks.length,
          total_chars: chunks.reduce((sum: number, chunk: any) => sum + chunk.char_count, 0),
          ready_chunks: chunks.filter((chunk: any) => chunk.status === 'pronto').length
        };
      }) || [];

      setProjects(projectsWithStats);

    } catch (error) {
      console.error('Errore caricamento progetti:', error);
      toast.error('❌ Errore nel caricamento dei progetti');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // 📦 LOAD CHUNKS FOR PROJECT
  const loadChunks = useCallback(async (projectId: string) => {
    try {
      setIsLoadingChunks(true);
      
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      
      if (!accessToken) throw new Error('Non autenticato');

      const response = await fetch(`/api/chunks/${projectId}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (!response.ok) throw new Error('Errore caricamento chunks');

      const data = await response.json();
      setChunks(data.chunks || []);

    } catch (error) {
      console.error('Errore caricamento chunks:', error);
      toast.error('❌ Errore nel caricamento dei chunks');
    } finally {
      setIsLoadingChunks(false);
    }
  }, []);

  // ⚡ LOAD BATCH JOBS FOR PROJECT
  const loadBatchJobs = useCallback(async (projectId: string) => {
    try {
      const { data, error } = await supabase
        .from('batch_jobs')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const jobsWithProgress = data?.map(job => ({
        ...job,
        progress_percentage: job.total_chunks > 0 
          ? Math.round((job.processed_chunks / job.total_chunks) * 100)
          : 0
      })) || [];

      setBatchJobs(jobsWithProgress);

    } catch (error) {
      console.error('Errore caricamento batch jobs:', error);
      toast.error('❌ Errore nel caricamento dei batch jobs');
    }
  }, [user]);

  // 📄 LOAD BATCH RESULTS
  const loadBatchResults = useCallback(async (batchJobId: string) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      
      if (!accessToken) throw new Error('Non autenticato');

      const response = await fetch(`/api/batch/status/${batchJobId}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (!response.ok) throw new Error('Errore caricamento batch results');

      const data = await response.json();
      setBatchResults(data.chunks || []);

    } catch (error) {
      console.error('Errore caricamento batch results:', error);
      toast.error('❌ Errore nel caricamento dei risultati');
    }
  }, []);

  // 🚀 START BATCH PROCESSING
  const startBatchProcessing = async () => {
    if (!selectedProject || selectedChunks.size === 0) {
      toast.error('❌ Seleziona almeno un chunk per l\'elaborazione bulk');
      return;
    }

    try {
      setIsProcessing(true);
      
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      
      if (!accessToken) throw new Error('Non autenticato');

      const chunkIds = Array.from(selectedChunks);
      
      const response = await fetch('/api/batch/queue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          project_id: selectedProject.id,
          chunk_ids: chunkIds,
          processing_config: {
            temperature: 0.1,
            max_tokens_per_chunk: 4000
          }
        }),
      });

      if (!response.ok) throw new Error('Errore nell\'avvio del batch processing');

      const result = await response.json();
      
      toast.success(`🚀 Batch job avviato! ${chunkIds.length} chunks in elaborazione`);
      
      // Refresh data
      await loadBatchJobs(selectedProject.id);
      await loadChunks(selectedProject.id);
      
      setSelectedChunks(new Set());
      setShowBatchModal(false);

    } catch (error) {
      console.error('Errore batch processing:', error);
      toast.error('❌ Errore nell\'avvio del batch processing');
    } finally {
      setIsProcessing(false);
    }
  };

  // 🔄 UPDATE CHUNK STATUS
  const updateChunkStatus = async (chunkIds: string[], newStatus: string) => {
    if (!selectedProject) return;

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      
      if (!accessToken) throw new Error('Non autenticato');

      const response = await fetch(`/api/chunks/${selectedProject.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          chunk_ids: chunkIds,
          new_status: newStatus
        }),
      });

      if (!response.ok) throw new Error('Errore aggiornamento status');

      toast.success(`✅ Status aggiornato per ${chunkIds.length} chunks`);
      await loadChunks(selectedProject.id);

    } catch (error) {
      console.error('Errore aggiornamento status:', error);
      toast.error('❌ Errore nell\'aggiornamento dello status');
    }
  };

  const deleteChunks = async (chunkIds: string[]) => {
  if (!selectedProject) return;

  const chunksToDelete = chunks.filter(c => chunkIds.includes(c.id));
  const chunkTitles = chunksToDelete.map(c => c.title).join(', ');
  
  if (!confirm(`Sei sicuro di voler eliminare ${chunkIds.length} sezioni?\n\n${chunkTitles}\n\nQuesta azione non può essere annullata.`)) {
    return;
  }

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    
    if (!accessToken) throw new Error('Non autenticato');

    const response = await fetch('/api/chunks/manage', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        chunk_ids: chunkIds
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Errore eliminazione chunks');
    }

    toast.success(`✅ ${chunkIds.length} sezioni eliminate con successo`);
    
    // Refresh data
    await loadChunks(selectedProject.id);
    
    // Rimuovi dalle selezioni
    setSelectedChunks(new Set());

  } catch (error) {
    console.error('Errore eliminazione chunks:', error);
    toast.error('❌ Errore nell\'eliminazione delle sezioni');
  }
};

const updateChunk = async (chunkId: string, title: string, section: string) => {
  if (!selectedProject) return;

  if (!title.trim() || title.trim().length < 3) {
    toast.error('❌ Il titolo deve essere almeno 3 caratteri');
    return;
  }

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    
    if (!accessToken) throw new Error('Non autenticato');

    const response = await fetch('/api/chunks/manage', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        chunk_id: chunkId,
        title: title.trim(),
        section: section.trim() || null
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Errore aggiornamento chunk');
    }

    toast.success('✅ Sezione aggiornata con successo');
    await loadChunks(selectedProject.id);
    setEditingChunk(null);
    setEditFormData({ title: '', section: '' });

  } catch (error) {
    console.error('Errore aggiornamento chunk:', error);
    toast.error('❌ Errore nell\'aggiornamento della sezione');
  }
};

const startEditing = (chunk: Chunk) => {
  setEditingChunk(chunk.id);
  setEditFormData({
    title: chunk.title,
    section: chunk.section || ''
  });
};

const cancelEditing = () => {
  setEditingChunk(null);
  setEditFormData({ title: '', section: '' });
};

const saveEditing = async () => {
  if (!editingChunk) return;
  await updateChunk(editingChunk, editFormData.title, editFormData.section);
};

const deleteSingleChunk = async (chunkId: string) => {
  await deleteChunks([chunkId]);
};

  // 🗑️ DELETE PROJECT
  const deleteProject = async (projectId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo progetto? Tutti i chunks e i risultati verranno persi.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('summary_sessions')
        .delete()
        .eq('id', projectId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('🗑️ Progetto eliminato con successo');
      await loadProjects();
      
      if (selectedProject?.id === projectId) {
        setSelectedProject(null);
        setChunks([]);
        setBatchJobs([]);
      }

    } catch (error) {
      console.error('Errore eliminazione progetto:', error);
      toast.error('❌ Errore nell\'eliminazione del progetto');
    }
  };

  const handleFinalizeProject = async (projectId: string) => {
    if (!confirm("Sei sicuro di voler finalizzare questo progetto? Verrà creato il documento unico con tutti i riassunti e non potrà più essere modificato.")) {
      return;
    }

    setIsFinalizing(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error("Non autenticato");

      const response = await fetch('/api/project/finalize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ projectId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Errore sconosciuto durante la finalizzazione");
      }

      toast.success("🎉 Progetto finalizzato! Il riassunto completo è pronto.");
      
      // Ricarica i dati per riflettere il nuovo stato "completed" del progetto
      await loadProjects();
      
    } catch (error: any) {
      console.error("Errore finalizzazione:", error);
      toast.error(`❌ ${error.message}`);
    } finally {
      setIsFinalizing(false);
    }
  };

  // Load initial data
  useEffect(() => {
    if (user) {
      loadProjects();
    }
  }, [user, loadProjects]);

  // Load chunks when project selected
  useEffect(() => {
    if (selectedProject) {
      loadChunks(selectedProject.id);
      loadBatchJobs(selectedProject.id);
    }
  }, [selectedProject, loadChunks, loadBatchJobs]);

  // 🔄 AUTO-REFRESH for active batch jobs
  useEffect(() => {
    if (!selectedProject) return;

    const activeBatchJobs = batchJobs.filter(job => 
      ['in_coda', 'elaborazione'].includes(job.status)
    );

    if (activeBatchJobs.length === 0) return;

    const interval = setInterval(() => {
      loadBatchJobs(selectedProject.id);
      loadChunks(selectedProject.id);
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, [selectedProject, batchJobs, loadBatchJobs, loadChunks]);

  // Filter and sort chunks
  const filteredChunks = chunks
    .filter(chunk => filterStatus === 'all' || chunk.status === filterStatus)
    .sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'chars':
          return b.char_count - a.char_count;
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

  // Calculate batch estimates
  const selectedChunksData = chunks.filter(chunk => selectedChunks.has(chunk.id));
  const totalChars = selectedChunksData.reduce((sum, chunk) => sum + chunk.char_count, 0);
  const estimatedTokens = Math.ceil(totalChars / 4) * 1.5; // Stima con prompt overhead
  const estimatedCost = (estimatedTokens / 1000000) * 0.1; // $0.1 per 1M tokens (esempio)

  // Get status color
  const getStatusColor = (status: string) => {
    // RIGA 396-405: Sostituisci TUTTO il contenuto dell'oggetto colors:
const colors = {
  bozza: 'bg-gray-100 text-gray-800',
  pronto: 'bg-blue-100 text-blue-800', 
  in_coda: 'bg-yellow-100 text-yellow-800',
  elaborazione: 'bg-orange-100 text-orange-800',
  completato: 'bg-green-100 text-green-800',
  errore: 'bg-red-100 text-red-800',
  attivo: 'bg-green-100 text-green-800',
  annullato: 'bg-gray-100 text-gray-800',
  fallito: 'bg-red-100 text-red-800'
};
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  if (!userChecked) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">
          📚 Dashboard Bulk Processing
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* 📋 PROJECTS LIST */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    📋 I Tuoi Progetti
                  </h2>
                  <button
                    onClick={() => window.location.href = '/riassunto'}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm transition-all"
                  >
                    + Nuovo
                  </button>
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto">
                {isLoading ? (
                  <div className="p-6 text-center">
                    <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
                    <p className="text-sm text-gray-500 mt-2">Caricamento progetti...</p>
                  </div>
                ) : projects.length === 0 ? (
                  <div className="p-6 text-center">
                    <p className="text-gray-500 dark:text-gray-400">
                      📭 Nessun progetto bulk trovato
                    </p>
                    <button
                      onClick={() => window.location.href = '/riassunto'}
                      className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                    >
                      Crea il primo progetto
                    </button>
                  </div>
                ) : (
                  projects.map((project) => (
                    <div
                      key={project.id}
                      onClick={() => setSelectedProject(project)}
                      className={`p-4 border-b border-gray-200 dark:border-gray-700 cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-gray-700 ${
                        selectedProject?.id === project.id ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500' : ''
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium text-gray-900 dark:text-gray-100 line-clamp-2">
                          {project.project_title}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                          {project.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {project.facolta} • {project.materia}
                      </p>
                      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-500">
                        <span>{project.chunks_count || 0} chunks</span>
                        <span>{((project.total_chars || 0) / 1000).toFixed(1)}k chars</span>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-xs text-gray-400">
                          {new Date(project.created_at).toLocaleDateString('it-IT')}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteProject(project.id);
                          }}
                          className="text-red-500 hover:text-red-700 text-xs"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* 📦 PROJECT DETAILS */}
          <div className="lg:col-span-2">
            {selectedProject ? (
              <div className="space-y-6">
                
                {/* PROJECT HEADER */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                        {selectedProject.project_title}
                      </h2>
                      <p className="text-gray-600 dark:text-gray-400">
                        {selectedProject.facolta} • {selectedProject.materia}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedProject.status)}`}>
                      {selectedProject.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {chunks.length}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Chunks Totali</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {chunks.filter(c => c.status === 'pronto').length}
                      </div>
                     <div className="text-sm text-gray-600 dark:text-gray-400">Pronte</div>
                    </div>
                    <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {Math.round(chunks.reduce((sum, c) => sum + c.char_count, 0) / 1000)}k
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Caratteri</div>
                    </div>
                  </div>
                </div>

                {/* 🏆 BOTTONE DI FINALIZZAZIONE */}
                  <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => handleFinalizeProject(selectedProject.id)}
                      disabled={
                        isFinalizing ||
                        selectedProject.status === 'completato' ||
                        chunks.every(c => c.status !== 'completato')
                      }
                      className="w-full px-4 py-3 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg font-medium text-lg hover:from-green-700 hover:to-teal-700 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      {isFinalizing
                        ? '⏳ Finalizzazione in corso...'
                        : selectedProject.status === 'completato'
                          ? '✅ Progetto Finalizzato'
                          : '🏆 Crea Riassunto Finale'}
                    </button>

                    {/* Messaggio di aiuto se il bottone è disabilitato */}
                    {(selectedProject.status !== 'completato' && chunks.every(c => c.status !== 'completato')) && (
                        <p className="text-center text-xs text-gray-500 mt-2">
                            Devi prima elaborare almeno un chunk per poter finalizzare il progetto.
                        </p>
                    )}
                  </div>

                {/* BATCH JOBS STATUS */}
                {batchJobs.length > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                      ⚡ Elaborazioni Chunk
                    </h3>
                    <div className="space-y-3">
                      {batchJobs.slice(0, 3).map((job) => (
                        <div
                          key={job.id}
                          onClick={() => {
                            setSelectedBatchJob(job);
                            loadBatchResults(job.id);
                            setShowBatchDetails(true);
                          }}
                          className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                        >
                          <div className="flex justify-between items-center mb-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                              {job.status}
                            </span>
                            <span className="text-sm text-gray-500">
                              {new Date(job.created_at).toLocaleDateString('it-IT')}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
    {job.processed_chunks}/{job.total_chunks} chunks
  </span>
  <span className="text-xs text-gray-400">
    ID: {job.id.slice(-8)}
  </span>
</div>
                          {job.status === 'elaborazione' && (
                            <div className="mt-2">
                              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${job.progress_percentage}%` }}
                                ></div>
                              </div>
                              <span className="text-xs text-gray-500 mt-1">
                                {job.progress_percentage}% completato
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* CHUNKS MANAGEMENT */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                  <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        📦 Gestione Chunks
                      </h3>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowBatchModal(true)}
                          disabled={selectedChunks.size === 0}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-all"
                        >
                          ⚡ Elaborazione Chunk ({selectedChunks.size})
                        </button>
                      </div>
                    </div>

                    {/* FILTERS AND ACTIONS */}
                    <div className="flex flex-wrap gap-3 mb-4">
                      <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      >
                        <option value="all">Tutti gli stati</option>
                        <option value="bozza">Bozza</option>
<option value="pronto">Pronto</option>
<option value="in_coda">In Coda</option>
<option value="elaborazione">Elaborazione</option>
<option value="completato">Completato</option>
<option value="errore">Errore</option>
                      </select>

                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      >
                        <option value="created">Data creazione</option>
                        <option value="title">Titolo</option>
                        <option value="chars">Caratteri</option>
                      </select>

                      {selectedChunks.size > 0 && (
  <div className="flex gap-2">
    <button
      onClick={() => updateChunkStatus(Array.from(selectedChunks), 'pronto')}
      className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
    >
      ✅ Segna Pronte
    </button>
    <button
      onClick={() => updateChunkStatus(Array.from(selectedChunks), 'bozza')}
      className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
    >
      📝 Segna Bozze
    </button>
    <button
      onClick={() => deleteChunks(Array.from(selectedChunks))}
      className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
    >
      🗑️ Elimina ({selectedChunks.size})
    </button>
    <button
      onClick={() => setSelectedChunks(new Set())}
      className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
    >
      ❌ Deseleziona Tutto
    </button>
  </div>
)}

                      <div className="flex gap-2 ml-auto">
                        <button
                          onClick={() => {
                            const readyChunks = chunks.filter(c => c.status === 'pronto').map(c => c.id);
                            setSelectedChunks(new Set(readyChunks));
                          }}
                          className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                        >
                          ✅ Seleziona Tutti i Pronti
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* CHUNKS LIST */}
                  <div className="max-h-96 overflow-y-auto">
                    {isLoadingChunks ? (
                      <div className="p-6 text-center">
                        <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
                        <p className="text-sm text-gray-500 mt-2">Caricamento chunks...</p>
                      </div>
                    ) : filteredChunks.length === 0 ? (
                      <div className="p-6 text-center">
                        <p className="text-gray-500 dark:text-gray-400">
                          📭 Nessuna sezione trovata per questo progetto
                        </p>
                        <button
                          onClick={() => window.location.href = '/riassunto'}
                          className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                        >
                          Aggiungi sezioni
                        </button>
                      </div>
                    ) : (
                      filteredChunks.map((chunk) => (
                        <div
                          key={chunk.id}
                          className={`group p-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all ${
                            selectedChunks.has(chunk.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={selectedChunks.has(chunk.id)}
                              onChange={(e) => {
                                const newSelected = new Set(selectedChunks);
                                if (e.target.checked) {
                                  newSelected.add(chunk.id);
                                } else {
                                  newSelected.delete(chunk.id);
                                }
                                setSelectedChunks(newSelected);
                              }}
                              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                            />
                            
                            <div className="flex-1">
  {editingChunk === chunk.id ? (
    // 📝 EDIT MODE
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={editFormData.title}
          onChange={(e) => setEditFormData(prev => ({ ...prev, title: e.target.value }))}
          className="flex-1 px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600"
          placeholder="Titolo sezione..."
          autoFocus
        />
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(chunk.status)}`}>
          {chunk.status}
        </span>
      </div>
      
      <input
        type="text"
        value={editFormData.section}
        onChange={(e) => setEditFormData(prev => ({ ...prev, section: e.target.value }))}
        className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600"
        placeholder="Sezione (opzionale)..."
      />
      
      <div className="flex gap-2">
        <button
          onClick={saveEditing}
          disabled={!editFormData.title.trim() || editFormData.title.trim().length < 3}
          className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 disabled:opacity-50"
        >
          ✅ Salva
        </button>
        <button
          onClick={cancelEditing}
          className="px-3 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-700"
        >
          ❌ Annulla
        </button>
      </div>
    </div>
  ) : (
    // 👁️ VIEW MODE
    <div>
      <div className="flex justify-between items-start mb-2">
        <h4 
          className="font-medium text-gray-900 dark:text-gray-100 line-clamp-1 cursor-pointer hover:text-blue-600 transition-colors"
          onClick={() => startEditing(chunk)}
          title="Clicca per modificare"
        >
          {chunk.title}
        </h4>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(chunk.status)}`}>
          {chunk.status}
        </span>
      </div>
      
      {chunk.section ? (
        <p 
          className="text-sm text-gray-600 dark:text-gray-400 mb-1 cursor-pointer hover:text-blue-600 transition-colors"
          onClick={() => startEditing(chunk)}
          title="Clicca per modificare"
        >
          📚 {chunk.section}
        </p>
      ) : (
        <p 
          className="text-sm text-gray-400 mb-1 cursor-pointer hover:text-blue-600 transition-colors italic"
          onClick={() => startEditing(chunk)}
          title="Clicca per aggiungere sezione"
        >
          📚 Aggiungi sezione...
        </p>
      )}
    </div>
  )}
  
  <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-500">
    <div className="flex gap-4">
      <span>{chunk.char_count.toLocaleString()} caratteri</span>
      <span>{chunk.word_count.toLocaleString()} parole</span>
      {chunk.page_range && <span>📄 {chunk.page_range}</span>}
    </div>
    <span>#{chunk.order_index}</span>
  </div>
  
  <div className="flex justify-between items-center mt-2">
    <span className="text-xs text-gray-400">
      {new Date(chunk.created_at).toLocaleDateString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })}
    </span>
    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
      <button
        onClick={(e) => {
          e.stopPropagation();
          startEditing(chunk);
        }}
        className="text-blue-500 hover:text-blue-700 text-xs"
      >
        ✏️ Modifica
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          deleteSingleChunk(chunk.id);
        }}
        className="text-red-500 hover:text-red-700 text-xs"
      >
        🗑️ Elimina
      </button>
    </div>
  </div>
</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
                <div className="text-6xl mb-4">📚</div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Seleziona un Progetto
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Scegli un progetto dalla lista a sinistra per visualizzare e gestire i suoi chunks.
                </p>
                <button
                  onClick={() => window.location.href = '/riassunto'}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
                >
                  Crea Nuovo Progetto
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 🚀 BATCH PROCESSING MODAL */}
        <Dialog open={showBatchModal} onOpenChange={setShowBatchModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogTitle className="text-xl font-semibold text-gray-900 mb-4">
              ⚡ Avvia Elaborazione Lotti
            </DialogTitle>
            <DialogDescription className="text-gray-600 mb-6">
  Confermi di voler avviare l'elaborazione in lotti per le <strong>{selectedChunks.size}</strong> sezioni selezionate? L'operazione verrà eseguita in background.
</DialogDescription>

            {/* BATCH PREVIEW */}
            

            {/* ACTION BUTTONS */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowBatchModal(false)}
                className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
              >
                Annulla
              </button>
              <button
                onClick={startBatchProcessing}
                disabled={isProcessing || selectedChunks.size === 0}
                className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isProcessing ? '⏳ Avviando...' : `🚀 Avvia Elaborazione (${selectedChunks.size} chunks)`}
              </button>
            </div>
          </DialogContent>
        </Dialog>

        {/* 📊 BATCH DETAILS MODAL */}
        <Dialog open={showBatchDetails} onOpenChange={setShowBatchDetails}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogTitle className="text-xl font-semibold text-gray-900 mb-4">
              📊 Dettagli Elaborazione Chunk
            </DialogTitle>

            {selectedBatchJob && (
              <div className="space-y-6">
                {/* JOB OVERVIEW */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
                    <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                      {selectedBatchJob.processed_chunks}/{selectedBatchJob.total_chunks}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Sezioni</div>
                  </div>
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                    <div className="text-xl font-bold text-green-600 dark:text-green-400">
                      {selectedBatchJob.progress_percentage || 0}%
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Progresso</div>
                  </div>
                  <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-center">
                    <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
                      ${selectedBatchJob.estimated_cost_usd.toFixed(4)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Costo Stimato</div>
                  </div>
                  <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-center">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedBatchJob.status)}`}>
                      {selectedBatchJob.status === 'in_coda' ? 'In Coda' :
 selectedBatchJob.status === 'elaborazione' ? 'Elaborazione' :
 selectedBatchJob.status === 'completato' ? 'Completato' :
 selectedBatchJob.status === 'fallito' ? 'Fallito' :
 selectedBatchJob.status === 'annullato' ? 'Annullato' :
 selectedBatchJob.status}
                    </span>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Stato</div>
                  </div>
                </div>

                {/* PROGRESS BAR */}
                {selectedBatchJob.status === 'elaborazione' && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        Elaborazione in corso...
                      </span>
                      <span className="text-sm text-blue-700 dark:text-blue-300">
                        {selectedBatchJob.progress_percentage}%
                      </span>
                    </div>
                    <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-3">
                      <div 
                        className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${selectedBatchJob.progress_percentage}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* RESULTS TABLE */}
                <div className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
  <div className="p-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
    <h4 className="font-medium text-gray-900 dark:text-gray-100">
      📄 Risultati per Sezione
    </h4>
  </div>

  {/* Mostra l'errore se il lotto è fallito */}
  {selectedBatchJob.status === 'fallito' ? (
    <div className="p-4 bg-red-50 dark:bg-red-900/20">
      <h5 className="font-semibold text-red-800 dark:text-red-200">Lotto Fallito</h5>
      <p className="text-sm text-red-700 dark:text-red-300 mt-1">
        L'elaborazione non è stata avviata. Causa probabile: il piano attuale non supporta la modalità batch.
      </p>
    </div>
  ) : batchResults.length === 0 && selectedBatchJob.status !== 'elaborazione' ? (
     <div className="p-6 text-center text-gray-500 dark:text-gray-400">Nessun risultato da mostrare.</div>
  ) : (
                    <div className="max-h-96 overflow-y-auto">
                      {batchResults.map((result, index) => (
                        <div key={result.id} className="p-4 border-b border-gray-200 dark:border-gray-600 last:border-b-0">
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                              {index + 1}. {result.chunk_title || `Sezione ${result.raw_chunk_id.slice(-8)}`}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(result.status)}`}>
                              {result.status === 'in_attesa' ? 'In Attesa' :
 result.status === 'elaborazione' ? 'Elaborazione' :
 result.status === 'completato' ? 'Completato' :
 result.status === 'fallito' ? 'Fallito' :
 result.status}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-500 dark:text-gray-400">
                            {result.input_tokens && (
                              <div>
                                <span className="font-medium">Input:</span> {result.input_tokens.toLocaleString()} tokens
                              </div>
                            )}
                            {result.output_tokens && (
                              <div>
                                <span className="font-medium">Output:</span> {result.output_tokens.toLocaleString()} tokens
                              </div>
                            )}
                            {result.cost_usd && (
                              <div>
                                <span className="font-medium">Costo:</span> ${result.cost_usd.toFixed(6)}
                              </div>
                            )}
                            {result.processing_time_ms && (
                              <div>
                                <span className="font-medium">Tempo:</span> {(result.processing_time_ms / 1000).toFixed(1)}s
                              </div>
                            )}
                          </div>
                          
                          {result.error_message && (
                            <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded text-xs text-red-800 dark:text-red-200">
                              <strong>Errore:</strong> {result.error_message}
                            </div>
                          )}
                          
                          {result.completed_at && (
                            <div className="mt-2 text-xs text-gray-400">
                              Completato: {new Date(result.completed_at).toLocaleString('it-IT')}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* JOB ACTIONS */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowBatchDetails(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                  >
                    Chiudi
                  </button>
                  {selectedBatchJob.status === 'completato' && (
                    <button
                      onClick={() => {
                        // TODO: Navigate to results view
                        toast('🚧 Visualizzazione risultati in sviluppo');
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
                    >
                      📄 Visualizza Riassunti
                    </button>
                  )}
                  {['fallito', 'completato'].includes(selectedBatchJob.status) && (
                    <button
                      onClick={() => {
                        // TODO: Implement retry failed chunks
                        toast('🚧 Riprova sezioni fallite in sviluppo');
                      }}
                      className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-all"
                    >
                      🔄 Riprova Fallite
                    </button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

DashboardBulkPage.requireAuth = true;