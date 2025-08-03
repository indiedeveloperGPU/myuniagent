import { useState } from "react";
import { toast } from "react-hot-toast";
import { supabase } from "@/lib/supabaseClient";
import * as Dialog from '@radix-ui/react-dialog';

// 🎯 INTERFACES
interface ThesisProject {
  id: string;
  project_title: string;
  faculty: string;
  thesis_topic: string;
  level: 'triennale' | 'magistrale' | 'dottorato';
  status: 'active' | 'completed' | 'abandoned';
}

interface BatchAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ThesisProject;
  selectedChunks: Set<string>;
  onSuccess: () => void;
}

// 🎯 HELPER: Tipi di analisi validi per livello
const getAvailableAnalysisTypes = (level: string) => {
  const analysisTypes = {
    triennale: [
      { key: 'analisi_strutturale', name: 'Analisi Strutturale', description: 'Valutazione organizzazione logica e coerenza espositiva' },
      { key: 'analisi_metodologica', name: 'Analisi Metodologica', description: 'Appropriatezza e applicazione del metodo di ricerca' },
      { key: 'analisi_contenuti', name: 'Analisi dei Contenuti', description: 'Padronanza degli argomenti e qualità dei contenuti' },
      { key: 'analisi_bibliografica', name: 'Analisi Bibliografica', description: 'Qualità e pertinenza delle fonti utilizzate' },
      { key: 'analisi_formale', name: 'Analisi Formale', description: 'Correttezza espositiva e linguistica' },
      { key: 'analisi_coerenza_argomentativa', name: 'Coerenza Argomentativa', description: 'Logica e consistenza delle argomentazioni' },
      { key: 'analisi_originalita_contributo', name: 'Originalità del Contributo', description: 'Elementi di novità e contributo personale' },
      { key: 'analisi_rilevanza_disciplinare', name: 'Rilevanza Disciplinare', description: 'Significatività nel contesto disciplinare' }
    ],
    magistrale: [
      { key: 'analisi_strutturale_avanzata', name: 'Strutturale Avanzata', description: 'Architettura argomentativa complessa' },
      { key: 'analisi_metodologica_rigorosa', name: 'Metodologica Rigorosa', description: 'Rigore scientifico e innovazione metodologica' },
      { key: 'analisi_contenuti_specialistici', name: 'Contenuti Specialistici', description: 'Profondità e specializzazione disciplinare' },
      { key: 'analisi_critica_sintetica', name: 'Critica e Sintetica', description: 'Capacità di analisi e sintesi critica' },
      { key: 'analisi_bibliografica_completa', name: 'Bibliografica Completa', description: 'Completezza dello stato dell\'arte' },
      { key: 'analisi_empirica_sperimentale', name: 'Empirica/Sperimentale', description: 'Validità di dati e sperimentazione' },
      { key: 'analisi_implicazioni', name: 'Delle Implicazioni', description: 'Rilevanza teorica e pratica' },
      { key: 'analisi_innovazione_metodologica', name: 'Innovazione Metodologica', description: 'Originalità nell\'approccio metodologico' },
      { key: 'analisi_validita_statistica', name: 'Validità Statistica', description: 'Robustezza statistica e validità dei risultati' },
      { key: 'analisi_applicabilita_pratica', name: 'Applicabilità Pratica', description: 'Trasferibilità e utilità pratica' },
      { key: 'analisi_limiti_criticita', name: 'Limiti e Criticità', description: 'Identificazione limitazioni e criticità' },
      { key: 'analisi_posizionamento_teorico', name: 'Posizionamento Teorico', description: 'Collocazione nel panorama teorico' }
    ],
    dottorato: [
      { key: 'analisi_originalita_scientifica', name: 'Originalità Scientifica', description: 'Innovazione e contributo alla conoscenza' },
      { key: 'analisi_metodologica_frontiera', name: 'Metodologica di Frontiera', description: 'Sofisticazione metodologica avanzata' },
      { key: 'analisi_stato_arte_internazionale', name: 'Stato dell\'Arte Internazionale', description: 'Completezza panorama internazionale' },
      { key: 'analisi_framework_teorico', name: 'Framework Teorico', description: 'Solidità dell\'impianto teorico' },
      { key: 'analisi_empirica_avanzata', name: 'Empirica Avanzata', description: 'Robustezza dati e validazione avanzata' },
      { key: 'analisi_critica_profonda', name: 'Critica Profonda', description: 'Discussione critica approfondita' },
      { key: 'analisi_impatto_scientifico', name: 'Impatto Scientifico', description: 'Potenziale impatto sulla disciplina' },
      { key: 'analisi_riproducibilita', name: 'Riproducibilità', description: 'Trasparenza e replicabilità' },
      { key: 'analisi_standard_internazionali', name: 'Standard Internazionali', description: 'Conformità standard internazionali' },
      { key: 'analisi_significativita_statistica', name: 'Significatività Statistica', description: 'Robustezza statistica avanzata' },
      { key: 'analisi_etica_ricerca', name: 'Etica della Ricerca', description: 'Aspetti etici e deontologici' },
      { key: 'analisi_sostenibilita_metodologica', name: 'Sostenibilità Metodologica', description: 'Sostenibilità dell\'approccio metodologico' },
      { key: 'analisi_interdisciplinarieta', name: 'Interdisciplinarità', description: 'Approcci interdisciplinari e multidisciplinari' },
      { key: 'analisi_scalabilita_risultati', name: 'Scalabilità Risultati', description: 'Generalizzabilità e scalabilità' },
      { key: 'analisi_pubblicabilita_internazionale', name: 'Pubblicabilità Internazionale', description: 'Potenziale pubblicazione riviste internazionali' },
      { key: 'analisi_gap_conoscenza_colmato', name: 'Gap di Conoscenza', description: 'Lacune conoscitive colmate dalla ricerca' }
    ]
  };

  return analysisTypes[level as keyof typeof analysisTypes] || [];
};

export default function BatchAnalysisModal({ 
  isOpen, 
  onClose, 
  project, 
  selectedChunks, 
  onSuccess 
}: BatchAnalysisModalProps) {
  const [selectedAnalysisType, setSelectedAnalysisType] = useState("");
  const [isBatchLoading, setIsBatchLoading] = useState(false);
  const [isBulkLoading, setIsBulkLoading] = useState(false);

  // 🚀 ESECUZIONE BATCH ANALYSIS
  const handleBatchAnalysis = async () => {
    if (!selectedAnalysisType) {
      toast.error("❌ Seleziona il tipo di analisi");
      return;
    }

    setIsBatchLoading(true);

    try {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      if (!accessToken) {
        toast.error("❌ Sessione scaduta");
        return;
      }

      const response = await fetch('/api/thesis-batch/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          project_id: project.id,
          chunk_ids: Array.from(selectedChunks),
          analysis_type: selectedAnalysisType
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success(`🚀 ${result.message}`, { duration: 8000 });
        
        // Reset stato e chiudi modal
        setSelectedAnalysisType("");
        onSuccess();
        onClose();
        
        if (result.details) {
          setTimeout(() => {
            toast.success(`📊 ${result.details.total_chunks} chunk in analisi "${result.details.analysis_type}".`, { duration: 10000 });
          }, 1000);
        }
      } else {
        toast.error(`❌ ${result.error || 'Errore nella creazione del batch job'}`);
      }
    } catch (error) {
      console.error('Errore batch analysis:', error);
      toast.error("❌ Errore durante la creazione del batch job");
    } finally {
      setIsBatchLoading(false);
    }
  };

  // 🚀 ESECUZIONE BULK ANALYSIS - ANALISI COMPLETA
const handleBulkAnalysis = async () => {
  setIsBulkLoading(true);

  try {
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;
    if (!accessToken) {
      toast.error("❌ Sessione scaduta");
      return;
    }

    const response = await fetch('/api/thesis-batch/bulk-create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        project_id: project.id,
        chunk_ids: Array.from(selectedChunks)
      })
    });

    const result = await response.json();

    if (response.ok && result.success) {
      toast.success(`🎯 ${result.message}`, { duration: 12000 });
      
      // Reset stato e chiudi modal
      setSelectedAnalysisType("");
      onSuccess();
      onClose();
      
      if (result.details) {
        setTimeout(() => {
          toast.success(`📊 ${result.details.total_jobs_created} analisi complete avviate per ${result.details.project_level}. Tempo stimato: ${result.details.estimated_completion_time}.`, { duration: 15000 });
        }, 1500);
      }
    } else {
      toast.error(`❌ ${result.error || 'Errore nella creazione delle analisi complete'}`);
    }
  } catch (error) {
    console.error('Errore bulk analysis:', error);
    toast.error("❌ Errore durante la creazione delle analisi complete");
  } finally {
    setIsBulkLoading(false);
  }
};

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="bg-black/50 fixed inset-0 z-50 animate-in fade-in-0" />
        <Dialog.Content 
          className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-4xl w-full max-h-[90vh] animate-in zoom-in-95 duration-300 flex flex-col"
        >
          {/* Header */}
          <div className="flex justify-between items-start p-6 border-b border-gray-200 dark:border-gray-700">
            <div>
              <Dialog.Title className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                🚀 Analisi Batch
              </Dialog.Title>
              <Dialog.Description className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Configura l'analisi batch per {selectedChunks.size} chunk selezionati
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                aria-label="Chiudi"
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </Dialog.Close>
          </div>

          {/* Content (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Progetti Info */}
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/30 dark:to-blue-900/30 p-4 rounded-xl border border-purple-200 dark:border-purple-700 mb-6">
              <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">
                📊 Dettagli Progetto
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-purple-700 dark:text-purple-300">Titolo:</span>
                  <p className="text-gray-700 dark:text-gray-300">{project.project_title}</p>
                </div>
                <div>
                  <span className="font-medium text-purple-700 dark:text-purple-300">Livello:</span>
                  <p className="text-gray-700 dark:text-gray-300">{project.level.toUpperCase()}</p>
                </div>
                <div>
                  <span className="font-medium text-purple-700 dark:text-purple-300">Facoltà:</span>
                  <p className="text-gray-700 dark:text-gray-300">{project.faculty}</p>
                </div>
                <div>
                  <span className="font-medium text-purple-700 dark:text-purple-300">Chunk selezionati:</span>
                  <p className="text-gray-700 dark:text-gray-300">{selectedChunks.size} chunk</p>
                </div>
              </div>
            </div>

            {/* Selezione Tipo Analisi */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                🎯 Tipo di Analisi da Eseguire
              </label>
              <select
                value={selectedAnalysisType}
                onChange={(e) => setSelectedAnalysisType(e.target.value)}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all max-h-60 overflow-y-auto"
              >
                <option value="">Seleziona il tipo di analisi</option>
                {getAvailableAnalysisTypes(project.level).map((analysis) => (
                  <option key={analysis.key} value={analysis.key}>
                    {analysis.name}
                  </option>
                ))}
              </select>
              
              {selectedAnalysisType && (
                <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <strong>Descrizione:</strong> {getAvailableAnalysisTypes(project.level).find(a => a.key === selectedAnalysisType)?.description}
                  </p>
                </div>
              )}
            </div>

            {/* Limitazioni */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <span>ℹ️</span> Informazioni Importanti
              </h4>
              <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                <li>• Massimo 50 chunk per batch job</li>
                <li>• I risultati saranno disponibili nella dashboard quando completati</li>
                <li>• Ogni tipo di analisi può essere eseguito solo una volta per progetto</li>
              </ul>
            </div>
          </div>

          {/* Footer Actions */}
<div className="flex justify-between items-center p-6 border-t border-gray-200 dark:border-gray-700">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              💡 Analisi Completa esegue tutte le {getAvailableAnalysisTypes(project.level).length} analisi per {project.level}
            </div>
            
            <div className="flex gap-3">
              {/* Pulsante Analisi Completa */}
              <button
                onClick={handleBulkAnalysis}
                disabled={isBulkLoading || isBatchLoading}
                className="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium flex items-center gap-2"
              >
                {isBulkLoading ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                    Avvio Completo...
                  </>
                ) : (
                  <>
                    🎯 Analisi Completa ({getAvailableAnalysisTypes(project.level).length})
                  </>
                )}
              </button>

              {/* Pulsante Analisi Singola */}
              <button
                onClick={handleBatchAnalysis}
                disabled={!selectedAnalysisType || isBatchLoading || isBulkLoading}
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium flex items-center gap-2"
              >
                {isBatchLoading ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                    Creazione...
                  </>
                ) : (
                  <>
                    🚀 Analisi Singola
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