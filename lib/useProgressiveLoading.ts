import { useState, useEffect, useRef, useCallback } from 'react';

export type LoadingMode = 'fast' | 'full';

interface ProgressiveLoadingConfig {
  preloadRadius: number; // Quante pagine preloading attorno a quella corrente
  maxCachedPages: number; // Massimo numero di pagine in cache
  fastModeQuality: number; // Qualità per fast mode (0.5-1.0)
  fullModeQuality: number; // Qualità per full mode
}

const DEFAULT_CONFIG: ProgressiveLoadingConfig = {
  preloadRadius: 2,
  maxCachedPages: 10,
  fastModeQuality: 0.75,
  fullModeQuality: 1.0
};

export const useProgressiveLoading = (
  numPages: number | null,
  currentPage: number,
  config: Partial<ProgressiveLoadingConfig> = {}
) => {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  
  // Auto-set loading mode basato su dimensione documento
  const [loadingMode, setLoadingMode] = useState<LoadingMode>('fast');
  const [visiblePages, setVisiblePages] = useState(new Set<number>([1]));
  const [loadedPages, setLoadedPages] = useState(new Set<number>());
  const [preloadedPages, setPreloadedPages] = useState(new Set<number>());

  // Auto-mode: Fast per documenti grandi, Full per piccoli
  useEffect(() => {
    if (numPages) {
      const autoMode: LoadingMode = numPages > 20 ? 'fast' : 'full';
      setLoadingMode(autoMode);
    }
  }, [numPages]);
  
  // Ref per Intersection Observer
  const observerRef = useRef<IntersectionObserver | null>(null);
  const pageElementsRef = useRef<Map<number, HTMLElement>>(new Map());

  // Calcola quali pagine dovrebbero essere preloaded
  const calculatePreloadPages = useCallback((page: number): number[] => {
    if (!numPages) return [];
    
    const pages: number[] = [];
    const { preloadRadius } = fullConfig;
    
    for (let i = Math.max(1, page - preloadRadius); 
         i <= Math.min(numPages, page + preloadRadius); 
         i++) {
      pages.push(i);
    }
    
    return pages;
  }, [numPages, fullConfig]);

  // Gestisce il cambiamento di pagina corrente
  useEffect(() => {
    if (!numPages || currentPage < 1) return;
    
    const pagesToPreload = calculatePreloadPages(currentPage);
    
    // Aggiorna visible pages solo se diverso
    setVisiblePages(prev => {
      const newSet = new Set([currentPage]);
      if (prev.size !== newSet.size || !prev.has(currentPage)) {
        return newSet;
      }
      return prev;
    });
    
    // Aggiorna preloaded pages solo se diverso
    setPreloadedPages(prev => {
      const newSet = new Set(pagesToPreload);
      if (prev.size !== newSet.size || !pagesToPreload.every(p => prev.has(p))) {
        return newSet;
      }
      return prev;
    });
    
    // Gestisci cache LRU solo se necessario
    setLoadedPages(prev => {
      const newLoaded = new Set(prev);
      let hasChanges = false;
      
      // Aggiungi pagine necessarie
      pagesToPreload.forEach(page => {
        if (!newLoaded.has(page)) {
          newLoaded.add(page);
          hasChanges = true;
        }
      });
      
      // Rimuovi pagine lontane se superano il limite
      if (newLoaded.size > fullConfig.maxCachedPages) {
        const sortedPages = Array.from(newLoaded)
          .sort((a, b) => Math.abs(a - currentPage) - Math.abs(b - currentPage));
        
        const pagesToKeep = sortedPages.slice(0, fullConfig.maxCachedPages);
        const finalSet = new Set(pagesToKeep);
        
        // Solo se c'è una differenza reale
        if (finalSet.size !== newLoaded.size) {
          return finalSet;
        }
      }
      
      return hasChanges ? newLoaded : prev;
    });
  }, [currentPage, numPages]); // Rimuovi calculatePreloadPages e fullConfig dalle deps

  // Setup Intersection Observer per viewport detection
  useEffect(() => {
    if (typeof window === 'undefined') return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          const pageNum = parseInt(entry.target.getAttribute('data-page') || '0');
          if (pageNum === 0) return;

          if (entry.isIntersecting) {
            setVisiblePages(prev => new Set([...prev, pageNum]));
            setLoadedPages(prev => new Set([...prev, pageNum]));
          } else {
            setVisiblePages(prev => {
              const newSet = new Set(prev);
              newSet.delete(pageNum);
              return newSet;
            });
          }
        });
      },
      {
        threshold: 0.1, // Trigger quando 10% della pagina è visibile
        rootMargin: '100px' // Inizia preload 100px prima che sia visibile
      }
    );

    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  // Funzione per osservare un elemento pagina
  const observePage = useCallback((pageNum: number, element: HTMLElement | null) => {
    if (!observerRef.current) return;

    // Rimuovi osservazione precedente
    const prevElement = pageElementsRef.current.get(pageNum);
    if (prevElement) {
      observerRef.current.unobserve(prevElement);
      pageElementsRef.current.delete(pageNum);
    }

    // Aggiungi nuova osservazione
    if (element) {
      element.setAttribute('data-page', pageNum.toString());
      observerRef.current.observe(element);
      pageElementsRef.current.set(pageNum, element);
    }
  }, []); // Rimuovi tutte le dependencies per evitare loop

  // Determina se una pagina dovrebbe essere renderizzata
  const shouldRenderPage = useCallback((pageNum: number): boolean => {
    // Sempre renderizza la pagina corrente
    if (pageNum === currentPage) return true;
    
    // Renderizza pagine visibili
    if (visiblePages.has(pageNum)) return true;
    
    // Renderizza pagine preloaded se in fast mode
    if (loadingMode === 'fast' && preloadedPages.has(pageNum)) return true;
    
    // In full mode, renderizza solo se già caricata
    if (loadingMode === 'full' && loadedPages.has(pageNum)) return true;
    
    return false;
  }, [currentPage, visiblePages, preloadedPages, loadedPages, loadingMode]);

  // Determina la qualità di rendering per una pagina
  const getPageQuality = useCallback((pageNum: number): number => {
    // Pagina corrente sempre alla massima qualità
    if (pageNum === currentPage) {
      return loadingMode === 'full' ? fullConfig.fullModeQuality : fullConfig.fastModeQuality;
    }
    
    // Pagine visibili: qualità basata su modalità
    if (visiblePages.has(pageNum)) {
      return loadingMode === 'full' ? fullConfig.fullModeQuality : fullConfig.fastModeQuality;
    }
    
    // Pagine preloaded: qualità ridotta
    return fullConfig.fastModeQuality * 0.8;
  }, [currentPage, visiblePages, loadingMode, fullConfig]);

  // Determina se renderizzare text layer
  const shouldRenderTextLayer = useCallback((pageNum: number): boolean => {
    // Text layer solo in full mode per pagina corrente e visibili
    if (loadingMode === 'fast') return false;
    
    return pageNum === currentPage || visiblePages.has(pageNum);
  }, [currentPage, visiblePages, loadingMode]);

  // Determina se renderizzare annotation layer
  const shouldRenderAnnotationLayer = useCallback((pageNum: number): boolean => {
    // Annotation layer solo per pagina corrente in full mode
    return loadingMode === 'full' && pageNum === currentPage;
  }, [currentPage, loadingMode]);

  // Funzione per cambiare modalità di loading
  const toggleLoadingMode = useCallback(() => {
    setLoadingMode(prev => prev === 'fast' ? 'full' : 'fast');
  }, []);

  // Statistiche per debug/monitoring
  const getStats = useCallback(() => ({
    loadingMode,
    visiblePages: visiblePages.size,
    loadedPages: loadedPages.size,
    preloadedPages: preloadedPages.size,
    memoryUsage: `${loadedPages.size}/${fullConfig.maxCachedPages} pages`,
    currentPage,
    shouldRenderCount: numPages ? 
      Array.from({ length: numPages }, (_, i) => i + 1)
        .filter(shouldRenderPage).length : 0
  }), [
    loadingMode, visiblePages, loadedPages, preloadedPages, 
    currentPage, numPages, shouldRenderPage, fullConfig
  ]);

  return {
    // Modalità (ora automatica)
    loadingMode,
    
    // Funzioni di rendering condizionale
    shouldRenderPage,
    getPageQuality,
    shouldRenderTextLayer,
    shouldRenderAnnotationLayer,
    
    // Osservazione viewport
    observePage,
    
    // Stati per debug
    visiblePages: Array.from(visiblePages),
    loadedPages: Array.from(loadedPages),
    preloadedPages: Array.from(preloadedPages),
    
    // Statistiche
    getStats,
    
    // Configurazione
    config: fullConfig
  };
};