import { useEffect, useState, useCallback, useMemo, lazy, Suspense } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "react-hot-toast";
import { ProjectCard } from '@/components/batch/ProjectCard';
import { ChunkItem } from '@/components/batch/ChunkItem';
import { BatchJobItem } from '@/components/batch/BatchJobItem';
import { ResultItem } from '@/components/batch/ResultItem';
const BatchProcessingModal = lazy(() => import('@/components/batch/BatchProcessingModal'));
const BatchDetailsModal = lazy(() => import('@/components/batch/BatchDetailsModal'));

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
  completed_chunks?: number;
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
  title: string;
  section?: string;
  char_count: number;
  order_index: number;
  status: 'in_attesa' | 'elaborazione' | 'completato' | 'fallito';
  input_tokens?: number;
  output_tokens?: number;
  cost_usd?: number;
  processing_time_ms?: number;
  error_message?: string;
  completed_at?: string;
  retry_count?: number;
  has_result?: boolean;
}

// 🏠 MAIN DASHBOARD COMPONENT
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);

  // 📋 UI STATES
  const [selectedChunks, setSelectedChunks] = useState<Set<string>>(new Set());
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showBatchDetails, setShowBatchDetails] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'chunks' | 'processing' | 'results'>('overview');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'created' | 'title' | 'chars'>('created');
  const [editingChunk, setEditingChunk] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<{ title: string; section: string; }>({ title: '', section: '' });
  // PAGINAZIONE + VIRTUAL SCROLLING
  const [projectsPage, setProjectsPage] = useState(0);
  const [hasMoreProjects, setHasMoreProjects] = useState(false);

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
const ITEMS_PER_PAGE = 6; // Carichiamo 6 progetti alla volta (puoi cambiare questo valore)

const loadProjects = useCallback(async (page: number) => {
  if (!user) return;

  try {
    setIsLoading(true);

    // Calcola il range per la query di Supabase
    const from = page * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

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
      .order('created_at', { ascending: false })
      .range(from, to); // <-- ESEGUIAMO LA PAGINAZIONE

    if (error) throw error;

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
        ready_chunks: chunks.filter((chunk: any) => chunk.status === 'pronto').length,
        completed_chunks: chunks.filter((chunk: any) => chunk.status === 'completato').length
      };
    }) || [];

    // Aggiunge i nuovi progetti a quelli esistenti invece di sostituirli
    setProjects(prev => page === 0 ? projectsWithStats : [...prev, ...projectsWithStats]);

    // Controlla se ci sono altre pagine da caricare
    setHasMoreProjects(projectsWithStats.length === ITEMS_PER_PAGE);

  } catch (error) {
    console.error('Errore caricamento progetti:', error);
    toast.error('❌ Errore nel caricamento dei progetti');
  } finally {
    setIsLoading(false);
  }
}, [user]);
  
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
      
      await loadBatchJobs(selectedProject.id);
      await loadChunks(selectedProject.id);
      
      setSelectedChunks(new Set());
      setShowBatchModal(false);
      setActiveTab('processing');

    } catch (error) {
      console.error('Errore batch processing:', error);
      toast.error('❌ Errore nell\'avvio del batch processing');
    } finally {
      setIsProcessing(false);
    }
  };

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
      
      await loadChunks(selectedProject.id);
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
      setProjectsPage(0); // Torna alla prima pagina
      setProjects([]);     // Svuota la lista progetti attuale
      await loadProjects(0); // Ricarica i progetti dall'inizio
      
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
    if (!confirm("Sei sicuro di voler finalizzare questo progetto? Verrà creato il documento unico con tutti i riassunti completati.")) {
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
      setProjectsPage(0); // Torna alla prima pagina
      setProjects([]);     // Svuota la lista progetti attuale
      await loadProjects(0); // Ricarica i progetti dall'inizio
      
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
    // Carica la prima pagina all'avvio
    setProjectsPage(0);
    setProjects([]); // Svuota i progetti prima di ricaricare
    loadProjects(0);
  }
}, [user, loadProjects]); // abbiamo rimosso setProjects

  // Load chunks when project selected
  useEffect(() => {
    if (selectedProject) {
      loadChunks(selectedProject.id);
      loadBatchJobs(selectedProject.id);
    }
  }, [selectedProject, loadChunks, loadBatchJobs]);

  // Filter and sort chunks
  const filteredChunks = useMemo(() => {
  return chunks
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
}, [chunks, filterStatus, sortBy]);

  const getStatusColor = (status: string) => {
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

  const getWorkflowStep = () => {
    if (!selectedProject || !chunks.length) return 0;
    
    const completedChunks = chunks.filter(c => c.status === 'completato').length;
    const totalChunks = chunks.length;
    
    if (selectedProject.status === 'completato') return 4;
    if (completedChunks > 0 && completedChunks === totalChunks) return 3;
    if (completedChunks > 0) return 2;
    if (chunks.some(c => c.status === 'pronto')) return 1;
    return 0;
  };

  if (!userChecked) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Caricamento dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // 🏠 PROJECTS OVERVIEW (when no project selected)
  if (!selectedProject) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto space-y-8">
          
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                📚 I Tuoi Progetti
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                Gestisci i tuoi progetti di riassunto con elaborazione bulk
              </p>
            </div>
            <button
              onClick={() => window.location.href = '/tools/riassunto'}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105 shadow-lg"
            >
              ✨ Nuovo Progetto
            </button>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-2xl p-6 border border-blue-200 dark:border-blue-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-600 dark:text-blue-400 text-sm font-medium mb-1">Progetti Totali</p>
                  <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">{projects.length}</p>
                </div>
                <div className="w-12 h-12 bg-blue-200 dark:bg-blue-700 rounded-xl flex items-center justify-center">
                  📋
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-2xl p-6 border border-green-200 dark:border-green-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-600 dark:text-green-400 text-sm font-medium mb-1">Completati</p>
                  <p className="text-3xl font-bold text-green-900 dark:text-green-100">
                    {projects.filter(p => p.status === 'completato').length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-200 dark:bg-green-700 rounded-xl flex items-center justify-center">
                  ✅
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-2xl p-6 border border-orange-200 dark:border-orange-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-600 dark:text-orange-400 text-sm font-medium mb-1">In Lavorazione</p>
                  <p className="text-3xl font-bold text-orange-900 dark:text-orange-100">
                    {projects.filter(p => p.status === 'attivo').length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-orange-200 dark:bg-orange-700 rounded-xl flex items-center justify-center">
                  🔄
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-2xl p-6 border border-purple-200 dark:border-purple-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-600 dark:text-purple-400 text-sm font-medium mb-1">Sezioni Totali</p>
                  <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">
                    {projects.reduce((sum, p) => sum + (p.chunks_count || 0), 0)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-200 dark:bg-purple-700 rounded-xl flex items-center justify-center">
                  📦
                </div>
              </div>
            </div>
          </div>

          {/* Projects Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 animate-pulse">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded mb-6"></div>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  </div>
                  <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-8xl mb-6">📚</div>
              <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Inizia il tuo primo progetto
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                Crea un nuovo progetto di riassunto per organizzare e elaborare i tuoi documenti con l'AI bulk processing.
              </p>
              <button
                onClick={() => window.location.href = '/tools/riassunto'}
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105 shadow-lg text-lg"
              >
                🚀 Crea il Primo Progetto
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onSelect={() => setSelectedProject(project)}
                    onDelete={() => deleteProject(project.id)}
                  />
                ))}
              </div>

              {/* Pulsante Carica Altri */}
              {hasMoreProjects && (
                <div className="text-center mt-8">
                  <button
                    onClick={() => {
                      const nextPage = projectsPage + 1;
                      setProjectsPage(nextPage);
                      loadProjects(nextPage);
                    }}
                    disabled={isLoading}
                    className="px-8 py-4 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl font-semibold border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-all disabled:opacity-50"
                  >
                    {isLoading ? '⏳ Caricamento...' : 'Carica Altri Progetti'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </DashboardLayout>
    );
  }

  // 🎯 PROJECT DETAIL VIEW
  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <button 
            onClick={() => setSelectedProject(null)}
            className="hover:text-blue-600 transition-colors"
          >
            📚 Progetti
          </button>
          <span>→</span>
          <span className="text-gray-900 dark:text-gray-100 font-medium">
            {selectedProject.project_title}
          </span>
        </div>

        {/* Project Header */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8">
          <div className="flex justify-between items-start mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  {selectedProject.project_title}
                </h1>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedProject.status)}`}>
                  {selectedProject.status === 'completato' ? '✅ Completato' : 
                   selectedProject.status === 'annullato' ? '❌ Annullato' : '🔄 Attivo'}
                </span>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                {selectedProject.facolta} • {selectedProject.materia}
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setSelectedProject(null)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              >
                ← Indietro
              </button>
              {selectedProject.status !== 'completato' && (
                <button
                  onClick={() => handleFinalizeProject(selectedProject.id)}
                  disabled={isFinalizing || chunks.every(c => c.status !== 'completato')}
                  className="px-6 py-3 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-xl font-semibold hover:from-green-700 hover:to-teal-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
                >
                  {isFinalizing ? '⏳ Finalizzazione...' : '🏆 Finalizza Progetto'}
                </button>
              )}
            </div>
          </div>

          {/* Workflow Progress */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Progresso del Workflow</h3>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Step {getWorkflowStep()}/4
              </span>
            </div>
            <div className="flex items-center gap-4">
              {[
                { step: 0, label: 'Import', icon: '📄', desc: 'Caricamento documenti' },
                { step: 1, label: 'Prepare', icon: '⚙️', desc: 'Preparazione sezioni' },
                { step: 2, label: 'Process', icon: '🚀', desc: 'Elaborazione AI' },
                { step: 3, label: 'Review', icon: '👁️', desc: 'Revisione risultati' },
                { step: 4, label: 'Finalize', icon: '🏆', desc: 'Documento finale' }
              ].map((item, index) => (
                <div key={item.step} className="flex-1">
                  <div className="flex items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                      getWorkflowStep() >= item.step 
                        ? 'bg-green-500 text-white' 
                        : getWorkflowStep() === item.step - 1
                          ? 'bg-blue-500 text-white animate-pulse'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                    }`}>
                      {item.icon}
                    </div>
                    {index < 4 && (
                      <div className={`flex-1 h-1 mx-2 ${
                        getWorkflowStep() > item.step ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
                      }`} />
                    )}
                  </div>
                  <div className="mt-2 text-center">
                    <div className="text-xs font-medium text-gray-900 dark:text-gray-100">{item.label}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-700">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                {chunks.length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Sezioni Totali</div>
            </div>
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-700">
              <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-1">
                {chunks.filter(c => c.status === 'completato').length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Elaborate</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-700">
              <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mb-1">
                {chunks.filter(c => c.status === 'pronto').length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Pronte</div>
            </div>
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-700">
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-1">
                {Math.round(chunks.reduce((sum, c) => sum + c.char_count, 0) / 1000)}k
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Caratteri</div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex">
              {[
                { id: 'overview', label: 'Panoramica', icon: '📊' },
                { id: 'chunks', label: 'Gestione Sezioni', icon: '📦' },
                { id: 'processing', label: 'Elaborazioni', icon: '⚡' },
                { id: 'results', label: 'Risultati', icon: '📋' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 px-6 py-4 text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* Project Summary */}
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                      📋 Riepilogo Progetto
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Data creazione:</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {new Date(selectedProject.created_at).toLocaleDateString('it-IT', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Stato:</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedProject.status)}`}>
                          {selectedProject.status}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Progresso:</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {chunks.length > 0 ? Math.round((chunks.filter(c => c.status === 'completato').length / chunks.length) * 100) : 0}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Recent Activity */}
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                      ⚡ Attività Recente
                    </h3>
                    <div className="space-y-3">
                      {batchJobs.slice(0, 3).map((job) => (
                        <div key={job.id} className="flex items-center justify-between p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              Batch Processing
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {job.processed_chunks}/{job.total_chunks} sezioni
                            </div>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                            {job.status}
                          </span>
                        </div>
                      ))}
                      {batchJobs.length === 0 && (
                        <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">
                          Nessuna elaborazione ancora avviata
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 rounded-xl p-6 border border-green-200 dark:border-green-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    🚀 Azioni Rapide
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                      onClick={() => setActiveTab('chunks')}
                      className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-all group"
                    >
                      <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">📦</div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">Gestisci Sezioni</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Modifica e organizza</div>
                    </button>
                    
                    <button
                      onClick={() => {
                        const readyChunks = chunks.filter(c => c.status === 'pronto').map(c => c.id);
                        if (readyChunks.length > 0) {
                          setSelectedChunks(new Set(readyChunks));
                          setShowBatchModal(true);
                        } else {
                          toast.error('❌ Nessuna sezione pronta per l\'elaborazione');
                        }
                      }}
                      disabled={chunks.filter(c => c.status === 'pronto').length === 0}
                      className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-600 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">⚡</div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">Elabora Bulk</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {chunks.filter(c => c.status === 'pronto').length} pronte
                      </div>
                    </button>

                    <button
                      onClick={() => setActiveTab('results')}
                      className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 transition-all group"
                    >
                      <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">📋</div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">Vedi Risultati</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {chunks.filter(c => c.status === 'completato').length} completate
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* CHUNKS TAB */}
            {activeTab === 'chunks' && (
              <div className="space-y-6">
                
                {/* Controls */}
                <div className="flex flex-wrap gap-4 items-center justify-between">
                  <div className="flex gap-3">
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
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
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="created">Data creazione</option>
                      <option value="title">Titolo</option>
                      <option value="chars">Caratteri</option>
                    </select>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const readyChunks = chunks.filter(c => c.status === 'pronto').map(c => c.id);
                        setSelectedChunks(new Set(readyChunks));
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium transition-all"
                    >
                      ✅ Seleziona Pronte
                    </button>
                    
                    <button
                      onClick={() => setShowBatchModal(true)}
                      disabled={selectedChunks.size === 0}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-all"
                    >
                      ⚡ Elabora ({selectedChunks.size})
                    </button>
                  </div>
                </div>

                {/* Bulk Actions */}
                {selectedChunks.size > 0 && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-blue-800 dark:text-blue-200 font-medium">
                        {selectedChunks.size} sezioni selezionate
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateChunkStatus(Array.from(selectedChunks), 'pronto')}
                          className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm transition-all"
                        >
                          ✅ Segna Pronte
                        </button>
                        <button
                          onClick={() => updateChunkStatus(Array.from(selectedChunks), 'bozza')}
                          className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm transition-all"
                        >
                          📝 Segna Bozze
                        </button>
                        <button
                          onClick={() => deleteChunks(Array.from(selectedChunks))}
                          className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm transition-all"
                        >
                          🗑️ Elimina
                        </button>
                        <button
                          onClick={() => setSelectedChunks(new Set())}
                          className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm transition-all"
                        >
                          ❌ Deseleziona
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Chunks List */}
                <div className="space-y-3">
                  {isLoadingChunks ? (
                    <div className="text-center py-12">
                      <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                      <p className="text-gray-600 dark:text-gray-400">Caricamento sezioni...</p>
                    </div>
                  ) : filteredChunks.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4">📦</div>
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        Nessuna sezione trovata
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-6">
                        {filterStatus !== 'all' 
                          ? `Nessuna sezione con stato "${filterStatus}"`
                          : 'Questo progetto non ha ancora sezioni'
                        }
                      </p>
                      {filterStatus !== 'all' && (
                        <button
                          onClick={() => setFilterStatus('all')}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
                        >
                          Mostra Tutte le Sezioni
                        </button>
                      )}
                    </div>
                  ) : (
                    filteredChunks.map((chunk) => (
                      <ChunkItem
                        key={chunk.id}
                        chunk={chunk}
                        isSelected={selectedChunks.has(chunk.id)}
                        isEditing={editingChunk === chunk.id}
                        editFormData={editFormData}
                        onToggleSelect={(id, checked) => {
                          const newSelected = new Set(selectedChunks);
                          if (checked) {
                            newSelected.add(id);
                          } else {
                            newSelected.delete(id);
                          }
                          setSelectedChunks(newSelected);
                        }}
                        onStartEditing={startEditing}
                        onCancelEditing={cancelEditing}
                        onSaveEditing={saveEditing}
                        onDelete={deleteSingleChunk}
                        onEditFormChange={(e) => setEditFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))}
                        getStatusColor={getStatusColor}
                      />
                    ))
                  )}
                </div>
              </div>
            )}

            {/* PROCESSING TAB */}
            {activeTab === 'processing' && (
              <div className="space-y-6">
                
                {/* Header with Refresh */}
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    ⚡ Elaborazioni Batch
                  </h3>
                  <button
                    onClick={async () => {
                      if (!selectedProject) return;
                      
                      const activeBatches = batchJobs.filter(job => 
                        ['in_coda', 'elaborazione', 'fallito'].includes(job.status)
                      );
                      
                      if (activeBatches.length === 0) {
                        loadBatchJobs(selectedProject.id);
                        loadChunks(selectedProject.id);
                        toast('🔄 Dati aggiornati');
                        return;
                      }
                      
                      toast('🔄 Controllo aggiornamenti da Groq...');
                      
                      try {
                        const { data: sessionData } = await supabase.auth.getSession();
                        const accessToken = sessionData.session?.access_token;
                        
                        for (const batch of activeBatches) {
                          const response = await fetch(`/api/batch/sync-groq/${batch.id}`, {
                            method: 'POST',
                            headers: { Authorization: `Bearer ${accessToken}` }
                          });
                          
                          if (response.ok) {
                            const result = await response.json();
                            console.log(`Batch ${batch.id}: ${result.message}`);
                          }
                        }
                        
                        await loadBatchJobs(selectedProject.id);
                        await loadChunks(selectedProject.id);
                        
                        toast.success('✅ Aggiornamenti completati!');
                        
                      } catch (error) {
                        console.error('Errore sync Groq:', error);
                        toast.error('❌ Errore durante il controllo');
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-all flex items-center gap-2"
                  >
                    🔄 Sincronizza
                  </button>
                </div>

                {/* Batch Jobs List */}
                {batchJobs.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">⚡</div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      Nessuna elaborazione avviata
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      Vai alla sezione "Gestione Sezioni" per avviare un'elaborazione bulk
                    </p>
                    <button
                      onClick={() => setActiveTab('chunks')}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
                    >
                      📦 Gestisci Sezioni
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {batchJobs.map((job) => (
                      <BatchJobItem
                        key={job.id}
                        job={job}
                        onSelect={(selectedJob) => {
                          setSelectedBatchJob(selectedJob);
                          loadBatchResults(selectedJob.id);
                          setShowBatchDetails(true);
                        }}
                        getStatusColor={getStatusColor}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* RESULTS TAB */}
            {activeTab === 'results' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    📋 Risultati Elaborazione
                  </h3>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {chunks.filter(c => c.status === 'completato').length} sezioni completate
                  </div>
                </div>

                {chunks.filter(c => c.status === 'completato').length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">📋</div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      Nessun risultato disponibile
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      Avvia un'elaborazione bulk per vedere i risultati qui
                    </p>
                    <button
                      onClick={() => setActiveTab('chunks')}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
                    >
                      🚀 Inizia Elaborazione
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {chunks
                      .filter(c => c.status === 'completato')
                      .sort((a, b) => a.order_index - b.order_index)
                      .map((chunk) => (
                        <ResultItem key={chunk.id} chunk={chunk} />
                      ))}
                  </div>
                )}

                {/* Finalize Project CTA */}
                {chunks.filter(c => c.status === 'completato').length > 0 && selectedProject.status !== 'completato' && (
                  <div className="bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 rounded-xl p-6 border border-green-200 dark:border-green-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                          🏆 Pronto per la finalizzazione
                        </h4>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">
                          Hai {chunks.filter(c => c.status === 'completato').length} sezioni elaborate. 
                          Crea il documento finale combinando tutti i riassunti.
                        </p>
                      </div>
                      <button
                        onClick={() => handleFinalizeProject(selectedProject.id)}
                        disabled={isFinalizing}
                        className="px-6 py-3 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-xl font-semibold hover:from-green-700 hover:to-teal-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
                      >
                        {isFinalizing ? '⏳ Finalizzazione...' : '🏆 Finalizza Progetto'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 🚀 BATCH PROCESSING MODAL */}
        <Suspense fallback={null}>
  {showBatchModal && (
    <BatchProcessingModal
      isOpen={showBatchModal}
      onClose={() => setShowBatchModal(false)}
      selectedChunks={selectedChunks}
      chunks={chunks}
      onStartProcessing={startBatchProcessing}
      isProcessing={isProcessing}
    />
  )}
  {showBatchDetails && (
    <BatchDetailsModal
      isOpen={showBatchDetails}
      onClose={() => setShowBatchDetails(false)}
      batchJob={selectedBatchJob}
      batchResults={batchResults}
      onLoadResults={loadBatchResults}
      getStatusColor={getStatusColor}
    />
  )}
</Suspense>
      </div>
    </DashboardLayout>
  );
}

DashboardBulkPage.requireAuth = true;