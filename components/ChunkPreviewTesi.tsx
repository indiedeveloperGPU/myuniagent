import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose } from '@radix-ui/react-dialog';
import { toast } from "react-hot-toast";
import { useOptimizedChunks } from "@/lib/hooks/useOptimizedChunks";
import { supabase } from "@/lib/supabaseClient";
import BatchAnalysisModal from "@/components/BatchAnalysisModal";

// 🎯 ENTERPRISE TYPESCRIPT INTERFACES
interface ThesisChunk {
  id: string;
  title: string;
  section: string | null;
  page_range: string | null;
  order_index: number;
  content?: string;
  word_count: number;
  char_count: number;
  status: 'bozza' | 'pronto' | 'in_coda' | 'elaborazione' | 'completato' | 'errore';
  created_at: string;
  updated_at: string;
}

interface ThesisProject {
  id: string;
  project_title: string;
  faculty: string;
  thesis_topic: string;
  level: 'triennale' | 'magistrale' | 'dottorato';
  status: 'active' | 'completed' | 'abandoned';
}

interface ChunkPreviewTesiProps {
  isOpen: boolean;
  onClose: () => void;
  project: ThesisProject;
}

export default function ChunkPreviewTesi({ isOpen, onClose, project }: ChunkPreviewTesiProps) {
  // 🚀 HOOKS OTTIMIZZATI
  const {
  chunks,
  isLoading,
  error,
  hasMore,
  totalCount,
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  loadMore,
  refresh,
  loadChunkDetail,
  deleteChunks
} = useOptimizedChunks({ 
  projectId: project.id,
  initialLimit: 20 
});
  
  // 🎯 LOCAL STATE
  const [selectedChunks, setSelectedChunks] = useState<Set<string>>(new Set());

  // 🎯 APRI MODAL BATCH
const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);

  // 🔄 Reset state quando si chiude il modal
  useEffect(() => {
  if (!isOpen) {
    setSelectedChunks(new Set());
  }
}, [isOpen]);

  // 🚀 INFINITE SCROLL HANDLER
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
    
    // Carica più chunk quando si arriva al 80% della fine
    if (scrollHeight - scrollTop <= clientHeight * 1.2 && hasMore && !isLoading) {
      loadMore();
    }
  };

  // 🔄 REFRESH OTTIMIZZATO
  const handleRefresh = () => {
  setSelectedChunks(new Set());
  refresh();
};

const openBatchModal = () => {
  if (selectedChunks.size === 0) {
    toast.error("❌ Nessun chunk selezionato");
    return;
  }

  if (selectedChunks.size > 50) {
    toast.error("❌ Massimo 50 chunk per batch job");
    return;
  }

  setIsBatchModalOpen(true);
};

const handleBatchSuccess = () => {
  setSelectedChunks(new Set());
  setIsBatchModalOpen(false);
};

  // ☑️ GESTIONE SELEZIONE CHUNK
  const toggleChunkSelection = (chunkId: string) => {
    const newSelected = new Set(selectedChunks);
    if (newSelected.has(chunkId)) {
      newSelected.delete(chunkId);
    } else {
      newSelected.add(chunkId);
    }
    setSelectedChunks(newSelected);
  };

  const selectAllChunks = () => {
    if (selectedChunks.size === chunks.length) {
      setSelectedChunks(new Set());
    } else {
      setSelectedChunks(new Set(chunks.map(c => c.id)));
    }
  };

  // 🗑️ ELIMINA CHUNK SELEZIONATI - OTTIMIZZATO
  const deleteSelectedChunks = async () => {
    if (selectedChunks.size === 0) {
      toast.error("❌ Nessun chunk selezionato");
      return;
    }

    if (!confirm(`Sei sicuro di voler eliminare ${selectedChunks.size} chunk? Questa azione è irreversibile.`)) {
      return;
    }

    const chunkIds = Array.from(selectedChunks);
    const success = await deleteChunks(chunkIds);
    
    if (success) {
  setSelectedChunks(new Set());
  toast.success(`✅ ${chunkIds.length} chunk eliminati con successo`);
}
  };

  // 🎨 HELPER FUNCTIONS
  const getStatusColor = (status: ThesisChunk['status']) => {
    switch (status) {
      case 'completato': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'pronto': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'elaborazione': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'errore': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'in_coda': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'bozza':
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getStatusEmoji = (status: ThesisChunk['status']) => {
    switch (status) {
      case 'completato': return '✅';
      case 'pronto': return '🚀';
      case 'elaborazione': return '⚡';
      case 'errore': return '❌';
      case 'in_coda': return '⏳';
      case 'bozza':
      default: return '📝';
    }
  };

  const truncateContent = (content: string, maxLength: number = 200): string => {
    if (!content || typeof content !== 'string') return '';
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  // 🎯 SKELETON LOADER COMPONENT
  const ChunkSkeleton = () => (
    <div className="group relative bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-pulse">
      <div className="relative p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="w-5 h-5 bg-gray-300 dark:bg-gray-600 rounded-lg"></div>
            <div className="flex-1 min-w-0">
              <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded"></div>
                <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded"></div>
                <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded"></div>
                <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded"></div>
              </div>
            </div>
          </div>
          <div className="w-20 h-6 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
        </div>
        <div className="mb-4">
          <div className="bg-gray-200 dark:bg-gray-700 rounded-xl p-4 border">
            <div className="space-y-2">
              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex-1 h-10 bg-gray-300 dark:bg-gray-600 rounded-lg"></div>
          <div className="w-24 h-10 bg-gray-300 dark:bg-gray-600 rounded-lg"></div>
        </div>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent 
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="bg-black/50 fixed inset-0" />
        <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-7xl w-full max-h-[95vh] overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col">
          {/* Header */}
          <div className="flex justify-between items-start p-6 border-b border-gray-200 dark:border-gray-700">
            <div>
              <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
  <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-xl flex items-center justify-center">
    📋
  </div>
  Chunk del Progetto
</DialogTitle>
              <DialogDescription className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                Gestisci tutti i chunk salvati per il progetto "{project.project_title}"
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                aria-label="Aggiorna"
                title="Aggiorna chunk"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                aria-label="Chiudi"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* 📊 HEADER CON STATISTICHE PROGETTO */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/30 dark:to-blue-900/30 p-4 mx-6 mt-6 rounded-xl border border-purple-200 dark:border-purple-700">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-1">
                  🎓 {project.project_title}
                </h3>
                <p className="text-sm text-purple-700 dark:text-purple-300">
                  {project.faculty} • {project.thesis_topic} • {project.level.toUpperCase()}
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                  {totalCount || chunks.length}
                </div>
                <div className="text-xs text-purple-600 dark:text-purple-400">
                  chunk totali
                </div>
              </div>
            </div>
          </div>

          {/* 🔍 FILTRI E RICERCA */}
          <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mx-6 mt-4 mb-4 shadow-lg">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Ricerca */}
              <div className="flex-1">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Cerca per titolo, contenuto o sezione..."
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              >
                <option value="all">Tutti gli stati</option>
                <option value="bozza">📝 Bozza</option>
                <option value="pronto">🚀 Pronto</option>
                <option value="elaborazione">⚡ In elaborazione</option>
                <option value="completato">✅ Completato</option>
                <option value="errore">❌ Errore</option>
              </select>

              {/* Sort */}
              <div className="flex gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                >
                  <option value="created_at">📅 Data creazione</option>
                  <option value="updated_at">📅 Ultimo aggiornamento</option>
                  <option value="title">🔤 Titolo</option>
                  <option value="order_index">📋 Ordine</option>
                  <option value="word_count">📏 Parole</option>
                  <option value="char_count">📏 Caratteri</option>
                </select>
                
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all hover:bg-gray-50 dark:hover:bg-gray-700"
                  title={sortOrder === 'asc' ? 'Crescente' : 'Decrescente'}
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </button>
              </div>
            </div>

            {/* Risultati e azioni */}
            <div className="flex justify-between items-center mt-4">
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {chunks.length} chunk • {selectedChunks.size} selezionati
                  {hasMore && <span className="text-purple-600 dark:text-purple-400"> • Altri disponibili</span>}
                </span>
                
                {chunks.length > 0 && (
                  <button
                    onClick={selectAllChunks}
                    className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-200 transition-all"
                  >
                    {selectedChunks.size === chunks.length ? '☑️ Deseleziona tutti' : '☑️ Seleziona tutti'}
                  </button>
                )}
              </div>

              {selectedChunks.size > 0 && (
  <div className="flex gap-2">
    <button
      onClick={openBatchModal}
      disabled={selectedChunks.size === 0}
      className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 transition-all text-sm font-medium flex items-center gap-2"
    >
      🚀 Analisi Batch ({selectedChunks.size})
    </button>
    <button
      onClick={deleteSelectedChunks}
      disabled={isLoading}
      className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-all text-sm"
    >
      🗑️ Elimina ({selectedChunks.size})
    </button>
  </div>
)}
            </div>
          </div>

{/* CONTENT AREA CON SIDEBAR NAVIGATION */}
<div className="flex flex-1 min-h-0 border-t border-gray-200 dark:border-gray-700">
  {/* 📍 SIDEBAR NAVIGATION */}
  <div className="w-20 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
    {/* Header Sidebar */}
    <div className="p-3 border-b border-gray-200 dark:border-gray-700">
      <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400 text-center">
        Pagine
      </h4>
    </div>
    
    {/* Navigation Items */}
    <div className="flex-1 overflow-y-auto p-2 space-y-1">
      {(() => {
        const itemsPerPage = 20;
        const totalPages = Math.ceil((totalCount || chunks.length) / itemsPerPage);
        const loadedPages = Math.ceil(chunks.length / itemsPerPage);
        
        return Array.from({ length: Math.max(totalPages, loadedPages) }, (_, i) => {
          const pageNum = i + 1;
          const isLoaded = pageNum <= loadedPages;
          const startIndex = i * itemsPerPage;
          const endIndex = Math.min(startIndex + itemsPerPage, chunks.length);
          const hasChunks = startIndex < chunks.length;
          
          return (
            <button
              key={pageNum}
              onClick={() => {
                if (isLoaded && hasChunks) {
                  // Scroll al primo chunk della pagina
                  const targetElement = document.querySelector(`[data-chunk-index="${startIndex}"]`);
                  if (targetElement) {
                    targetElement.scrollIntoView({ 
                      behavior: 'smooth', 
                      block: 'start' 
                    });
                  }
                } else if (hasMore && !isLoading) {
                  // Carica più chunk se necessario
                  loadMore();
                }
              }}
              disabled={!isLoaded && (!hasMore || isLoading)}
              className={`w-full h-12 rounded-lg text-sm font-medium transition-all duration-200 flex flex-col items-center justify-center gap-1 ${
                isLoaded && hasChunks
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:border-purple-300 dark:hover:border-purple-500 shadow-sm'
                  : isLoaded
                  ? 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-gray-500 cursor-not-allowed'
                  : hasMore
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-600 hover:bg-blue-200 dark:hover:bg-blue-900/50'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-600 cursor-not-allowed'
              }`}
              title={
                isLoaded && hasChunks
                  ? `Vai alla pagina ${pageNum} (chunk ${startIndex + 1}-${endIndex})`
                  : isLoaded
                  ? `Pagina ${pageNum} vuota`
                  : hasMore
                  ? `Clicca per caricare pagina ${pageNum}`
                  : `Pagina ${pageNum} non disponibile`
              }
            >
              <span className="text-lg font-bold">{pageNum}</span>
              {isLoaded && hasChunks && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {endIndex - startIndex}
                </span>
              )}
              {!isLoaded && hasMore && !isLoading && (
                <span className="text-xs">📥</span>
              )}
              {isLoading && pageNum === loadedPages + 1 && (
                <div className="w-3 h-3 border border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              )}
            </button>
          );
        });
      })()}
    </div>
    
    {/* Footer Stats */}
    <div className="p-3 border-t border-gray-200 dark:border-gray-700">
      <div className="text-center">
        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {chunks.length}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          caricati
        </div>
        {totalCount > 0 && totalCount !== chunks.length && (
          <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
            su {totalCount}
          </div>
        )}
        {hasMore && (
          <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
            • Altri disponibili
          </div>
        )}
      </div>
    </div>
  </div>

  {/* 📋 MAIN CONTENT */}
  <div 
    className="flex-1 overflow-y-auto px-6"
    onScroll={handleScroll}
    style={{ scrollBehavior: 'smooth' }}
  >
            
            {/* ❌ ERROR STATE */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-3 mb-4 ml-4">
                <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* 📭 EMPTY STATE */}
            {!isLoading && chunks.length === 0 && !error && (
               <div className="text-center py-8 ml-4">
                <div className="text-4xl mb-3">📝</div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Nessun chunk trovato
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Inizia a salvare chunk dal SmartPdfReader per vederli qui.
                </p>
              </div>
            )}

            {/* 🎨 LISTA CHUNK */}
            {chunks.length > 0 && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 pb-6 pl-4">
                {chunks.map((chunk, index) => (
  <div
    key={chunk.id}
    data-chunk-index={index}
    className="group relative bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-500 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 overflow-hidden"
  >
                    {/* 🎨 Background Pattern */}
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-50/30 to-blue-50/30 dark:from-purple-900/10 dark:to-blue-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    
                    {/* ✨ Glassmorphism Overlay */}
                    <div className="absolute inset-0 bg-white/5 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    
                    <div className="relative p-8">
                      {/* 🏷️ Header con Status Badge Floating */}
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-start gap-3 flex-1">
                          {/* 🎯 Checkbox con Animation */}
                          <div className="relative">
                            <input
                              type="checkbox"
                              checked={selectedChunks.has(chunk.id)}
                              onChange={() => toggleChunkSelection(chunk.id)}
                              className="w-5 h-5 text-purple-600 bg-white border-2 border-gray-300 rounded-lg focus:ring-purple-500 focus:ring-2 transition-all duration-200 hover:border-purple-400"
                            />
                            {selectedChunks.has(chunk.id) && (
                              <div className="absolute -top-1 -right-1 w-3 h-3 bg-purple-500 rounded-full animate-ping"></div>
                            )}
                          </div>
                          
                          {/* 📝 Title & Metadata */}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-lg text-gray-900 dark:text-gray-100 group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors duration-200 line-clamp-1">
                              {chunk.title}
                            </h4>
                            
                            {/* 🎨 Enhanced Metadata Grid */}
                            <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                              {chunk.section && (
                                <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                  <span className="truncate">{chunk.section}</span>
                                </div>
                              )}
                              {chunk.page_range && (
                                <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                  <span>{chunk.page_range}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-1 text-purple-600 dark:text-purple-400">
                                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                <span>{chunk.char_count.toLocaleString()} caratteri</span>
                              </div>
                              <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                <span>{chunk.word_count.toLocaleString()} parole</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* 🎭 Floating Status Badge */}
                        <div className="absolute top-4 right-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-lg ${getStatusColor(chunk.status)} border border-white/20`}>
                            <span className="mr-1">{getStatusEmoji(chunk.status)}</span>
                            {chunk.status.toUpperCase()}
                          </span>
                        </div>
                      </div>

                      {/* 📖 Content Preview Semplificato */}
<div className="mb-4">
  <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-xl p-6 border border-gray-200/50 dark:border-gray-600/50 group-hover:border-purple-200 dark:group-hover:border-purple-600 transition-colors duration-300 min-h-[120px]">
    <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
      <div className="space-y-2">
        <p className="text-gray-600 dark:text-gray-400 italic text-xs mb-2">
          Preview contenuto:
        </p>
        <div className="relative">
          <p className="leading-relaxed text-gray-800 dark:text-gray-200">
            {truncateContent(chunk.content || "Contenuto non disponibile", 200)}
          </p>
          {chunk.content && chunk.content.length > 200 && (
            <div className="absolute bottom-0 right-0 bg-gradient-to-l from-gray-100 dark:from-gray-700 to-transparent w-8 h-6"></div>
          )}
        </div>
      </div>
    </div>
  </div>
</div>

                      {/* 📊 Statistics Bar */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
                          <span>Densità contenuto</span>
                          <span>{Math.round((chunk.word_count || 0) / (chunk.char_count || 1) * 100)}% word density</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(((chunk.char_count || 0) / 2000) * 100, 100)}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* 🎯 Info Footer */}
<div className="flex justify-between items-center">
  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
    <div className="flex items-center gap-1">
      <span>📅</span>
      <span>Creato: {new Date(chunk.created_at).toLocaleDateString('it-IT')}</span>
    </div>
    <div className="flex items-center gap-1">
      <span>📝</span>
      <span>Ordine: {chunk.order_index}</span>
    </div>
  </div>
  
  <div className="text-xs text-gray-500 dark:text-gray-400">
    {chunk.content && chunk.content.length > 200 && (
      <span className="text-purple-600 dark:text-purple-400">
        +{chunk.content.length - 200} caratteri nascosti
      </span>
    )}
  </div>
</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 🔄 LOADING STATE per chunk successivi */}
            {isLoading && chunks.length > 0 && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 pb-6 pl-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <ChunkSkeleton key={`skeleton-${index}`} />
                ))}
              </div>
            )}

            {/* 🔄 INITIAL LOADING STATE */}
            {isLoading && chunks.length === 0 && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 pb-6 pl-4">
                {Array.from({ length: 6 }).map((_, index) => (
                  <ChunkSkeleton key={`skeleton-${index}`} />
                ))}
              </div>
            )}

            {/* 🚀 LOAD MORE INDICATOR */}
            {hasMore && !isLoading && chunks.length > 0 && (
              <div className="text-center py-4 ml-4">
                <button
                  onClick={loadMore}
                  className="px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all duration-200 text-sm font-medium shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-2 mx-auto"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Carica altri chunk
                </button>
              </div>
            )}

            {/* 🏁 END OF RESULTS */}
            {!hasMore && chunks.length > 0 && (
              <div className="text-center py-4 ml-4">
                <div className="text-gray-500 dark:text-gray-400 text-sm flex items-center justify-center gap-2">
                  <div className="w-12 h-px bg-gray-300 dark:bg-gray-600"></div>
                  <span>✅ Tutti i chunk caricati</span>
                  <div className="w-12 h-px bg-gray-300 dark:bg-gray-600"></div>
                </div>
              </div>
            )}
          </div>
          </div>

          {/* BOTTOM ACTIONS */}
<div className="flex justify-center items-center pt-4 border-t border-gray-200 dark:border-gray-700 p-6">
  <div className="text-xs text-gray-400 dark:text-gray-500 text-center">
    📊 {chunks.length} chunk visualizzati
    {totalCount > 0 && totalCount !== chunks.length && (
      <span> di {totalCount} totali</span>
    )}
    {hasMore && <span> • Altri disponibili</span>}
    <span> • {chunks.reduce((sum, c) => sum + c.char_count, 0).toLocaleString()} caratteri</span>
  </div>
</div>
        </div>
      </DialogContent>

{/* 🚀 BATCH ANALYSIS MODAL */}
<BatchAnalysisModal
  isOpen={isBatchModalOpen}
  onClose={() => setIsBatchModalOpen(false)}
  project={project}
  selectedChunks={selectedChunks}
  onSuccess={handleBatchSuccess}
/>

    </Dialog>
  );
}