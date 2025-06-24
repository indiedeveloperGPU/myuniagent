// hooks/useOCRWorker.ts
import { useRef, useEffect, useCallback, useState } from 'react';

interface OCRJob {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  progress: number;
  result?: string;
  error?: string;
  confidence?: number;
  metadata?: {
    processingTime: number;
    wordCount: number;
    lineCount: number;
  };
}

interface OCROptions {
  pageSegMode?: string;
  ocrEngineMode?: string;
  customOptions?: Record<string, string>;
}

export const useOCRWorker = () => {
  const workerRef = useRef<Worker | null>(null);
  const [jobs, setJobs] = useState<Map<string, OCRJob>>(new Map());
  const [isWorkerReady, setIsWorkerReady] = useState(false);
  const [workerError, setWorkerError] = useState<string | null>(null);

  // Inizializza il worker
  useEffect(() => {
    if (typeof window === 'undefined') return; // SSR check

    try {
      // Crea il worker
      workerRef.current = new Worker('/workers/ocr-worker.js');
      
      // Setup message handler
      workerRef.current.onmessage = (e) => {
        const { type, jobId, progress, text, error, confidence, metadata, message } = e.data;
        
        switch (type) {
          case 'initialized':
            setIsWorkerReady(true);
            setWorkerError(null);
            break;
            
          case 'init_error':
            setWorkerError(error);
            setIsWorkerReady(false);
            console.error('❌ OCR Worker initialization failed:', error);
            break;
            
          case 'started':
            setJobs(prev => {
              const newJobs = new Map(prev);
              const job = newJobs.get(jobId);
              if (job) {
                newJobs.set(jobId, { ...job, status: 'running', progress: 0 });
              }
              return newJobs;
            });
            break;
            
          case 'progress':
            setJobs(prev => {
              const newJobs = new Map(prev);
              const job = newJobs.get(jobId);
              if (job) {
                newJobs.set(jobId, { ...job, progress, status: 'running' });
              }
              return newJobs;
            });
            break;
            
          case 'complete':
            setJobs(prev => {
              const newJobs = new Map(prev);
              const job = newJobs.get(jobId);
              if (job) {
                newJobs.set(jobId, { 
                  ...job, 
                  status: 'completed', 
                  progress: 100,
                  result: text,
                  confidence,
                  metadata
                });
              }
              return newJobs;
            });
            break;
            
          case 'error':
          case 'worker_error':
            setJobs(prev => {
              const newJobs = new Map(prev);
              const job = newJobs.get(jobId);
              if (job) {
                newJobs.set(jobId, { ...job, status: 'error', error });
              }
              return newJobs;
            });
            break;
        }
      };
      
      // Setup error handler
      workerRef.current.onerror = (error) => {
        console.error('🚨 OCR Worker error:', error);
        setWorkerError(error.message);
        setIsWorkerReady(false);
      };
      
      // Inizializza il worker
      workerRef.current.postMessage({ type: 'init' });
      
    } catch (error) {
      console.error('Failed to create OCR worker:', error);
      setWorkerError(error instanceof Error ? error.message : 'Failed to create worker');
    }

    // Cleanup
    return () => {
      if (workerRef.current) {
        workerRef.current.postMessage({ type: 'terminate' });
        workerRef.current.terminate();
      }
    };
  }, []);

  // Funzione per avviare OCR
  const startOCR = useCallback((
    imageData: string, 
    jobId: string, 
    options: OCROptions = {}
  ) => {
    if (!workerRef.current || !isWorkerReady) {
      console.warn('OCR Worker not ready');
      return false;
    }

    // Crea nuovo job
    const newJob: OCRJob = {
      id: jobId,
      status: 'pending',
      progress: 0
    };

    setJobs(prev => new Map(prev.set(jobId, newJob)));

    // Pulisci le options dalle funzioni prima dell'invio
    const cleanOptions = {
      pageSegMode: options.pageSegMode,
      ocrEngineMode: options.ocrEngineMode,
      customOptions: options.customOptions
      // Non includiamo logger o altre funzioni che causano DataCloneError
    };

    // Invia al worker
    workerRef.current.postMessage({
      type: 'ocr',
      jobId,
      imageData,
      options: cleanOptions
    });

    return true;
  }, [isWorkerReady]);

  // Funzione per cancellare un job
  const cancelJob = useCallback((jobId: string) => {
    setJobs(prev => {
      const newJobs = new Map(prev);
      newJobs.delete(jobId);
      return newJobs;
    });
  }, []);

  // Funzione per ottenere il status di un job
  const getJobStatus = useCallback((jobId: string): OCRJob | undefined => {
    return jobs.get(jobId);
  }, [jobs]);

  // Funzione per ottenere tutti i job attivi
  const getActiveJobs = useCallback((): OCRJob[] => {
    return Array.from(jobs.values()).filter(job => 
      job.status === 'pending' || job.status === 'running'
    );
  }, [jobs]);

  // Funzione per pulire job completati
  const clearCompletedJobs = useCallback(() => {
    setJobs(prev => {
      const newJobs = new Map();
      for (const [id, job] of prev) {
        if (job.status === 'pending' || job.status === 'running') {
          newJobs.set(id, job);
        }
      }
      return newJobs;
    });
  }, []);

  return {
    // Status
    isWorkerReady,
    workerError,
    
    // Jobs management
    jobs: Array.from(jobs.values()),
    activeJobs: getActiveJobs(),
    
    // Actions
    startOCR,
    cancelJob,
    getJobStatus,
    clearCompletedJobs,
    
    // Utils
    isJobRunning: (jobId: string) => {
      const job = jobs.get(jobId);
      return job?.status === 'running' || job?.status === 'pending';
    },
    
    isJobCompleted: (jobId: string) => {
      const job = jobs.get(jobId);
      return job?.status === 'completed';
    },
    
    getJobResult: (jobId: string) => {
      const job = jobs.get(jobId);
      return job?.status === 'completed' ? job.result : null;
    }
  };
};