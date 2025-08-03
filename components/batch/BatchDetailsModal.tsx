import { Dialog, DialogContent, DialogTitle, DialogClose } from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { toast } from 'react-hot-toast';

// 🎯 TYPES
interface BatchJob {
  id: string;
  status: 'in_coda' | 'elaborazione' | 'completato' | 'fallito' | 'annullato';
  total_chunks: number;
  processed_chunks: number;
  estimated_cost_usd: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  progress_percentage?: number;
}

interface BatchResult {
  id: string;
  title: string;
  section?: string;
  char_count: number;
  order_index: number;
  status: 'in_attesa' | 'elaborazione' | 'completato' | 'fallito';
  input_tokens?: number;
  output_tokens?: number;
  cost_usd?: number;
  processing_time_ms?: number;
  error_message?: string;
  completed_at?: string;
  retry_count?: number;
  has_result?: boolean;
}

interface BatchDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  batchJob: BatchJob | null;
  batchResults: BatchResult[];
  onLoadResults: (jobId: string) => Promise<void>;
  getStatusColor: (status: string) => string;
}

export default function BatchDetailsModal({
  isOpen,
  onClose,
  batchJob,
  batchResults,
  onLoadResults,
  getStatusColor
}: BatchDetailsModalProps) {

  if (!batchJob) return null;

  // Funzioni per gestire le azioni del modal
  const handleViewResults = () => {
    // TODO: Navigate to results view
    toast('🚧 Visualizzazione risultati in sviluppo');
  };

  const handleRetryFailed = () => {
    // TODO: Implement retry failed chunks
    toast('🚧 Riprova sezioni fallite in sviluppo');
  };

  // Traduzione stati per l'interfaccia italiana
  const getStatusLabel = (status: string) => {
    const statusLabels = {
      'in_coda': 'In Coda',
      'elaborazione': 'Elaborazione',
      'completato': 'Completato',
      'fallito': 'Fallito',
      'annullato': 'Annullato',
      'in_attesa': 'In Attesa'
    };
    return statusLabels[status as keyof typeof statusLabels] || status;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {if (!open) onClose();}}>
      <DialogContent 
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <div className="bg-black/50 backdrop-blur-sm fixed inset-0" onClick={onClose} />
        <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-5xl max-h-[95vh] w-full mx-4 overflow-hidden animate-in zoom-in-95 duration-300">
          
          {/* Header - Compatto */}
          <div className="flex justify-between items-start p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 sticky top-0 z-10">
            <div>
              <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                📊 Dettagli Elaborazione Chunk
              </DialogTitle>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Batch ID: <span className="font-mono text-xs">{batchJob.id.slice(-12)}</span> • 
                Creato: {new Date(batchJob.created_at).toLocaleDateString('it-IT')}
              </div>
            </div>
            <DialogClose asChild>
              <button 
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                aria-label="Chiudi"
              >
                <X className="w-4 h-4" />
              </button>
            </DialogClose>
          </div>

          {/* Content Area - Dinamica */}
          <div className="overflow-y-auto max-h-[calc(95vh-180px)] p-4 space-y-4">
            
            {/* 📈 JOB OVERVIEW - Compatto */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
                <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                  {batchJob.processed_chunks}/{batchJob.total_chunks}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Sezioni</div>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                <div className="text-xl font-bold text-green-600 dark:text-green-400">
                  {batchJob.progress_percentage || 0}%
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Progresso</div>
              </div>
              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-center">
                <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                  {new Date(batchJob.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Creato</div>
              </div>
              <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-center">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(batchJob.status)}`}>
                  {getStatusLabel(batchJob.status)}
                </span>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Stato</div>
              </div>
            </div>

            {/* 📋 INFORMAZIONI AGGIUNTIVE - Inline */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-xs">
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Creato:</span>
                <div className="text-gray-600 dark:text-gray-400">
                  {new Date(batchJob.created_at).toLocaleString('it-IT', { 
                    day: '2-digit', 
                    month: '2-digit', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </div>
              </div>
              {batchJob.started_at && (
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Avviato:</span>
                  <div className="text-gray-600 dark:text-gray-400">
                    {new Date(batchJob.started_at).toLocaleString('it-IT', { 
                      day: '2-digit', 
                      month: '2-digit', 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                </div>
              )}
              {batchJob.completed_at && (
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Completato:</span>
                  <div className="text-gray-600 dark:text-gray-400">
                    {new Date(batchJob.completed_at).toLocaleString('it-IT', { 
                      day: '2-digit', 
                      month: '2-digit', 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                </div>
              )}
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Durata:</span>
                <div className="text-gray-600 dark:text-gray-400">
                  {batchJob.completed_at && batchJob.started_at
                    ? `${Math.round((new Date(batchJob.completed_at).getTime() - new Date(batchJob.started_at).getTime()) / 60000)}min`
                    : batchJob.started_at
                      ? `${Math.round((Date.now() - new Date(batchJob.started_at).getTime()) / 60000)}min`
                      : 'N/A'
                  }
                </div>
              </div>
            </div>

            {/* 📊 PROGRESS BAR - Compatto */}
            {batchJob.status === 'elaborazione' && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    🔄 Elaborazione in corso...
                  </span>
                  <span className="text-sm text-blue-700 dark:text-blue-300 font-mono">
                    {batchJob.progress_percentage}%
                  </span>
                </div>
                <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${batchJob.progress_percentage}%` }}
                  ></div>
                </div>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  {batchJob.processed_chunks} di {batchJob.total_chunks} sezioni completate
                </p>
              </div>
            )}

            {/* 📄 RESULTS TABLE - Ottimizzata */}
            <div className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
              <div className="p-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 sticky top-0">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                    📄 Risultati per Sezione ({batchResults.length})
                  </h4>
                  {batchResults.length > 0 && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {batchResults.filter(r => r.status === 'completato').length} completate
                    </div>
                  )}
                </div>
              </div>

              {/* Gestione degli stati del batch */}
              {batchJob.status === 'fallito' ? (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 text-center">
                  <div className="text-3xl mb-2">❌</div>
                  <h5 className="font-semibold text-red-800 dark:text-red-200 text-sm mb-1">
                    Batch Fallito
                  </h5>
                  <p className="text-xs text-red-700 dark:text-red-300">
                    L'elaborazione non è stata avviata. Causa probabile: il piano attuale non supporta la modalità batch.
                  </p>
                </div>
              ) : batchResults.length === 0 && batchJob.status !== 'elaborazione' ? (
                <div className="p-4 text-center">
                  <div className="text-3xl mb-2">📭</div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    Nessun risultato da mostrare.
                  </p>
                  <button
                    onClick={() => onLoadResults(batchJob.id)}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-all"
                  >
                    🔄 Ricarica Risultati
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-600">
                  {batchResults.map((result, index) => (
                    <div key={result.id} className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all">
                      
                      {/* Header compatto della sezione */}
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1 min-w-0">
                          <h5 className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">
                            #{result.order_index} {result.title || `Sezione ${result.id.slice(-8)}`}
                          </h5>
                          {result.section && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                              📚 {result.section}
                            </p>
                          )}
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ml-2 flex-shrink-0 ${getStatusColor(result.status)}`}>
                          {getStatusLabel(result.status)}
                        </span>
                      </div>

                      {/* Statistiche inline */}
                      <div className="flex flex-wrap gap-4 mb-2 text-xs text-gray-500 dark:text-gray-400">
                        <span>{result.char_count.toLocaleString()} caratteri</span>
                        {result.processing_time_ms && (
                          <span>⏱️ {(result.processing_time_ms / 1000).toFixed(1)}s</span>
                        )}
                        {result.retry_count && result.retry_count > 0 && (
                          <span>🔄 {result.retry_count} tentativi</span>
                        )}
                        {result.has_result && (
                          <span className="text-green-600 dark:text-green-400">✅ Pronto</span>
                        )}
                      </div>
                      
                      {/* Messaggio di errore compatto */}
                      {result.error_message && (
                        <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded text-xs">
                          <div className="flex items-start gap-1">
                            <span className="text-red-600 dark:text-red-400 flex-shrink-0">⚠️</span>
                            <div className="min-w-0">
                              <strong className="text-red-800 dark:text-red-200">Errore:</strong>
                              <p className="text-red-700 dark:text-red-300 mt-1 truncate" title={result.error_message}>
                                {result.error_message}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Data di completamento */}
                      {result.completed_at && (
                        <div className="mt-1 text-xs text-gray-400">
                          ✅ {new Date(result.completed_at).toLocaleString('it-IT', { 
                            day: '2-digit', 
                            month: '2-digit', 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer Sticky - Sempre Visibile */}
          <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-600 p-4">
            <div className="flex flex-wrap gap-2 justify-between items-center">
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all text-sm"
                >
                  ❌ Chiudi
                </button>
                
                {batchJob.status === 'completato' && (
                  <button
                    onClick={handleViewResults}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm"
                  >
                    📄 Visualizza Riassunti
                  </button>
                )}
                
                {['fallito', 'completato'].includes(batchJob.status) && (
                  <button
                    onClick={handleRetryFailed}
                    className="px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-all text-sm"
                  >
                    🔄 Riprova Fallite
                  </button>
                )}
              </div>

              <div className="flex gap-2 items-center">
                <button
                  onClick={() => onLoadResults(batchJob.id)}
                  className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all text-sm"
                >
                  🔄 Aggiorna Dati
                </button>
                
                {/* Status indicator */}
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <div className={`w-2 h-2 rounded-full ${
                    batchJob.status === 'elaborazione' ? 'bg-blue-500 animate-pulse' :
                    batchJob.status === 'completato' ? 'bg-green-500' :
                    batchJob.status === 'fallito' ? 'bg-red-500' :
                    'bg-gray-400'
                  }`}></div>
                  {getStatusLabel(batchJob.status)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
