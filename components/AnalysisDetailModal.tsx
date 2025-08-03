import { useState } from "react";
import * as Dialog from '@radix-ui/react-dialog';
import { toast } from "react-hot-toast";

// 🎯 ENTERPRISE TYPESCRIPT INTERFACES
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
  input_preview?: string;
  output_preview?: string;
  project_details: {
    title: string;
    level: string;
    faculty: string;
  };
}

interface AnalysisDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: ThesisAnalysisResult;
}

export default function AnalysisDetailModal({ 
  isOpen, 
  onClose, 
  analysis 
}: AnalysisDetailModalProps) {
  // 🎯 STATE MANAGEMENT
  const [activeTab, setActiveTab] = useState<'output' | 'input' | 'metadata'>('output');
  const [isExporting, setIsExporting] = useState(false);

  // 🎨 HELPER FUNCTIONS
  const getAnalysisTypeColor = (analysisType: string) => {
    const colorMap: Record<string, string> = {
      'analisi_strutturale': 'from-blue-500 to-blue-600',
      'analisi_metodologica': 'from-green-500 to-green-600',
      'analisi_contenuti': 'from-purple-500 to-purple-600',
      'analisi_bibliografica': 'from-orange-500 to-orange-600',
      'analisi_formale': 'from-pink-500 to-pink-600',
      'analisi_empirica_sperimentale': 'from-teal-500 to-teal-600',
      'analisi_critica_sintetica': 'from-indigo-500 to-indigo-600'
    };

    return colorMap[analysisType] || 'from-gray-500 to-gray-600';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getBatchJobBadge = (batchJobId?: string) => {
    if (batchJobId) {
      return (
        <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
          🚀 Analisi Batch
          <span className="ml-2 text-xs opacity-75">ID: {batchJobId.substring(0, 8)}...</span>
        </div>
      );
    }
    return (
      <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
        ⚡ Analisi Singola
      </div>
    );
  };

  // 📤 EXPORT FUNCTIONS
  const exportToTxt = () => {
    setIsExporting(true);
    try {
      const content = `ANALISI: ${analysis.analysis_name}
PROGETTO: ${analysis.project_details.title}
CHUNK: #${analysis.chunk_number}
DATA: ${formatDate(analysis.created_at)}
LIVELLO: ${analysis.project_details.level.toUpperCase()}
FACOLTÀ: ${analysis.project_details.faculty}

=== TESTO ANALIZZATO ===
${analysis.input_text}

=== RISULTATO ANALISI ===
${analysis.output_analysis}

=== METADATA ===
${analysis.processing_metadata ? JSON.stringify(analysis.processing_metadata, null, 2) : 'Nessun metadata disponibile'}
`;

      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `analisi_${analysis.analysis_type}_chunk${analysis.chunk_number}_${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success("📄 File esportato con successo!");
    } catch (error) {
      toast.error("❌ Errore durante l'esportazione");
    } finally {
      setIsExporting(false);
    }
  };

  const copyToClipboard = async (content: string, type: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success(`📋 ${type} copiato negli appunti!`);
    } catch (error) {
      toast.error("❌ Errore durante la copia");
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="bg-black/50 fixed inset-0 z-50 animate-in fade-in-0" />
        <Dialog.Content 
          className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-6xl w-full max-h-[95vh] animate-in zoom-in-95 duration-300 flex flex-col"
        >
          {/* 🎯 HEADER */}
          <div className="flex justify-between items-start p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex-1">
              <Dialog.Title className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3 mb-2">
                <div className={`w-10 h-10 bg-gradient-to-r ${getAnalysisTypeColor(analysis.analysis_type)} rounded-xl flex items-center justify-center text-white text-xl`}>
                  🎯
                </div>
                {analysis.analysis_name}
              </Dialog.Title>
              
              <Dialog.Description className="text-gray-600 dark:text-gray-400 mb-3">
                Dettaglio completo dell'analisi AI eseguita sul chunk #{analysis.chunk_number}
              </Dialog.Description>

              {/* Project Info */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  📚 <strong>{analysis.project_details.title}</strong>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  🏛️ {analysis.project_details.faculty}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  📅 {formatDate(analysis.created_at)}
                </div>
                {getBatchJobBadge(analysis.batch_job_id)}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Export Button */}
              <button
                onClick={exportToTxt}
                disabled={isExporting}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors flex items-center gap-2"
                title="Esporta in TXT"
              >
                {isExporting ? (
                  <div className="animate-spin w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full"></div>
                ) : (
                  <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                )}
              </button>

              {/* Close Button */}
              <Dialog.Close asChild>
                <button
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  aria-label="Chiudi"
                >
                  <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </Dialog.Close>
            </div>
          </div>

          {/* 📊 STATISTICS BAR */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 dark:text-gray-400">📏 Input:</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {analysis.input_text.length.toLocaleString()} caratteri
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 dark:text-gray-400">📝 Output:</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {analysis.output_analysis.length.toLocaleString()} caratteri
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 dark:text-gray-400">📊 Rapporto:</span>
                  <span className="font-semibold text-purple-600 dark:text-purple-400">
                    {Math.round((analysis.output_analysis.length / analysis.input_text.length) * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 📑 TAB NAVIGATION */}
          <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6">
            <div className="flex space-x-1">
              <button
                onClick={() => setActiveTab('output')}
                className={`px-4 py-3 text-sm font-medium rounded-t-lg transition-all ${
                  activeTab === 'output'
                    ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 border-b-2 border-purple-500'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                🎯 Risultato Analisi
              </button>
              <button
                onClick={() => setActiveTab('input')}
                className={`px-4 py-3 text-sm font-medium rounded-t-lg transition-all ${
                  activeTab === 'input'
                    ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 border-b-2 border-purple-500'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                📋 Testo Originale
              </button>
            </div>
          </div>

          {/* 📄 CONTENT AREA (Scrollable) */}
          <div className="flex-1 overflow-y-auto">
            {/* OUTPUT TAB */}
            {activeTab === 'output' && (
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    🎯 Risultato dell'Analisi
                  </h3>
                  <button
                    onClick={() => copyToClipboard(analysis.output_analysis, 'Risultato analisi')}
                    className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors flex items-center gap-2"
                  >
                    📋 Copia
                  </button>
                </div>
                
                <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl p-6 border border-purple-200 dark:border-purple-700">
                  <div className="prose dark:prose-invert max-w-none">
                    <div className="whitespace-pre-wrap text-gray-800 dark:text-gray-200 leading-relaxed">
                      {analysis.output_analysis}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* INPUT TAB */}
            {activeTab === 'input' && (
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    📋 Testo Originale Analizzato
                  </h3>
                  <button
                    onClick={() => copyToClipboard(analysis.input_text, 'Testo originale')}
                    className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors flex items-center gap-2"
                  >
                    📋 Copia
                  </button>
                </div>
                
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-xl p-6 border border-gray-200 dark:border-gray-600">
                  <div className="prose dark:prose-invert max-w-none">
                    <div className="whitespace-pre-wrap text-gray-800 dark:text-gray-200 leading-relaxed font-mono text-sm">
                      {analysis.input_text}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 🎯 FOOTER ACTIONS */}
          <div className="flex justify-between items-center p-6 border-t border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              ID Analisi: <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs">{analysis.id}</code>
            </div>
            
            <div className="flex gap-3">
              <Dialog.Close asChild>
                <button className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
                  Chiudi
                </button>
              </Dialog.Close>
              
              <button
                onClick={exportToTxt}
                disabled={isExporting}
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 transition-all font-medium flex items-center gap-2"
              >
                {isExporting ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                    Esportando...
                  </>
                ) : (
                  <>
                    📄 Esporta TXT
                  </>
                )}
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}