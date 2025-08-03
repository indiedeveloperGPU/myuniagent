import { useState, useEffect, useCallback } from 'react';
import { useDebounce } from './useDebounce';
import { useChunkCache } from './useChunkCache';
import { supabase } from "@/lib/supabaseClient";

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

interface UseOptimizedChunksProps {
  projectId: string;
  initialLimit?: number;
}

export function useOptimizedChunks({ projectId, initialLimit = 20 }: UseOptimizedChunksProps) {
  // 🎯 State Management
  const [chunks, setChunks] = useState<ThesisChunk[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  
  // 🔍 Filtri
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  
  // 📄 Paginazione
  const [currentPage, setCurrentPage] = useState(0);
  const [limit] = useState(initialLimit);
  
  // 🚀 Hooks ottimizzati
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const cache = useChunkCache(projectId);
  
  // 🔄 Cancellazione richieste in-flight
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  // 🎯 Load chunks con cache
  const loadChunks = useCallback(async (
    page: number = 0, 
    append: boolean = false,
    forceRefresh: boolean = false
  ) => {
    // Controlla cache prima di fare la richiesta
    if (!forceRefresh && page === 0) {
      const cachedData = cache.getCachedList(debouncedSearchTerm, statusFilter, `${sortBy}_${sortOrder}`);
      if (cachedData) {
        setChunks(cachedData);
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
        include_content: 'false',
        need_count: page === 0 ? 'true' : 'false',
        sort_by: sortBy,
        sort_order: sortOrder
      });

      if (debouncedSearchTerm.trim()) {
        params.append('search', debouncedSearchTerm.trim());
      }

      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      const response = await fetch(`/api/thesis-chunks?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: newAbortController.signal
      });
      
      if (!response.ok) {
        throw new Error(`Errore HTTP ${response.status}`);
      }

      const result = await response.json();
      const newChunks = result.chunks || [];
      
      if (append) {
        setChunks(prev => [...prev, ...newChunks]);
      } else {
        setChunks(newChunks);
        // Salva in cache solo per la prima pagina
        if (page === 0) {
          cache.setCachedList(debouncedSearchTerm, statusFilter, `${sortBy}_${sortOrder}`, newChunks);
        }
      }
      
      setHasMore(result.pagination.has_more);
      setTotalCount(result.pagination.total || 0);
      
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Errore caricamento chunk:', error);
        setError("Errore nel caricamento dei chunk");
      }
    } finally {
      setIsLoading(false);
      setAbortController(null);
    }
  }, [projectId, limit, debouncedSearchTerm, statusFilter, sortBy, sortOrder, cache, abortController]);

  // 🎯 Load single chunk detail
  const loadChunkDetail = useCallback(async (chunkId: string): Promise<ThesisChunk | null> => {
    // Controlla cache prima
    const cachedDetail = cache.getCachedDetail(chunkId);
    if (cachedDetail) {
      return cachedDetail;
    }

    try {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      if (!accessToken) throw new Error("Sessione scaduta");

      const response = await fetch(`/api/thesis-chunks?chunk_id=${chunkId}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      
      if (!response.ok) {
        throw new Error(`Errore HTTP ${response.status}`);
      }

      const result = await response.json();
      const chunk = result.chunk;
      
      // Salva in cache
      cache.setCachedDetail(chunkId, chunk);
      
      return chunk;
      
    } catch (error: any) {
      console.error('Errore caricamento dettaglio chunk:', error);
      return null;
    }
  }, [cache]);

  // 🔄 Reset quando cambiano i filtri
  useEffect(() => {
    setCurrentPage(0);
    loadChunks(0, false, false);
  }, [debouncedSearchTerm, statusFilter, sortBy, sortOrder]);

  // 🚀 Load more per infinite scroll
  const loadMore = useCallback(() => {
    if (hasMore && !isLoading) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      loadChunks(nextPage, true, false);
    }
  }, [hasMore, isLoading, currentPage, loadChunks]);

  // 🔄 Refresh
  const refresh = useCallback(() => {
    cache.invalidateCache('list');
    setCurrentPage(0);
    loadChunks(0, false, true);
  }, [cache, loadChunks]);

  // 🗑️ Delete chunks
  const deleteChunks = useCallback(async (chunkIds: string[]) => {
    try {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      if (!accessToken) throw new Error("Sessione scaduta");

      const response = await fetch('/api/thesis-chunks', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({ chunk_ids: chunkIds })
      });

      if (!response.ok) {
        throw new Error(`Errore HTTP ${response.status}`);
      }

      // Aggiorna stato locale (optimistic update)
      setChunks(prev => prev.filter(chunk => !chunkIds.includes(chunk.id)));
      
      // Invalida cache
      cache.invalidateCache('list');
      chunkIds.forEach(id => cache.invalidateCache('detail', id));
      
      return true;
      
    } catch (error: any) {
      console.error('Errore eliminazione chunk:', error);
      return false;
    }
  }, [cache]);

  return {
    // Data
    chunks,
    isLoading,
    error,
    hasMore,
    totalCount,
    
    // Filtri
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    
    // Actions
    loadMore,
    refresh,
    loadChunkDetail,
    deleteChunks,
    
    // Utils
    cacheStats: cache.cacheStats
  };
}