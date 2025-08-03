import { useState, useEffect, useCallback } from 'react';
import { useDebounce } from './useDebounce';
import { useAnalysisCache } from './useAnalysisCache';
import { supabase } from "@/lib/supabaseClient";

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

interface UseOptimizedAnalysesProps {
  projectId: string;
  initialLimit?: number;
}

export function useOptimizedAnalyses({ projectId, initialLimit = 20 }: UseOptimizedAnalysesProps) {
  // 🎯 State Management
  const [analyses, setAnalyses] = useState<ThesisAnalysisResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  
  // 🔍 Filtri
  const [searchTerm, setSearchTerm] = useState("");
  const [analysisTypeFilter, setAnalysisTypeFilter] = useState<string>("all");
  const [batchJobFilter, setBatchJobFilter] = useState<string>("all"); // all, batch, single
  const [sortBy, setSortBy] = useState<string>("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  
  // 📄 Paginazione
  const [currentPage, setCurrentPage] = useState(0);
  const [limit] = useState(initialLimit);
  
  // 🚀 Hooks ottimizzati
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const cache = useAnalysisCache(projectId);
  
  // 🔄 Cancellazione richieste in-flight
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  // 🎯 Load analyses con cache
  const loadAnalyses = useCallback(async (
    page: number = 0, 
    append: boolean = false,
    forceRefresh: boolean = false
  ) => {
    // 🚨 CONTROLLO PROGETTO SELEZIONATO
  if (!projectId || projectId.trim() === "") {
    setAnalyses([]);
    setIsLoading(false);
    setHasMore(false);
    setTotalCount(0);
    return;
  }
    // Controlla cache prima di fare la richiesta
    if (!forceRefresh && page === 0) {
      const cachedData = cache.getCachedList(
        debouncedSearchTerm, 
        analysisTypeFilter, 
        batchJobFilter,
        `${sortBy}_${sortOrder}`
      );
      if (cachedData) {
        setAnalyses(cachedData);
        setIsLoading(false);
        return;
      }
    }

    // Cancella richiesta precedente
    if (abortController) {
      abortController.abort();
    }

    const newAbortController = new AbortController();
    setAbortController(newAbortController);

    if (!append) {
      setIsLoading(true);
    }
    setError("");

    try {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      if (!accessToken) {
        throw new Error("Sessione scaduta");
      }

      const offset = page * limit;
      const params = new URLSearchParams({
        project_id: projectId,
        limit: limit.toString(),
        offset: offset.toString(),
        include_previews: 'true',
        need_count: page === 0 ? 'true' : 'false',
        sort_by: sortBy,
        sort_order: sortOrder
      });

      if (debouncedSearchTerm.trim()) {
        params.append('search', debouncedSearchTerm.trim());
      }

      if (analysisTypeFilter !== 'all') {
        params.append('analysis_type', analysisTypeFilter);
      }

      if (batchJobFilter !== 'all') {
        if (batchJobFilter === 'batch') {
          params.append('has_batch_job', 'true');
        } else if (batchJobFilter === 'single') {
          params.append('has_batch_job', 'false');
        }
      }

      const response = await fetch(`/api/thesis-analyses?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: newAbortController.signal
      });
      
      if (!response.ok) {
        throw new Error(`Errore HTTP ${response.status}`);
      }

      const result = await response.json();
      const newAnalyses = result.analyses || [];
      
      if (append) {
        setAnalyses(prev => [...prev, ...newAnalyses]);
      } else {
        setAnalyses(newAnalyses);
        // Salva in cache solo per la prima pagina
        if (page === 0) {
          cache.setCachedList(
            debouncedSearchTerm, 
            analysisTypeFilter, 
            batchJobFilter,
            `${sortBy}_${sortOrder}`, 
            newAnalyses
          );
        }
      }
      
      setHasMore(result.pagination.has_more);
      setTotalCount(result.pagination.total || 0);
      
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Errore caricamento analisi:', error);
        setError("Errore nel caricamento delle analisi");
      }
    } finally {
      setIsLoading(false);
      setAbortController(null);
    }
  }, [projectId, limit, debouncedSearchTerm, analysisTypeFilter, batchJobFilter, sortBy, sortOrder, cache, abortController]);

  // 🎯 Load single analysis detail
  const loadAnalysisDetail = useCallback(async (analysisId: string): Promise<ThesisAnalysisResult | null> => {
    // Controlla cache prima
    const cachedDetail = cache.getCachedDetail(analysisId);
    if (cachedDetail) {
      return cachedDetail;
    }

    try {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      if (!accessToken) throw new Error("Sessione scaduta");

      const response = await fetch(`/api/thesis-analyses?analysis_id=${analysisId}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      
      if (!response.ok) {
        throw new Error(`Errore HTTP ${response.status}`);
      }

      const result = await response.json();
      const analysis = result.analysis;
      
      // Salva in cache
      cache.setCachedDetail(analysisId, analysis);
      
      return analysis;
      
    } catch (error: any) {
      console.error('Errore caricamento dettaglio analisi:', error);
      return null;
    }
  }, [cache]);

  // 📊 Get unique analysis types per il progetto
  const getAvailableAnalysisTypes = useCallback(async (): Promise<string[]> => {
    try {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      if (!accessToken) return [];

      const response = await fetch(`/api/thesis-analyses/types?project_id=${projectId}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      
      if (!response.ok) return [];

      const result = await response.json();
      return result.analysis_types || [];
      
    } catch (error: any) {
      console.error('Errore caricamento tipi analisi:', error);
      return [];
    }
  }, [projectId]);

  // 🔄 Reset quando cambiano i filtri
  useEffect(() => {
    setCurrentPage(0);
    loadAnalyses(0, false, false);
  }, [debouncedSearchTerm, analysisTypeFilter, batchJobFilter, sortBy, sortOrder]);

  // 🚀 Load more per infinite scroll
  const loadMore = useCallback(() => {
    if (hasMore && !isLoading) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      loadAnalyses(nextPage, true, false);
    }
  }, [hasMore, isLoading, currentPage, loadAnalyses]);

  // 🔄 Refresh
  const refresh = useCallback(() => {
    cache.invalidateCache('list');
    setCurrentPage(0);
    loadAnalyses(0, false, true);
  }, [cache, loadAnalyses]);

  // 🗑️ Delete analyses (se necessario in futuro)
  const deleteAnalyses = useCallback(async (analysisIds: string[]) => {
    try {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      if (!accessToken) throw new Error("Sessione scaduta");

      const response = await fetch('/api/thesis-analyses', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({ analysis_ids: analysisIds })
      });

      if (!response.ok) {
        throw new Error(`Errore HTTP ${response.status}`);
      }

      // Aggiorna stato locale (optimistic update)
      setAnalyses(prev => prev.filter(analysis => !analysisIds.includes(analysis.id)));
      
      // Invalida cache
      cache.invalidateCache('list');
      analysisIds.forEach(id => cache.invalidateCache('detail', id));
      
      return true;
      
    } catch (error: any) {
      console.error('Errore eliminazione analisi:', error);
      return false;
    }
  }, [cache]);

  return {
    // Data
    analyses,
    isLoading,
    error,
    hasMore,
    totalCount,
    
    // Filtri
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
    
    // Actions
    loadMore,
    refresh,
    loadAnalysisDetail,
    deleteAnalyses,
    getAvailableAnalysisTypes,
    
    // Utils
    cacheStats: cache.cacheStats
  };
}