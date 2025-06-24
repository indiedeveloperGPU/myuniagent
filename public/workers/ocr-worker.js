// public/workers/ocr-worker.js
// Web Worker per OCR non-blocking

// Import Tesseract per il worker - Versione più stabile
importScripts('https://unpkg.com/tesseract.js@5.0.4/dist/tesseract.min.js');

// State del worker
let isInitialized = false;
let scheduler = null;

// Inizializza Tesseract Scheduler per performance ottimali
const initializeTesseract = async () => {
  if (isInitialized) return;
  
  try {
    // Verifica che Tesseract sia disponibile
    if (typeof Tesseract === 'undefined') {
      throw new Error('Tesseract.js not loaded');
    }
    
    // Crea scheduler per gestire job multipli
    scheduler = await Tesseract.createScheduler();
    
    // Aggiungi 2 worker per parallelizzazione
    const worker1 = await Tesseract.createWorker('ita');
    const worker2 = await Tesseract.createWorker('ita');
    
    scheduler.addWorker(worker1);
    scheduler.addWorker(worker2);
    
    isInitialized = true;
    
    // Informa il main thread che siamo pronti
    self.postMessage({
      type: 'initialized',
      message: 'OCR Worker ready with Tesseract v' + Tesseract.version
    });
    
  } catch (error) {
    self.postMessage({
      type: 'init_error',
      error: 'Failed to initialize Tesseract: ' + error.message
    });
  }
};

// Gestisce i messaggi dal main thread
self.onmessage = async function(e) {
  const { type, jobId, imageData, options = {} } = e.data;
  
  switch (type) {
    case 'init':
      await initializeTesseract();
      break;
      
    case 'ocr':
      await performOCR(jobId, imageData, options);
      break;
      
    case 'terminate':
      if (scheduler) {
        await scheduler.terminate();
      }
      self.close();
      break;
      
    default:
      self.postMessage({
        type: 'error',
        jobId,
        error: `Unknown message type: ${type}`
      });
  }
};

// Funzione principale OCR
// Funzione principale OCR
const performOCR = async (jobId, imageData, options) => {
  
  if (!isInitialized) {
    self.postMessage({
      type: 'error',
      jobId,
      error: 'Worker not initialized'
    });
    return;
  }
  
  try {
    // Invia status di inizio
    self.postMessage({
      type: 'started',
      jobId,
      message: 'OCR started'
    });

    // Progress 25%
    self.postMessage({
      type: 'progress',
      jobId,
      progress: 25,
      status: 'initializing'
    });
    // Configurazione OCR ottimizzata SENZA logger
    const ocrOptions = {
      // Parametri di qualità ottimizzati (solo valori serializzabili)
      tessedit_pageseg_mode: options.pageSegMode || '1', // Auto OSD
      tessedit_ocr_engine_mode: options.ocrEngineMode || '2', // LSTM only
      preserve_interword_spaces: '1',
      ...(options.customOptions || {})
      // RIMOSSO: logger (causava DataCloneError)
    };

    // Progress 50%
    self.postMessage({
      type: 'progress',
      jobId,
      progress: 50,
      status: 'processing'
    });

    // Esegui OCR con scheduler per performance (senza logger problematico)
    const result = await scheduler.addJob('recognize', imageData, ocrOptions);

    // Progress 95%
    self.postMessage({
      type: 'progress',
      jobId,
      progress: 95,
      status: 'finalizing'
    });
    
    // Invia risultato completo
    self.postMessage({
      type: 'complete',
      jobId,
      text: result.data.text.trim(),
      confidence: result.data.confidence,
      metadata: {
        processingTime: Date.now(),
        wordCount: result.data.words?.length || 0,
        lineCount: result.data.lines?.length || 0
      }
    });
    
  } catch (error) {
    console.error('🧵 Errore OCR:', error);
    // Invia errore dettagliato
    self.postMessage({
      type: 'error',
      jobId,
      error: error.message,
      stack: error.stack
    });
  }
};

// Gestione errori globali del worker
self.onerror = function(error) {
  self.postMessage({
    type: 'worker_error',
    error: error.message,
    filename: error.filename,
    lineno: error.lineno
  });
};

// Auto-inizializzazione del worker
initializeTesseract();
