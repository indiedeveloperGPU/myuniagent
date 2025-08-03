import { useState, useCallback, useMemo } from 'react';

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

interface AnalysisCacheEntry {
  data: ThesisAnalysisResult[];
  timestamp: number;
  filters: {
    search: string;
    analysisType: string;
    batchJob: string;
    sortBy: string;
  };
}

interface AnalysisDetail {
  [analysisId: string]: {
    analysis: ThesisAnalysisResult;
    timestamp: number;
  };
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minuti per liste
const DETAIL_CACHE_DURATION = 15 * 60 * 1000; // 15 minuti per dettagli (più lunghi perché meno volatili)
const TYPES_CACHE_DURATION = 10 * 60 * 1000; // 10 minuti per tipi analisi

export function useAnalysisCache(projectId: string) {
  const [listCache, setListCache] = useState<Map<string, AnalysisCacheEntry>>(new Map());
  const [detailCache, setDetailCache] = useState<AnalysisDetail>({});
  const [typesCache, setTypesCache] = useState<{data: string[], timestamp: number} | null>(null);
  const [prefetchQueue, setPrefetchQueue] = useState<Set<string>>(new Set());

  // 🔍 Genera chiave cache per lista
  const generateCacheKey = useCallback((
    search: string, 
    analysisType: string, 
    batchJob: string,
    sortBy: string
  ) => {
    return `${projectId}:${search}:${analysisType}:${batchJob}:${sortBy}`;
  }, [projectId]);

  // 📦 Controlla se cache è valida
  const isCacheValid = useCallback((timestamp: number, duration: number = CACHE_DURATION) => {
    return Date.now() - timestamp < duration;
  }, []);

  // 🎯 Get cached list
  const getCachedList = useCallback((
    search: string, 
    analysisType: string, 
    batchJob: string,
    sortBy: string
  ): ThesisAnalysisResult[] | null => {
    const key = generateCacheKey(search, analysisType, batchJob, sortBy);
    const cached = listCache.get(key);
    
    if (cached && isCacheValid(cached.timestamp)) {
      return cached.data;
    }
    
    return null;
  }, [listCache, generateCacheKey, isCacheValid]);

  // 💾 Set cached list
  const setCachedList = useCallback((
    search: string, 
    analysisType: string, 
    batchJob: string,
    sortBy: string, 
    data: ThesisAnalysisResult[]
  ) => {
    const key = generateCacheKey(search, analysisType, batchJob, sortBy);
    const entry: AnalysisCacheEntry = {
      data,
      timestamp: Date.now(),
      filters: { search, analysisType, batchJob, sortBy }
    };
    
    setListCache(prev => new Map(prev).set(key, entry));
  }, [generateCacheKey]);

  // 🎯 Get cached detail
  const getCachedDetail = useCallback((analysisId: string): ThesisAnalysisResult | null => {
    const cached = detailCache[analysisId];
    if (cached && isCacheValid(cached.timestamp, DETAIL_CACHE_DURATION)) {
      return cached.analysis;
    }
    return null;
  }, [detailCache, isCacheValid]);

  // 💾 Set cached detail
  const setCachedDetail = useCallback((analysisId: string, analysis: ThesisAnalysisResult) => {
    setDetailCache(prev => ({
      ...prev,
      [analysisId]: {
        analysis,
        timestamp: Date.now()
      }
    }));
  }, []);

  // 📊 Get cached types
  const getCachedTypes = useCallback((): string[] | null => {
    if (typesCache && isCacheValid(typesCache.timestamp, TYPES_CACHE_DURATION)) {
      return typesCache.data;
    }
    return null;
  }, [typesCache, isCacheValid]);

  // 💾 Set cached types
  const setCachedTypes = useCallback((types: string[]) => {
    setTypesCache({
      data: types,
      timestamp: Date.now()
    });
  }, []);

  // 🗑️ Invalidate cache
  const invalidateCache = useCallback((
    type: 'list' | 'detail' | 'types' | 'all' = 'all', 
    analysisId?: string
  ) => {
    if (type === 'all' || type === 'list') {
      setListCache(new Map());
    }
    
    if (type === 'all' || type === 'detail') {
      if (analysisId) {
        setDetailCache(prev => {
          const newCache = { ...prev };
          delete newCache[analysisId];
          return newCache;
        });
      } else {
        setDetailCache({});
      }
    }

    if (type === 'all' || type === 'types') {
      setTypesCache(null);
    }
  }, []);

  // 🚀 Prefetch logic per analisi correlate
  const addToPrefetchQueue = useCallback((analysisId: string) => {
    setPrefetchQueue(prev => new Set(prev).add(analysisId));
  }, []);

  const removeFromPrefetchQueue = useCallback((analysisId: string) => {
    setPrefetchQueue(prev => {
      const newSet = new Set(prev);
      newSet.delete(analysisId);
      return newSet;
    });
  }, []);

  // 🎯 Smart cache cleanup - rimuove voci più vecchie
  const cleanupExpiredCache = useCallback(() => {
    const now = Date.now();
    
    // Cleanup lista cache
    setListCache(prev => {
      const newCache = new Map(prev);
      for (const [key, entry] of newCache) {
        if (now - entry.timestamp > CACHE_DURATION) {
          newCache.delete(key);
        }
      }
      return newCache;
    });

    // Cleanup detail cache
    setDetailCache(prev => {
      const newCache = { ...prev };
      for (const [id, entry] of Object.entries(newCache)) {
        if (now - entry.timestamp > DETAIL_CACHE_DURATION) {
          delete newCache[id];
        }
      }
      return newCache;
    });

    // Cleanup types cache
    if (typesCache && now - typesCache.timestamp > TYPES_CACHE_DURATION) {
      setTypesCache(null);
    }
  }, [typesCache]);

  // 📊 Cache stats con dettagli per debugging
  const cacheStats = useMemo(() => ({
    listCacheSize: listCache.size,
    detailCacheSize: Object.keys(detailCache).length,
    typesCache: typesCache ? 'cached' : 'empty',
    prefetchQueueSize: prefetchQueue.size,
    totalMemoryUsage: {
      lists: listCache.size,
      details: Object.keys(detailCache).length,
      types: typesCache ? 1 : 0
    }
  }), [listCache.size, detailCache, typesCache, prefetchQueue.size]);

  return {
    // List cache
    getCachedList,
    setCachedList,
    
    // Detail cache
    getCachedDetail,
    setCachedDetail,
    
    // Types cache
    getCachedTypes,
    setCachedTypes,
    
    // Cache management
    invalidateCache,
    cleanupExpiredCache,
    
    // Prefetch
    addToPrefetchQueue,
    removeFromPrefetchQueue,
    prefetchQueue,
    
    // Stats
    cacheStats
  };
}
