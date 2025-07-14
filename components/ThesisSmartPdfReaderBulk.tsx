// File: components/ThesisSmartPdfReaderBulk.tsx
// Componente modale per caricare un PDF, selezionare sezioni di testo (materiali)
// e salvarle in un progetto di analisi tesi.

import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@radix-ui/react-dialog';
import { Document, Page, pdfjs } from 'react-pdf';
import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Imposta il percorso del worker per react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf-worker/pdf.worker.min.js";

// =================================================================
// TYPESCRIPT INTERFACES
// =================================================================
interface ChunkToSave {
  title: string;
  section?: string;
  content: string;
  pageRange?: string;
}

interface ThesisSmartPdfReaderBulkProps {
  isOpen: boolean;
  onClose: () => void;
  file: File | null;
  projectId: string;
  onChunkSaved: (newChunk: any) => void; // Callback per aggiornare la UI della dashboard
}

// =================================================================
// COMPONENT
// =================================================================
export default function ThesisSmartPdfReaderBulk({ 
  isOpen, 
  onClose, 
  file, 
  projectId,
  onChunkSaved 
}: ThesisSmartPdfReaderBulkProps) {
  
  // --- STATE MANAGEMENT ---
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.25);
  const [tempSelection, setTempSelection] = useState<string>("");

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [chunkToSave, setChunkToSave] = useState<ChunkToSave | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);

  // --- FUNCTIONS ---

  // Funzione per salvare il materiale tramite API
  const saveChunk = async (chunkData: ChunkToSave) => {
    if (!projectId) {
        toast.error("ID del progetto non disponibile.");
        return;
    }
    setIsSaving(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error('Utente non autenticato');

      const response = await fetch('/api/thesis-chunks/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          project_id: projectId,
          title: chunkData.title,
          section: chunkData.section,
          content: chunkData.content,
          page_range: chunkData.pageRange,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore nel salvataggio del materiale');
      }

      const savedData = await response.json();
      
      // Notifica il componente padre (la dashboard) che un nuovo materiale è stato aggiunto.
      onChunkSaved(savedData.chunk);

      toast.success(`✅ Materiale "${chunkData.title}" salvato nel progetto!`);
      
      // Reset
      clearSelection();
      setShowSaveModal(false);
      setChunkToSave(null);

    } catch (error: any) {
      console.error('Errore salvataggio materiale:', error);
      toast.error(`❌ ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Gestisce la selezione del testo nel PDF
  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const selectedText = selection.toString().trim();
    if (!selectedText || selectedText.length < 10) return;

    // Aggiunge la selezione allo stato temporaneo
    setTempSelection(prev => (prev ? `${prev}\n\n` : '') + selectedText);
    
    // Pulisce la selezione dal browser per una migliore UX
    setTimeout(() => selection.removeAllRanges(), 100);
  }, []);

  // Prepara e apre il modale di salvataggio
  const triggerSaveModal = () => {
    if (!tempSelection.trim()) {
      toast.error('❌ Nessun testo selezionato da salvare.');
      return;
    }
    setChunkToSave({
      title: '',
      section: '',
      content: tempSelection.trim(),
      pageRange: `Pagina ${pageNumber}` // Semplice, può essere migliorato
    });
    setShowSaveModal(true);
  };

  // Pulisce la selezione corrente
  const clearSelection = () => {
    setTempSelection("");
  };

  // Resetta lo stato quando il modale si chiude
  useEffect(() => {
    if (!isOpen) {
      setNumPages(null);
      setPageNumber(1);
      clearSelection();
    }
  }, [isOpen]);

  // --- RENDER ---
  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
        <DialogContent className="max-w-[95vw] w-full h-[95vh] flex flex-col p-4 bg-gray-100 dark:bg-gray-900 rounded-lg shadow-2xl">
          <DialogTitle className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Aggiungi Materiale al Progetto
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Seleziona il testo dal PDF per creare un nuovo materiale di analisi. Puoi selezionare testo da più pagine.
          </DialogDescription>

          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-hidden">
            
            {/* PDF Viewer Panel */}
            <div className="flex flex-col h-full bg-white dark:bg-gray-800 rounded-lg p-2 shadow-inner">
              <div className="flex items-center justify-center gap-4 mb-2 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                  <button onClick={() => setScale(s => Math.max(0.5, s - 0.25))} className="px-3 py-1 bg-gray-200 dark:bg-gray-600 rounded">-</button>
                  <span>{Math.round(scale * 100)}%</span>
                  <button onClick={() => setScale(s => Math.min(3, s + 0.25))} className="px-3 py-1 bg-gray-200 dark:bg-gray-600 rounded">+</button>
                  {numPages && (
                    <>
                      <button onClick={() => setPageNumber(p => Math.max(1, p - 1))} disabled={pageNumber <= 1}>←</button>
                      <span>Pagina {pageNumber} di {numPages}</span>
                      <button onClick={() => setPageNumber(p => Math.min(numPages, p + 1))} disabled={pageNumber >= numPages}>→</button>
                    </>
                  )}
              </div>
              <div ref={containerRef} onMouseUp={handleTextSelection} className="flex-1 overflow-auto border rounded">
                {file && (
                  <Document
                    file={file}
                    onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                    loading={<p>Caricamento PDF...</p>}
                    error={<p>Errore nel caricamento del PDF.</p>}
                  >
                    <Page pageNumber={pageNumber} scale={scale} />
                  </Document>
                )}
              </div>
            </div>

            {/* Selection and Save Panel */}
            <div className="flex flex-col h-full bg-white dark:bg-gray-800 rounded-lg p-4 shadow-inner">
              <h3 className="font-semibold text-lg mb-2">Testo Selezionato</h3>
              <textarea
                value={tempSelection}
                onChange={(e) => setTempSelection(e.target.value)}
                className="w-full flex-1 p-3 border rounded bg-gray-50 dark:bg-gray-900 text-sm resize-none font-mono leading-relaxed"
                placeholder="Seleziona il testo dal PDF a sinistra. Il testo apparirà qui..."
              />
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-gray-500">{tempSelection.length.toLocaleString()} caratteri selezionati</span>
                <button onClick={clearSelection} disabled={!tempSelection} className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50">Pulisci</button>
              </div>
              <button
                onClick={triggerSaveModal}
                disabled={!tempSelection.trim()}
                className="w-full mt-4 px-4 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 transition-all"
              >
                Salva come Nuovo Materiale
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Save Chunk Modal */}
      {showSaveModal && chunkToSave && (
        <Dialog open={showSaveModal} onOpenChange={setShowSaveModal}>
          <DialogContent className="max-w-md bg-white p-6 rounded-lg shadow-xl">
            <DialogTitle className="text-lg font-semibold text-gray-900 mb-4">
              Dettagli del Materiale
            </DialogTitle>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Titolo del Materiale *</label>
                <input
                  type="text"
                  value={chunkToSave.title}
                  onChange={(e) => setChunkToSave(prev => prev ? {...prev, title: e.target.value} : null)}
                  placeholder="Es. Capitolo 1: Introduzione"
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sezione / Riferimento (opzionale)</label>
                <input
                  type="text"
                  value={chunkToSave.section || ''}
                  onChange={(e) => setChunkToSave(prev => prev ? {...prev, section: e.target.value} : null)}
                  placeholder="Es. Paragrafi 1.1 - 1.3"
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setShowSaveModal(false)} className="flex-1 px-4 py-2 border rounded hover:bg-gray-100">Annulla</button>
                <button
                  onClick={() => saveChunk(chunkToSave)}
                  disabled={!chunkToSave.title.trim() || isSaving}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSaving ? 'Salvataggio...' : 'Conferma e Salva'}
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
