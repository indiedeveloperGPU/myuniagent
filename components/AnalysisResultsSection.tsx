import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { useOptimizedAnalyses } from "@/lib/hooks/useOptimizedAnalyses";
import AnalysisDetailModal from "./AnalysisDetailModal";

// 🎯 ENTERPRISE TYPESCRIPT INTERFACES
interface ThesisProject {
  id: string;
  project_title: string;
  faculty: string;
  thesis_topic: string;
  level: 'triennale' | 'magistrale' | 'dottorato';
  status: 'active' | 'completed' | 'abandoned';
}

interface ThesisAnalysisResult {
  id: string;
  session_id: string;
  chunk_number: number;
  analysis_type: string;
  analysis_name: string;
  input_text: string;
  output_analysis: string;
  created_at: string;
  processing_metadata: any;
  batch_job_id?: string;
  input_preview: string;
  output_preview: string;
  project_details: {
    title: string;
    level: string;
    faculty: string;
  };
}

interface AnalysisResultsSectionProps {
  projects: ThesisProject[];
  isLoading: boolean;
}

export default function AnalysisResultsSection({ 
  projects, 
  isLoading: projectsLoading 
}: AnalysisResultsSectionProps) {
  // 🎯 STATE MANAGEMENT
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedAnalysis, setSelectedAnalysis] = useState<ThesisAnalysisResult | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [availableAnalysisTypes, setAvailableAnalysisTypes] = useState<string[]>([]);

  // 🚀 HOOK OTTIMIZZATO - Solo se progetto selezionato
  const {
    analyses,
    isLoading,
    error,
    hasMore,
    totalCount,
    searchTerm,
    setSearchTerm,
    analysisTypeFilter,
    setAnalysisTypeFilter,
    batchJobFilter,
    setBatchJobFilter,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    loadMore,
    refresh,
    loadAnalysisDetail,
    getAvailableAnalysisTypes
  } = useOptimizedAnalyses({ 
    projectId: selectedProjectId,
    initialLimit: 15 
  });

  // 🔄 Reset quando cambia progetto
  useEffect(() => {
    if (selectedProjectId) {
      setSearchTerm("");
      setAnalysisTypeFilter("all");
      setBatchJobFilter("all");
    }
  }, [selectedProjectId, setSearchTerm, setAnalysisTypeFilter, setBatchJobFilter]);

  // 🎯 Carica tipi analisi disponibili quando cambia progetto
  useEffect(() => {
    if (selectedProjectId) {
      getAvailableAnalysisTypes().then(types => {
        setAvailableAnalysisTypes(types);
      });
    } else {
      setAvailableAnalysisTypes([]);
    }
  }, [selectedProjectId, getAvailableAnalysisTypes]);

  // 👁️ Apri dettaglio analisi
  const openAnalysisDetail = async (analysis: ThesisAnalysisResult) => {
    // Carica dettaglio completo se necessario
    const fullAnalysis = await loadAnalysisDetail(analysis.id);
    if (fullAnalysis) {
      setSelectedAnalysis(fullAnalysis);
      setIsDetailModalOpen(true);
    } else {
      toast.error("❌ Errore nel caricamento del dettaglio");
    }
  };

  // 🔄 Chiudi modal dettaglio
  const closeDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedAnalysis(null);
  };

  // 🎨 HELPER FUNCTIONS
  const getAnalysisTypeColor = (analysisType: string) => {
    const colorMap: Record<string, string> = {
      'analisi_strutturale': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'analisi_metodologica': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'analisi_contenuti': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      'analisi_bibliografica': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      'analisi_formale': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
      'analisi_empirica_sperimentale': 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
      'analisi_critica_sintetica': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200'
    };

    return colorMap[analysisType] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
  };

  const getBatchJobBadge = (batchJobId?: string) => {
    if (batchJobId) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
          🚀 Batch
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
        ⚡ Singola
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 🎯 SKELETON LOADER
  const AnalysisSkeleton = () => (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 animate-pulse">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded-xl"></div>
          <div className="flex-1">
            <div className="h-5 bg-gray-300 dark:bg-gray-600 rounded mb-2 w-3/4"></div>
            <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="w-16 h-6 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
          <div className="w-16 h-6 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
        </div>
      </div>
      
      <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 mb-4">
        <div className="space-y-2">
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
        </div>
      </div>
      
      <div className="flex justify-between items-center">
        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-32"></div>
        <div className="w-24 h-8 bg-gray-300 dark:bg-gray-600 rounded-lg"></div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* 🎯 HEADER SEZIONE */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
              📊
            </div>
            Risultati Analisi
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Consulta tutti i risultati delle analisi AI sui tuoi progetti di tesi
          </p>
        </div>

        {selectedProjectId && (
          <button
            onClick={refresh}
            disabled={isLoading}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-all flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                Aggiornamento...
              </>
            ) : (
              <>
                🔄 Aggiorna
              </>
            )}
          </button>
        )}
      </div>

      {/* 📁 SELEZIONE PROGETTO */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Dropdown Progetto */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              🎓 Seleziona Progetto di Tesi
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              disabled={projectsLoading}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all disabled:opacity-50"
            >
              <option value="">
                {projectsLoading ? "Caricamento progetti..." : "Seleziona un progetto..."}
              </option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.project_title} ({project.level.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          {/* Info Progetto Selezionato */}
          {selectedProjectId && (
            <div className="lg:w-80 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/30 dark:to-blue-900/30 rounded-lg p-4 border border-purple-200 dark:border-purple-700">
              {(() => {
                const selectedProject = projects.find(p => p.id === selectedProjectId);
                if (!selectedProject) return null;
                
                return (
                  <div>
                    <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-2 flex items-center gap-2">
                      📋 Progetto Selezionato
                    </h4>
                    <div className="space-y-1 text-sm">
                      <div>
                        <span className="font-medium text-purple-700 dark:text-purple-300">Facoltà:</span>
                        <span className="ml-2 text-gray-700 dark:text-gray-300">{selectedProject.faculty}</span>
                      </div>
                      <div>
                        <span className="font-medium text-purple-700 dark:text-purple-300">Livello:</span>
                        <span className="ml-2 text-gray-700 dark:text-gray-300">{selectedProject.level.toUpperCase()}</span>
                      </div>
                      <div>
                        <span className="font-medium text-purple-700 dark:text-purple-300">Analisi totali:</span>
                        <span className="ml-2 text-gray-700 dark:text-gray-300">{totalCount || analyses.length}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* 🔍 FILTRI E RICERCA - Solo se progetto selezionato */}
      {selectedProjectId && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Ricerca */}
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
                  placeholder="Cerca per tipo analisi, contenuto o risultato..."
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Filtro Tipo Analisi */}
            <select
              value={analysisTypeFilter}
              onChange={(e) => setAnalysisTypeFilter(e.target.value)}
              className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
            >
              <option value="all">Tutti i tipi</option>
              {availableAnalysisTypes.map((type) => (
                <option key={type} value={type}>
                  {type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </option>
              ))}
            </select>

            {/* Filtro Batch/Singola */}
            <select
              value={batchJobFilter}
              onChange={(e) => setBatchJobFilter(e.target.value)}
              className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
            >
              <option value="all">Tutte le analisi</option>
              <option value="batch">🚀 Solo Batch</option>
              <option value="single">⚡ Solo Singole</option>
            </select>

            {/* Ordinamento */}
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              >
                <option value="created_at">📅 Data</option>
                <option value="chunk_number">📋 Chunk</option>
                <option value="analysis_type">🎯 Tipo</option>
              </select>
              
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                title={sortOrder === 'asc' ? 'Crescente' : 'Decrescente'}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>

          {/* Statistiche Ricerca */}
          <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            {analyses.length > 0 ? (
              <>
                Visualizzando {analyses.length} analisi
                {totalCount > 0 && totalCount !== analyses.length && (
                  <span> di {totalCount} totali</span>
                )}
                {hasMore && <span className="text-purple-600 dark:text-purple-400"> • Altri disponibili</span>}
              </>
            ) : (
              "Nessuna analisi trovata con i filtri attuali"
            )}
          </div>
        </div>
      )}

      {/* ❌ ERROR STATE */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-xl p-4">
          <p className="text-red-600 dark:text-red-400 font-medium">{error}</p>
        </div>
      )}

      {/* 📭 EMPTY STATE - Nessun progetto selezionato */}
      {!selectedProjectId && !projectsLoading && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Seleziona un Progetto
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Scegli un progetto dal dropdown sopra per visualizzare tutte le sue analisi completate.
          </p>
        </div>
      )}

      {/* 📭 EMPTY STATE - Progetto senza analisi */}
      {selectedProjectId && !isLoading && analyses.length === 0 && !error && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Nessuna Analisi Trovata
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Questo progetto non ha ancora analisi completate, oppure non corrispondono ai filtri selezionati.
          </p>
        </div>
      )}

      {/* 🎯 LISTA ANALISI */}
      {selectedProjectId && analyses.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {analyses.map((analysis) => (
            <div
              key={analysis.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-500 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 overflow-hidden"
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900 dark:to-blue-900 rounded-xl flex items-center justify-center text-xl">
                      🎯
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-lg text-gray-900 dark:text-gray-100 line-clamp-1">
                        {analysis.analysis_name}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Chunk #{analysis.chunk_number} • {formatDate(analysis.created_at)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getAnalysisTypeColor(analysis.analysis_type)}`}>
                      📝 {analysis.analysis_type.split('_')[1] || 'Analisi'}
                    </span>
                    {getBatchJobBadge(analysis.batch_job_id)}
                  </div>
                </div>

                {/* Preview Output */}
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-xl p-4 border border-gray-200/50 dark:border-gray-600/50 mb-4">
                  <h5 className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
                    📋 Risultato Analisi
                  </h5>
                  <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed line-clamp-3">
                    {analysis.output_preview || analysis.output_analysis.substring(0, 200) + '...'}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex justify-between items-center">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {analysis.input_text.length.toLocaleString()} caratteri analizzati
                  </div>
                  
                  <button
                    onClick={() => openAnalysisDetail(analysis)}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all text-sm font-medium flex items-center gap-2"
                  >
                    👁️ Vedi Completo
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 🔄 LOADING STATE per analisi aggiuntive */}
      {isLoading && analyses.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <AnalysisSkeleton key={`skeleton-${index}`} />
          ))}
        </div>
      )}

      {/* 🔄 INITIAL LOADING STATE */}
      {isLoading && analyses.length === 0 && selectedProjectId && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <AnalysisSkeleton key={`skeleton-${index}`} />
          ))}
        </div>
      )}

      {/* 🚀 LOAD MORE BUTTON */}
      {hasMore && !isLoading && analyses.length > 0 && (
        <div className="text-center py-6">
          <button
            onClick={loadMore}
            className="px-8 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all duration-200 text-sm font-medium shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-2 mx-auto"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Carica altre analisi
          </button>
        </div>
      )}

      {/* 🏁 END OF RESULTS */}
      {!hasMore && analyses.length > 0 && (
        <div className="text-center py-6">
          <div className="text-gray-500 dark:text-gray-400 text-sm flex items-center justify-center gap-2">
            <div className="w-12 h-px bg-gray-300 dark:bg-gray-600"></div>
            <span>✅ Tutte le analisi caricate</span>
            <div className="w-12 h-px bg-gray-300 dark:bg-gray-600"></div>
          </div>
        </div>
      )}

      {/* 📋 ANALYSIS DETAIL MODAL */}
      {selectedAnalysis && (
        <AnalysisDetailModal
          isOpen={isDetailModalOpen}
          onClose={closeDetailModal}
          analysis={selectedAnalysis}
        />
      )}
    </div>
  );
}