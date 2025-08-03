import { useState, useCallback, useMemo } from 'react';

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

interface CacheEntry {
  data: ThesisChunk[];
  timestamp: number;
  filters: {
    search: string;
    status: string;
    sortBy: string;
  };
}

interface ChunkDetail {
  [chunkId: string]: {
    chunk: ThesisChunk;
    timestamp: number;
  };
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minuti
const DETAIL_CACHE_DURATION = 10 * 60 * 1000; // 10 minuti

export function useChunkCache(projectId: string) {
  const [listCache, setListCache] = useState<Map<string, CacheEntry>>(new Map());
  const [detailCache, setDetailCache] = useState<ChunkDetail>({});
  const [prefetchQueue, setPrefetchQueue] = useState<Set<string>>(new Set());

  // 🔍 Genera chiave cache per lista
  const generateCacheKey = useCallback((search: string, status: string, sortBy: string) => {
    return `${projectId}:${search}:${status}:${sortBy}`;
  }, [projectId]);

  // 📦 Controlla se cache è valida
  const isCacheValid = useCallback((timestamp: number, duration: number = CACHE_DURATION) => {
    return Date.now() - timestamp < duration;
  }, []);

  // 🎯 Get cached list
  const getCachedList = useCallback((search: string, status: string, sortBy: string): ThesisChunk[] | null => {
    const key = generateCacheKey(search, status, sortBy);
    const cached = listCache.get(key);
    
    if (cached && isCacheValid(cached.timestamp)) {
      return cached.data;
    }
    
    return null;
  }, [listCache, generateCacheKey, isCacheValid]);

  // 💾 Set cached list
  const setCachedList = useCallback((search: string, status: string, sortBy: string, data: ThesisChunk[]) => {
    const key = generateCacheKey(search, status, sortBy);
    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      filters: { search, status, sortBy }
    };
    
    setListCache(prev => new Map(prev).set(key, entry));
  }, [generateCacheKey]);

  // 🎯 Get cached detail
  const getCachedDetail = useCallback((chunkId: string): ThesisChunk | null => {
    const cached = detailCache[chunkId];
    if (cached && isCacheValid(cached.timestamp, DETAIL_CACHE_DURATION)) {
      return cached.chunk;
    }
    return null;
  }, [detailCache, isCacheValid]);

  // 💾 Set cached detail
  const setCachedDetail = useCallback((chunkId: string, chunk: ThesisChunk) => {
    setDetailCache(prev => ({
      ...prev,
      [chunkId]: {
        chunk,
        timestamp: Date.now()
      }
    }));
  }, []);

  // 🗑️ Invalidate cache
  const invalidateCache = useCallback((type: 'list' | 'detail' | 'all' = 'all', chunkId?: string) => {
    if (type === 'all' || type === 'list') {
      setListCache(new Map());
    }
    
    if (type === 'all' || type === 'detail') {
      if (chunkId) {
        setDetailCache(prev => {
          const newCache = { ...prev };
          delete newCache[chunkId];
          return newCache;
        });
      } else {
        setDetailCache({});
      }
    }
  }, []);

  // 🚀 Prefetch logic
  const addToPrefetchQueue = useCallback((chunkId: string) => {
    setPrefetchQueue(prev => new Set(prev).add(chunkId));
  }, []);

  const removeFromPrefetchQueue = useCallback((chunkId: string) => {
    setPrefetchQueue(prev => {
      const newSet = new Set(prev);
      newSet.delete(chunkId);
      return newSet;
    });
  }, []);

  // 📊 Cache stats
  const cacheStats = useMemo(() => ({
    listCacheSize: listCache.size,
    detailCacheSize: Object.keys(detailCache).length,
    prefetchQueueSize: prefetchQueue.size
  }), [listCache.size, detailCache, prefetchQueue.size]);

  return {
    getCachedList,
    setCachedList,
    getCachedDetail,
    setCachedDetail,
    invalidateCache,
    addToPrefetchQueue,
    removeFromPrefetchQueue,
    prefetchQueue,
    cacheStats
  };
}