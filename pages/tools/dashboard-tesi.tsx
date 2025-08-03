import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "react-hot-toast";
import { useRouter } from 'next/router';
import Link from 'next/link';
import ChunkPreviewTesi from "@/components/ChunkPreviewTesi";
import AnalysisResultsSection from "@/components/AnalysisResultsSection";

// 🎯 ENTERPRISE TYPESCRIPT INTERFACES
interface SessionStats {
  completed_analyses: number;
  expected_analyses: number;
  completion_percentage: number;
  remaining_analyses: number;
  completed_analysis_types: string[];
  remaining_analysis_types: string[];
  days_since_creation: number;
  days_since_last_activity: number;
  is_stale: boolean;
}

interface ThesisProject {
  id: string;
  user_id: string;
  project_title: string;
  faculty: string;
  thesis_topic: string;
  level: 'triennale' | 'magistrale' | 'dottorato';
  status: 'active' | 'completed' | 'abandoned';
  is_public: boolean;
  created_at: string;
  completed_at: string | null;
  stats: SessionStats;
}

interface GlobalStats {
  total_active_sessions: number;
  total_completed_analyses: number;
  total_expected_analyses: number;
  average_completion_percentage: number;
  stale_sessions_count: number;
}

interface BatchJob {
  id: string;
  project_id: string;
  analysis_type: string;
  analysis_name: string;
  status: string;
  total_chunks: number;
  processed_chunks: number;
  progress_percentage: number;
  created_at: string;
  completed_at?: string;
  expires_at?: string;
  time_elapsed: string;
  project_details: {
    title: string;
    level: string;
    faculty: string;
  };
  groq_batch_id?: string;
}

interface BatchStats {
  total_jobs: number;
  active_jobs: number;
  completed_jobs: number;
  failed_jobs: number;
  analyses_created: number;
}

type FilterLevel = 'all' | 'triennale' | 'magistrale' | 'dottorato';
type FilterStatus = 'all' | 'active' | 'completed' | 'stale';
type SortOption = 'recent' | 'title' | 'progress' | 'faculty';

export default function DashboardTesiPage() {
  // 🎯 STATE MANAGEMENT ENTERPRISE
  const [projects, setProjects] = useState<ThesisProject[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<ThesisProject[]>([]);
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [userChecked, setUserChecked] = useState(false);
  
  // 🔍 FILTRI E RICERCA
  const [searchTerm, setSearchTerm] = useState("");
  const [filterLevel, setFilterLevel] = useState<FilterLevel>('all');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  
  // 🎨 UI STATE
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // 📋 CHUNK PREVIEW MODAL STATE
  const [isChunkModalOpen, setIsChunkModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ThesisProject | null>(null);

  // 📊 BATCH MONITORING STATE
const [activeTab, setActiveTab] = useState<'projects' | 'batch-jobs' | 'analysis-results'>('projects');
const [batchJobs, setBatchJobs] = useState<any[]>([]);
const [batchLoading, setBatchLoading] = useState(false);
const [batchStats, setBatchStats] = useState<any>(null);

// 🔍 FILTRI BATCH JOBS
const [batchSearchTerm, setBatchSearchTerm] = useState("");
const [batchProjectFilter, setBatchProjectFilter] = useState<string>('all');
const [batchStatusFilter, setBatchStatusFilter] = useState<string>('all');
const [batchSortBy, setBatchSortBy] = useState<string>('created_at');
const [batchSortOrder, setBatchSortOrder] = useState<'asc' | 'desc'>('desc');

// 🔍 FILTRO RICERCA LOCALE BATCH JOBS
const [filteredBatchJobs, setFilteredBatchJobs] = useState<any[]>([]);
  
  const router = useRouter();

  // 🔄 AUTH CHECK
  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.push("/auth");
        return;
      }
      setUserChecked(true);
    };
    checkUser();
  }, [router]);

  // 🔍 FILTRO RICERCA LOCALE BATCH JOBS
useEffect(() => {
  let filtered = batchJobs;
  
  if (batchSearchTerm.trim()) {
    const term = batchSearchTerm.toLowerCase();
    filtered = filtered.filter(job => 
      job.analysis_name.toLowerCase().includes(term) ||
      job.project_details.title.toLowerCase().includes(term)
    );
  }
  
  setFilteredBatchJobs(filtered);
}, [batchJobs, batchSearchTerm]);

  // 🔄 CARICA PROGETTI
  useEffect(() => {
    const loadProjects = async () => {
      if (!userChecked) return;
      
      setIsLoading(true);
      setError("");

      try {
        const { data } = await supabase.auth.getSession();
        const accessToken = data.session?.access_token;
        if (!accessToken) {
          setError("Sessione scaduta");
          return;
        }

        const response = await fetch('/api/thesis-sessions/active', {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        
        if (!response.ok) {
          throw new Error(`Errore HTTP ${response.status}`);
        }

        const { sessions, global_stats } = await response.json();
        setProjects(sessions);
        setGlobalStats(global_stats);
        
      } catch (error: any) {
        console.error('Errore caricamento progetti:', error);
        setError("Errore nel caricamento dei progetti");
        toast.error("❌ Errore nel caricamento dei progetti");
      } finally {
        setIsLoading(false);
      }
    };

    loadProjects();
  }, [userChecked]);

// 🔄 CARICA BATCH JOBS CON FILTRI
const loadBatchJobs = async () => {
  setBatchLoading(true);
  
  try {
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;
    if (!accessToken) return;

    // Costruisci query parameters
    const params = new URLSearchParams();
    if (batchProjectFilter !== 'all') params.append('project_id', batchProjectFilter);
    if (batchStatusFilter !== 'all') params.append('status', batchStatusFilter);
    params.append('sort_by', batchSortBy);
    params.append('sort_order', batchSortOrder);

    const response = await fetch(`/api/thesis-batch/user-jobs?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    
    if (response.ok) {
      const { jobs, summary } = await response.json();
      setBatchJobs(jobs || []);
      setBatchStats(summary);
    }
  } catch (error) {
    console.error('Errore caricamento batch jobs:', error);
    toast.error("❌ Errore caricamento batch jobs");
  } finally {
    setBatchLoading(false);
  }
};

// 🎨 HELPER FUNCTIONS PER BATCH JOBS
const getBatchStatusColor = (status: string) => {
  switch (status) {
    case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'in_progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'validating': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    case 'finalizing': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    case 'expired': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
    case 'cancelled': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    case 'pending':
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
  }
};

const getBatchStatusEmoji = (status: string) => {
  switch (status) {
    case 'completed': return '✅';
    case 'in_progress': return '⚡';
    case 'validating': return '🔍';
    case 'finalizing': return '🏁';
    case 'failed': return '❌';
    case 'expired': return '⏰';
    case 'cancelled': return '🚫';
    case 'pending':
    default: return '⏳';
  }
};

const getBatchStatusText = (status: string) => {
  switch (status) {
    case 'pending': return 'In Attesa';
    case 'validating': return 'Validazione';
    case 'in_progress': return 'In Corso';
    case 'finalizing': return 'Finalizzazione';
    case 'completed': return 'Completato';
    case 'failed': return 'Fallito';
    case 'expired': return 'Scaduto';
    case 'cancelled': return 'Cancellato';
    default: return status;
  }
};

// 🔄 AGGIORNA STATO BATCH JOB
const refreshBatchJob = async (batchJobId: string) => {
  try {
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;
    if (!accessToken) return;

    // Step 1: Controlla lo stato
    const statusResponse = await fetch(`/api/thesis-batch/status/${batchJobId}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    
    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      
      // Step 2: Se è completato ma non processato, processalo automaticamente
      if (statusData.status === 'completed' && !statusData.details?.results_processed) {
        toast.loading("🔄 Processing risultati batch job...", { id: 'processing' });
        
        const processResponse = await fetch(`/api/thesis-batch/process-results/${batchJobId}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        
        if (processResponse.ok) {
          const processedData = await processResponse.json();
          toast.success("✅ Risultati processati con successo!", { id: 'processing' });
          
          // Aggiorna con i dati processati
          setBatchJobs(prev => prev.map(job => 
            job.id === batchJobId ? { 
              ...job, 
              status: processedData.status,
              processed_chunks: processedData.results.processed_chunks,
              total_chunks: processedData.results.total_chunks,
              progress_percentage: 100,
              results_processed: true
            } : job
          ));
        } else {
          toast.error("❌ Errore processing risultati", { id: 'processing' });
        }
      } else {
        // Aggiorna normalmente con i dati dallo status
        setBatchJobs(prev => prev.map(job => 
          job.id === batchJobId ? { 
            ...job, 
            status: statusData.status,
            processed_chunks: statusData.progress.processed_chunks,
            total_chunks: statusData.progress.total_chunks,
            progress_percentage: statusData.progress.percentage,
            results_processed: statusData.details?.results_processed || false
          } : job
        ));
        
        toast.success("📊 Stato batch job aggiornato");
      }
    }
  } catch (error) {
    console.error('Errore aggiornamento batch job:', error);
    toast.error("❌ Errore aggiornamento stato");
  }
};

  // 🔄 APPLICA FILTRI E RICERCA
  useEffect(() => {
    let filtered = projects;

    // 🔍 Ricerca testuale
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(project => 
        project.project_title.toLowerCase().includes(term) ||
        project.faculty.toLowerCase().includes(term) ||
        project.thesis_topic.toLowerCase().includes(term)
      );
    }

    // 🎓 Filtro per livello
    if (filterLevel !== 'all') {
      filtered = filtered.filter(project => project.level === filterLevel);
    }

    // 📊 Filtro per status
    if (filterStatus !== 'all') {
      if (filterStatus === 'stale') {
        filtered = filtered.filter(project => project.stats.is_stale);
      } else {
        filtered = filtered.filter(project => project.status === filterStatus);
      }
    }

    // 📈 Ordinamento
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.project_title.localeCompare(b.project_title);
        case 'progress':
          return b.stats.completion_percentage - a.stats.completion_percentage;
        case 'faculty':
          return a.faculty.localeCompare(b.faculty);
        case 'recent':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    setFilteredProjects(filtered);
  }, [projects, searchTerm, filterLevel, filterStatus, sortBy]);

  // 🔄 RICARICA BATCH JOBS QUANDO CAMBIANO I FILTRI
useEffect(() => {
  if (activeTab === 'batch-jobs' && userChecked) {
    loadBatchJobs();
  }
}, [activeTab, userChecked, batchProjectFilter, batchStatusFilter, batchSortBy, batchSortOrder]);

  // 🔄 CARICA BATCH JOBS QUANDO SI CAMBIA TAB
useEffect(() => {
  if (activeTab === 'batch-jobs' && userChecked) {
    loadBatchJobs();
  }
}, [activeTab, userChecked]);

  // 🎨 HELPER FUNCTIONS
  const getLevelEmoji = (level: string) => {
    switch (level) {
      case 'triennale': return '📖';
      case 'magistrale': return '📚';
      case 'dottorato': return '🎯';
      default: return '📄';
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'triennale': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'magistrale': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'dottorato': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 50) return 'bg-yellow-500';
    if (percentage >= 25) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getStatusBadge = (project: ThesisProject) => {
    if (project.stats.is_stale) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
          ⚠️ Inattivo
        </span>
      );
    }
    
    if (project.stats.completion_percentage === 100) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          ✅ Completabile
        </span>
      );
    }
    
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
        🚀 In corso
      </span>
    );
  };

  // 🎯 NAVIGAZIONE
  const continueProject = (projectId: string) => {
    router.push(`/tools/analisi-tesi?resume=${projectId}`);
  };

  // 👁️ APRI MODAL DETTAGLI PROGETTO
  const openProjectDetails = (project: ThesisProject) => {
    setSelectedProject(project);
    setIsChunkModalOpen(true);
  };

  // 🔄 CHIUDI MODAL CHUNK
  const closeChunkModal = () => {
    setIsChunkModalOpen(false);
    setSelectedProject(null);
  };

  if (!userChecked || isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Caricamento progetti tesi...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* 🎯 HEADER CON TAB NAVIGATION */}
<div className="mb-8">
  <div className="flex justify-between items-start mb-6">
    <div>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
        🎓 Dashboard Progetti Tesi
      </h1>
      <p className="text-gray-600 dark:text-gray-400">
        Gestisci e monitora tutti i tuoi progetti di analisi tesi enterprise
      </p>
    </div>
    
    <div className="flex gap-3">
      <Link 
        href="/tools/analisi-tesi"
        className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all transform hover:scale-105 font-medium"
      >
        ➕ Nuovo Progetto
      </Link>
    </div>
  </div>

  {/* 📊 TAB NAVIGATION */}
  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-1 mb-6 inline-flex">
    <button
      onClick={() => setActiveTab('projects')}
      className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
        activeTab === 'projects'
          ? 'bg-purple-600 text-white shadow-lg'
          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700'
      }`}
    >
      📁 Progetti ({projects.length})
    </button>
    <button
      onClick={() => setActiveTab('batch-jobs')}
      className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
        activeTab === 'batch-jobs'
          ? 'bg-purple-600 text-white shadow-lg'
          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700'
      }`}
    >
      🚀 Batch Jobs ({batchJobs.length})
    </button>
    <button
      onClick={() => setActiveTab('analysis-results')}
      className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
        activeTab === 'analysis-results'
          ? 'bg-purple-600 text-white shadow-lg'
          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700'
      }`}
    >
      📊 Analisi Risultati
    </button>
  </div>

  {/* 📊 STATISTICHE CONDIZIONALI */}
  {activeTab === 'projects' && globalStats && (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 p-4 rounded-xl border border-blue-200 dark:border-blue-700">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Progetti Attivi</p>
            <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{globalStats.total_active_sessions}</p>
          </div>
          <div className="text-2xl">🚀</div>
        </div>
      </div>
      
      <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900 dark:to-green-800 p-4 rounded-xl border border-green-200 dark:border-green-700">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-green-700 dark:text-green-300">Analisi Completate</p>
            <p className="text-2xl font-bold text-green-900 dark:text-green-100">{globalStats.total_completed_analyses}</p>
          </div>
          <div className="text-2xl">✅</div>
        </div>
      </div>
      
      <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900 dark:to-purple-800 p-4 rounded-xl border border-purple-200 dark:border-purple-700">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Progresso Medio</p>
            <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{globalStats.average_completion_percentage}%</p>
          </div>
          <div className="text-2xl">📊</div>
        </div>
      </div>
      
      <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900 dark:to-orange-800 p-4 rounded-xl border border-orange-200 dark:border-orange-700">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-orange-700 dark:text-orange-300">Progetti Inattivi</p>
            <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">{globalStats.stale_sessions_count}</p>
          </div>
          <div className="text-2xl">⚠️</div>
        </div>
      </div>
    </div>
  )}

  {/* 📊 STATISTICHE BATCH JOBS */}
  {activeTab === 'batch-jobs' && batchStats && (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 p-4 rounded-xl border border-blue-200 dark:border-blue-700">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Job Totali</p>
            <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{batchStats.total_jobs}</p>
          </div>
          <div className="text-2xl">📊</div>
        </div>
      </div>
      
      <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900 dark:to-yellow-800 p-4 rounded-xl border border-yellow-200 dark:border-yellow-700">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-yellow-700 dark:text-yellow-300">Job Attivi</p>
            <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">{batchStats.active_jobs}</p>
          </div>
          <div className="text-2xl">⚡</div>
        </div>
      </div>
      
      <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900 dark:to-green-800 p-4 rounded-xl border border-green-200 dark:border-green-700">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-green-700 dark:text-green-300">Job Completati</p>
            <p className="text-2xl font-bold text-green-900 dark:text-green-100">{batchStats.completed_jobs}</p>
          </div>
          <div className="text-2xl">✅</div>
        </div>
      </div>
      
      <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900 dark:to-red-800 p-4 rounded-xl border border-red-200 dark:border-red-700">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-red-700 dark:text-red-300">Job Falliti</p>
            <p className="text-2xl font-bold text-red-900 dark:text-red-100">{batchStats.failed_jobs}</p>
          </div>
          <div className="text-2xl">❌</div>
        </div>
      </div>
      
      <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900 dark:to-purple-800 p-4 rounded-xl border border-purple-200 dark:border-purple-700">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Analisi Create</p>
            <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{batchStats.analyses_created}</p>
          </div>
          <div className="text-2xl">🎯</div>
        </div>
      </div>
    </div>
  )}
</div>

      {/* 📊 CONTENUTO CONDIZIONALE */}
{activeTab === 'projects' ? (
  // 📁 SEZIONE PROGETTI
  <>
    {/* 🔍 FILTRI E RICERCA PROGETTI */}
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* 🔍 Ricerca */}
        <div className="flex-1">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cerca per titolo, facoltà o argomento..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        {/* 🎓 Filtro Livello */}
        <select
          value={filterLevel}
          onChange={(e) => setFilterLevel(e.target.value as FilterLevel)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
        >
          <option value="all">Tutti i livelli</option>
          <option value="triennale">📖 Triennale</option>
          <option value="magistrale">📚 Magistrale</option>
          <option value="dottorato">🎯 Dottorato</option>
        </select>

        {/* 📊 Filtro Status */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
        >
          <option value="all">Tutti gli stati</option>
          <option value="active">🚀 Attivi</option>
          <option value="completed">✅ Completati</option>
          <option value="stale">⚠️ Inattivi</option>
        </select>

        {/* 📈 Ordinamento */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
        >
          <option value="recent">📅 Più recenti</option>
          <option value="title">🔤 Titolo A-Z</option>
          <option value="progress">📊 Progresso</option>
          <option value="faculty">🏛️ Facoltà</option>
        </select>

        {/* 👁️ Vista */}
        <div className="flex border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-2 text-sm transition-all ${
              viewMode === 'grid' 
                ? 'bg-purple-600 text-white' 
                : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            ⊞ Grid
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-2 text-sm transition-all ${
              viewMode === 'list' 
                ? 'bg-purple-600 text-white' 
                : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            ☰ Lista
          </button>
        </div>
      </div>

      {/* 📊 Risultati */}
      <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
        {filteredProjects.length === projects.length ? (
          `Visualizzando tutti i ${projects.length} progetti`
        ) : (
          `${filteredProjects.length} di ${projects.length} progetti`
        )}
      </div>
    </div>

    {/* ❌ ERROR STATE PROGETTI */}
    {error && (
      <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-xl p-4 mb-6">
        <p className="text-red-600 dark:text-red-400 font-medium">{error}</p>
      </div>
    )}

    {/* 📭 EMPTY STATE PROGETTI */}
    {!isLoading && filteredProjects.length === 0 && !error && (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🎓</div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          {projects.length === 0 ? 'Nessun progetto di tesi' : 'Nessun risultato'}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {projects.length === 0 
            ? 'Inizia il tuo primo progetto di analisi tesi per vedere i risultati qui.'
            : 'Prova a modificare i filtri per trovare quello che cerchi.'
          }
        </p>
        {projects.length === 0 && (
          <Link 
            href="/tools/analisi-tesi"
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all transform hover:scale-105 font-medium"
          >
            🚀 Inizia Primo Progetto
          </Link>
        )}
      </div>
    )}

    {/* 🎯 GRID PROGETTI */}
    {!isLoading && filteredProjects.length > 0 && (
      <div className={`${
        viewMode === 'grid' 
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' 
          : 'space-y-4'
      }`}>
        {filteredProjects.map((project) => (
          <div
            key={project.id}
            className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 transition-all duration-300 hover:shadow-lg ${
              viewMode === 'list' ? 'flex items-center p-4' : 'p-6'
            }`}
          >
            {viewMode === 'grid' ? (
              // 🎯 GRID VIEW
              <>
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getLevelEmoji(project.level)}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getLevelColor(project.level)}`}>
                      {project.level.charAt(0).toUpperCase() + project.level.slice(1)}
                    </span>
                  </div>
                  {getStatusBadge(project)}
                </div>

                {/* Title */}
                <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100 mb-2 line-clamp-2">
                  {project.project_title}
                </h3>

                {/* Details */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <span className="w-4 h-4 mr-2">🏛️</span>
                    <span className="truncate">{project.faculty}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <span className="w-4 h-4 mr-2">📘</span>
                    <span className="truncate">{project.thesis_topic}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <span className="w-4 h-4 mr-2">📅</span>
                    <span>{new Date(project.created_at).toLocaleDateString('it-IT')}</span>
                  </div>
                </div>

                {/* Progress */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Progresso Analisi
                    </span>
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                      {project.stats.completion_percentage}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(project.stats.completion_percentage)}`}
                      style={{ width: `${project.stats.completion_percentage}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {project.stats.completed_analyses}/{project.stats.expected_analyses} analisi
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => continueProject(project.id)}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all text-sm font-medium"
                  >
                    🚀 Continua
                  </button>
                  <button
                    onClick={() => openProjectDetails(project)}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all text-sm"
                  >
                    👁️ Dettagli
                  </button>
                </div>
              </>
            ) : (
              // 📋 LIST VIEW
              <>
                <div className="flex items-center gap-4 flex-1">
                  <div className="text-2xl">{getLevelEmoji(project.level)}</div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {project.project_title}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getLevelColor(project.level)}`}>
                        {project.level}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                      {project.faculty} • {project.thesis_topic}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                        {project.stats.completion_percentage}%
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {project.stats.completed_analyses}/{project.stats.expected_analyses}
                      </div>
                    </div>
                    
                    {getStatusBadge(project)}
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => continueProject(project.id)}
                        className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 transition-all text-sm"
                      >
                        🚀 Continua
                      </button>
                      <button
                        onClick={() => openProjectDetails(project)}
                        className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-all text-sm"
                      >
                        👁️
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    )}
  </>
) : activeTab === 'batch-jobs' ? (
  // 🚀 SEZIONE BATCH JOBS
  <>
    {/* 🔄 HEADER BATCH JOBS */}
    <div className="flex justify-between items-center mb-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Monitoraggio Batch Jobs
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Tutti i job di analisi batch in corso e completati
        </p>
      </div>
      
      <button
        onClick={loadBatchJobs}
        disabled={batchLoading}
        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-all flex items-center gap-2"
      >
        {batchLoading ? (
          <>
            <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
            Caricamento...
          </>
        ) : (
          <>
            🔄 Aggiorna
          </>
        )}
      </button>
    </div>


    {/* 🔍 FILTRI BATCH JOBS */}
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* 🔍 Ricerca */}
        <div className="flex-1">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={batchSearchTerm}
              onChange={(e) => setBatchSearchTerm(e.target.value)}
              placeholder="Cerca per nome analisi o progetto..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        {/* 📁 Filtro Progetto */}
        <select
          value={batchProjectFilter}
          onChange={(e) => setBatchProjectFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
        >
          <option value="all">Tutti i progetti</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.project_title}
            </option>
          ))}
        </select>

        {/* 📊 Filtro Status */}
        <select
          value={batchStatusFilter}
          onChange={(e) => setBatchStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
        >
          <option value="all">Tutti gli stati</option>
          <option value="pending">⏳ In Attesa</option>
          <option value="validating">🔍 Validazione</option>
          <option value="in_progress">⚡ In Corso</option>
          <option value="finalizing">🏁 Finalizzazione</option>
          <option value="completed">✅ Completato</option>
          <option value="failed">❌ Fallito</option>
          <option value="expired">⏰ Scaduto</option>
          <option value="cancelled">🚫 Cancellato</option>
        </select>

        {/* 📈 Ordinamento */}
        <select
          value={batchSortBy}
          onChange={(e) => setBatchSortBy(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
        >
          <option value="created_at">📅 Data creazione</option>
          <option value="completed_at">📅 Data completamento</option>
          <option value="status">📊 Stato</option>
          <option value="analysis_type">🎯 Tipo analisi</option>
        </select>

        {/* 🔄 Ordinamento ASC/DESC */}
        <button
          onClick={() => setBatchSortOrder(batchSortOrder === 'asc' ? 'desc' : 'asc')}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
          title={batchSortOrder === 'asc' ? 'Crescente' : 'Decrescente'}
        >
          {batchSortOrder === 'asc' ? '↑' : '↓'}
        </button>
      </div>

      {/* 📊 Risultati */}
      <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
        Visualizzando {filteredBatchJobs.length} batch job
        {batchProjectFilter !== 'all' && ` del progetto selezionato`}
        {batchStatusFilter !== 'all' && ` con stato "${batchStatusFilter}"`}
      </div>
    </div>

    {/* 📭 EMPTY STATE BATCH JOBS */}
    {!batchLoading && batchJobs.length === 0 && (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🚀</div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Nessun batch job trovato
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Avvia il tuo primo batch job dai dettagli dei progetti per vederlo qui.
        </p>
        <button
          onClick={() => setActiveTab('projects')}
          className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all transform hover:scale-105 font-medium"
        >
          📁 Vai ai Progetti
        </button>
      </div>
    )}

    {/* 🚀 LISTA BATCH JOBS */}
    {!batchLoading && batchJobs.length > 0 && (
      <div className="space-y-4">
        {filteredBatchJobs.map((job) => (
          <div
            key={job.id}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 transition-all duration-300 hover:shadow-lg p-6"
          >
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100 mb-1">
                  {job.analysis_name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Progetto: {job.project_details.title}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  {job.project_details.faculty} • {job.project_details.level.toUpperCase()}
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${getBatchStatusColor(job.status)}`}>
                  {getBatchStatusEmoji(job.status)} {getBatchStatusText(job.status)}
                </span>
                
                <button
                  onClick={() => refreshBatchJob(job.id)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title="Aggiorna stato"
                >
                  🔄
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Progresso Elaborazione
                </span>
                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  {job.progress_percentage}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div 
                  className={`h-3 rounded-full transition-all duration-300 ${
                    job.progress_percentage === 100 ? 'bg-green-500' :
                    job.progress_percentage >= 50 ? 'bg-blue-500' :
                    'bg-orange-500'
                  }`}
                  style={{ width: `${job.progress_percentage}%` }}
                ></div>
              </div>
              <div className="flex justify-between items-center mt-1">
  <span className="text-xs text-gray-500 dark:text-gray-400">
    {job.progress_percentage === 100 ? job.total_chunks : job.processed_chunks}/{job.total_chunks} chunk elaborati
  </span>
  <span className="text-xs text-gray-500 dark:text-gray-400">
    Tempo trascorso: {job.time_elapsed}
  </span>
</div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Creato:</span>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {new Date(job.created_at).toLocaleDateString('it-IT')}
                </p>
              </div>
              
              {job.completed_at && (
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Completato:</span>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {new Date(job.completed_at).toLocaleDateString('it-IT')}
                  </p>
                </div>
              )}
              
              {job.groq_batch_id && (
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Groq ID:</span>
                  <p className="font-mono text-xs text-gray-900 dark:text-gray-100 truncate">
                    {job.groq_batch_id}
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    )}

    {/* 🔄 LOADING STATE BATCH JOBS */}
    {batchLoading && (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 animate-pulse">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded mb-2 w-1/2"></div>
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded mb-1 w-3/4"></div>
                <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/3"></div>
              </div>
              <div className="w-20 h-6 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
            </div>
            <div className="mb-4">
              <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-full"></div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded"></div>
              <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded"></div>
              <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded"></div>
              <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    )}
  </>
) : (
  // 📊 SEZIONE ANALISI RISULTATI
  <AnalysisResultsSection 
    projects={projects}
    isLoading={isLoading}
  />
)}

      {/* 📋 CHUNK PREVIEW MODAL */}
      {selectedProject && (
        <ChunkPreviewTesi
          isOpen={isChunkModalOpen}
          onClose={closeChunkModal}
          project={selectedProject}
        />
      )}
    </DashboardLayout>
  );
}

DashboardTesiPage.requireAuth = true;