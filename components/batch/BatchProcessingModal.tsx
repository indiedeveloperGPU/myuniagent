import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose } from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

// 🎯 TYPES
interface Chunk {
  id: string;
  title: string;
  section: string | null;
  page_range: string | null;
  order_index: number;
  word_count: number;
  char_count: number;
  status: 'bozza' | 'pronto' | 'in_coda' | 'elaborazione' | 'completato' | 'errore';
  created_at: string;
}

interface BatchProcessingModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedChunks: Set<string>;
  chunks: Chunk[];
  onStartProcessing: () => Promise<void>;
  isProcessing: boolean;
}

export default function BatchProcessingModal({
  isOpen,
  onClose,
  selectedChunks,
  chunks,
  onStartProcessing,
  isProcessing
}: BatchProcessingModalProps) {
  
  // Calcola i dati dei chunks selezionati
  const selectedChunksData = chunks.filter(chunk => selectedChunks.has(chunk.id));
  const totalChars = selectedChunksData.reduce((sum, chunk) => sum + chunk.char_count, 0);
  const totalWords = selectedChunksData.reduce((sum, chunk) => sum + chunk.word_count, 0);

  const handleStartProcessing = async () => {
    await onStartProcessing();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {if (!open) onClose();}}>
      <DialogContent 
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <div className="bg-black/50 backdrop-blur-sm fixed inset-0" onClick={onClose} />
        <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-3xl max-h-[95vh] w-full mx-4 overflow-hidden animate-in zoom-in-95 duration-300">
          
          {/* Header - Compatto */}
          <div className="flex justify-between items-start p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 sticky top-0 z-10">
            <div>
              <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                ⚡ Avvia Elaborazione Lotti
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Elaborazione batch per <strong>{selectedChunks.size}</strong> sezioni selezionate
              </DialogDescription>
            </div>
            <DialogClose asChild>
              <button 
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                aria-label="Chiudi"
                disabled={isProcessing}
              >
                <X className="w-4 h-4" />
              </button>
            </DialogClose>
          </div>

          {/* Content Area - Dinamica */}
          <div className="overflow-y-auto max-h-[calc(95vh-160px)] p-4 space-y-4">
            
            {/* Descrizione operazione */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-700">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Conferma elaborazione batch:</strong> L'operazione verrà eseguita in background. 
                Una volta avviata, non sarà possibile annullarla. Potrai monitorare il progresso dalla sezione "⚡ Elaborazioni Chunk".
              </p>
            </div>

            {/* 📊 PREVIEW DELLE SEZIONI SELEZIONATE */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3 text-sm">
                📦 Anteprima Elaborazione
              </h4>
              
              {/* Statistiche generali */}
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                  <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {selectedChunks.size}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Sezioni</div>
                </div>
                <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded">
                  <div className="text-lg font-bold text-green-600 dark:text-green-400">
                    {Math.round(totalChars / 1000)}k
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Caratteri</div>
                </div>
                <div className="text-center p-2 bg-purple-50 dark:bg-purple-900/20 rounded">
                  <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                    {totalWords.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Parole</div>
                </div>
              </div>

              {/* Lista delle sezioni selezionate - Compatta */}
              <div className="space-y-1">
                <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  📄 Sezioni da elaborare:
                </h5>
                <div className="max-h-32 overflow-y-auto space-y-1 bg-white dark:bg-gray-800 rounded p-2 border">
                  {selectedChunksData.slice(0, 8).map((chunk) => (
                    <div key={chunk.id} className="flex justify-between items-center text-xs py-1">
                      <span className="text-gray-900 dark:text-gray-100 truncate flex-1 mr-2">
                        {chunk.order_index}. {chunk.title}
                      </span>
                      <span className="text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap font-mono">
                        {Math.round(chunk.char_count / 1000)}k
                      </span>
                    </div>
                  ))}
                  {selectedChunksData.length > 8 && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 italic text-center py-1 border-t">
                      ... e altre {selectedChunksData.length - 8} sezioni
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ⚠️ AVVISO IMPORTANTE - Compatto */}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <span className="text-yellow-600 dark:text-yellow-400 text-sm">⚠️</span>
                <div>
                  <h5 className="font-medium text-yellow-800 dark:text-yellow-200 text-sm mb-1">
                    Importante
                  </h5>
                  <p className="text-xs text-yellow-700 dark:text-yellow-300">
                    Una volta avviata, l'elaborazione non potrà essere interrotta. Monitoraggio disponibile nella dashboard.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Sticky - Sempre Visibile */}
          <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={isProcessing}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                ❌ Annulla
              </button>
              <button
                onClick={handleStartProcessing}
                disabled={isProcessing || selectedChunks.size === 0}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium text-sm"
              >
                {isProcessing ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full"></div>
                    ⏳ Avviando...
                  </span>
                ) : (
                  `🚀 Avvia Elaborazione (${selectedChunks.size})`
                )}
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}