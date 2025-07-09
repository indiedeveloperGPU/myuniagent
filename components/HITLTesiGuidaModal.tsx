import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose } from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

interface HITLTesiGuidaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HITLTesiGuidaModal({ isOpen, onClose }: HITLTesiGuidaModalProps) {
  const [currentTab, setCurrentTab] = useState<'overview' | 'triennale' | 'magistrale' | 'dottorato' | 'workflow'>('overview');

  const tabs = [
    { id: 'overview', label: '🎯 Panoramica', icon: '🎓' },
    { id: 'triennale', label: 'Triennale', icon: '📖' },
    { id: 'magistrale', label: 'Magistrale', icon: '📚' },
    { id: 'dottorato', label: 'Dottorato', icon: '🔬' },
    { id: 'workflow', label: 'Workflow', icon: '⚡' }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {if (!open) onClose();}}>
      <DialogContent 
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <div className="bg-black/50 fixed inset-0" onClick={onClose} />
        <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-4xl max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300">
          
          {/* Header */}
          <div className="flex justify-between items-start p-6 border-b border-gray-200 dark:border-gray-700">
            <div>
              <DialogTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">
                🎓 Guida Completa: Analisi Tesi Enterprise con AgenteFox
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                Sistema professionale di analisi accademica per tesi universitarie di ogni livello
              </DialogDescription>
            </div>
            <DialogClose asChild>
              <button 
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                aria-label="Chiudi"
              >
                <X className="w-5 h-5" />
              </button>
            </DialogClose>
          </div>

          {/* TABS NAVIGATION */}
          <div className="flex space-x-1 mb-6 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg mx-6 mt-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id as any)}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all ${
                  currentTab === tab.id
                    ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400'
                }`}
              >
                <span className="mr-1">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* CONTENT AREA */}
          <div className="overflow-y-auto max-h-[60vh] space-y-4 px-6">
            
            {/* OVERVIEW TAB */}
            {currentTab === 'overview' && (
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/30 dark:to-blue-900/30 p-6 rounded-xl border border-purple-200 dark:border-purple-700">
                  <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100 mb-3 flex items-center gap-2">
                    🧠 AgenteFox: Il Tuo Relatore Esperto
                  </h3>
                  <p className="text-purple-800 dark:text-purple-200 text-sm leading-relaxed mb-4">
                    AgenteFox è un sistema di intelligenza artificiale avanzata che simula un <strong>relatore universitario esperto</strong>, 
                    capace di condurre analisi accademiche approfondite secondo gli standard più elevati.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-purple-200 dark:border-purple-600">
                      <div className="text-purple-600 dark:text-purple-400 font-semibold text-sm mb-2">📖 TRIENNALE</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">8 analisi specializzate</div>
                      <div className="text-xs text-purple-700 dark:text-purple-300">Focus su comprensione e applicazione</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-purple-200 dark:border-purple-600">
                      <div className="text-purple-600 dark:text-purple-400 font-semibold text-sm mb-2">📚 MAGISTRALE</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">12 analisi avanzate</div>
                      <div className="text-xs text-purple-700 dark:text-purple-300">Focus su approfondimento critico</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-purple-200 dark:border-purple-600">
                      <div className="text-purple-600 dark:text-purple-400 font-semibold text-sm mb-2">🔬 DOTTORATO</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">16 analisi di frontiera</div>
                      <div className="text-xs text-purple-700 dark:text-purple-300">Focus su contributo scientifico</div>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-900/30 p-4 rounded-lg border border-yellow-200 dark:border-yellow-700">
                  <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2 flex items-center gap-2">
                    💡 Filosofia Human-in-the-Loop (HITL)
                  </h4>
                  <p className="text-yellow-700 dark:text-yellow-300 text-sm">
                    <strong>Tu sei il vero esperto semantico!</strong> Seleziona intelligentemente solo il contenuto rilevante della tua tesi. 
                    AgenteFox analizza esclusivamente quello che scegli, garantendo qualità massima e zero allucinazioni.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-lg border border-green-200 dark:border-green-700">
                    <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2">✅ Vantaggi Chiave</h4>
                    <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
                      <li>• <strong>Analisi professionali</strong> da relatore esperto</li>
                      <li>• <strong>Standard accademici</strong> per ogni livello</li>
                      <li>• <strong>Progetti multi-parte</strong> per tesi lunghe</li>
                      <li>• <strong>Risultati immediati</strong> e utilizzabili</li>
                      <li>• <strong>Export professionale</strong> in DOCX</li>
                    </ul>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
                    <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">🎯 Casi d'Uso Ideali</h4>
                    <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                      <li>• <strong>Autovalutazione</strong> prima della discussione</li>
                      <li>• <strong>Identificazione criticità</strong> e punti deboli</li>
                      <li>• <strong>Preparazione difesa</strong> tesi</li>
                      <li>• <strong>Miglioramento qualità</strong> accademica</li>
                      <li>• <strong>Feedback professionale</strong> dettagliato</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* TRIENNALE TAB */}
            {currentTab === 'triennale' && (
              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
                  <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
                    📖 Tesi Triennale - 8 Analisi Specializzate
                  </h3>
                  <p className="text-blue-800 dark:text-blue-200 text-sm mb-4">
                    Focus su <strong>comprensione e applicazione</strong> dei concetti fondamentali. 
                    Le analisi valutano la capacità di organizzare il pensiero accademico e applicare correttamente metodologie di base.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { name: 'Analisi Strutturale', desc: 'Valutazione organizzazione logica e coerenza espositiva' },
                    { name: 'Analisi Metodologica', desc: 'Appropriatezza e applicazione del metodo di ricerca' },
                    { name: 'Analisi dei Contenuti', desc: 'Padronanza degli argomenti e qualità dei contenuti' },
                    { name: 'Analisi Bibliografica', desc: 'Qualità e pertinenza delle fonti utilizzate' },
                    { name: 'Analisi Formale', desc: 'Correttezza espositiva e linguistica' },
                    { name: 'Coerenza Argomentativa', desc: 'Logica e consistenza delle argomentazioni' },
                    { name: 'Originalità del Contributo', desc: 'Elementi di novità e contributo personale' },
                    { name: 'Rilevanza Disciplinare', desc: 'Significatività nel contesto disciplinare' }
                  ].map((analysis, index) => (
                    <div key={index} className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-blue-200 dark:border-blue-600">
                      <div className="font-semibold text-blue-700 dark:text-blue-300 text-sm mb-1">
                        {index + 1}. {analysis.name}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {analysis.desc}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-900/30 p-4 rounded-lg border border-yellow-200 dark:border-yellow-700">
                  <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">💡 Criteri di Valutazione Triennale</h4>
                  <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                    <li>• <strong>Struttura semplice ma efficace</strong> - Organizzazione logica chiara</li>
                    <li>• <strong>Comprensione concetti base</strong> - Padronanza fondamenti disciplinari</li>
                    <li>• <strong>Applicazione corretta metodi</strong> - Uso appropriato metodologie standard</li>
                    <li>• <strong>Capacità espositiva</strong> - Chiarezza e correttezza linguistica</li>
                  </ul>
                </div>
              </div>
            )}

            {/* MAGISTRALE TAB */}
            {currentTab === 'magistrale' && (
              <div className="space-y-4">
                <div className="bg-purple-50 dark:bg-purple-900/30 p-4 rounded-lg border border-purple-200 dark:border-purple-700">
                  <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100 mb-3">
                    📚 Tesi Magistrale - 12 Analisi Avanzate
                  </h3>
                  <p className="text-purple-800 dark:text-purple-200 text-sm mb-4">
                    Focus su <strong>approfondimento critico e contributo originale</strong>. 
                    Le analisi valutano la capacità di sintesi critica, innovazione metodologica e rilevanza teorico-pratica.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { name: 'Strutturale Avanzata', desc: 'Architettura argomentativa complessa' },
                    { name: 'Metodologica Rigorosa', desc: 'Rigore scientifico e innovazione metodologica' },
                    { name: 'Contenuti Specialistici', desc: 'Profondità e specializzazione disciplinare' },
                    { name: 'Critica e Sintetica', desc: 'Capacità di analisi e sintesi critica' },
                    { name: 'Bibliografica Completa', desc: 'Completezza dello stato dell\'arte' },
                    { name: 'Empirica/Sperimentale', desc: 'Validità di dati e sperimentazione' },
                    { name: 'Delle Implicazioni', desc: 'Rilevanza teorica e pratica' },
                    { name: 'Innovazione Metodologica', desc: 'Originalità nell\'approccio metodologico' },
                    { name: 'Validità Statistica', desc: 'Robustezza statistica e validità dei risultati' },
                    { name: 'Applicabilità Pratica', desc: 'Trasferibilità e utilità pratica' },
                    { name: 'Limiti e Criticità', desc: 'Identificazione limitazioni e criticità' },
                    { name: 'Posizionamento Teorico', desc: 'Collocazione nel panorama teorico' }
                  ].map((analysis, index) => (
                    <div key={index} className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-purple-200 dark:border-purple-600">
                      <div className="font-semibold text-purple-700 dark:text-purple-300 text-sm mb-1">
                        {index + 1}. {analysis.name}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {analysis.desc}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-lg border border-green-200 dark:border-green-700">
                  <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2">🎯 Criteri di Valutazione Magistrale</h4>
                  <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
                    <li>• <strong>Struttura articolata e sofisticata</strong> - Gestione complessità concettuale</li>
                    <li>• <strong>Approfondimento critico</strong> - Capacità di analisi specialistica avanzata</li>
                    <li>• <strong>Innovazione metodologica</strong> - Originalità negli approcci di ricerca</li>
                    <li>• <strong>Rilevanza teorico-pratica</strong> - Contributo significativo alla disciplina</li>
                  </ul>
                </div>
              </div>
            )}

            {/* DOTTORATO TAB */}
            {currentTab === 'dottorato' && (
              <div className="space-y-4">
                <div className="bg-indigo-50 dark:bg-indigo-900/30 p-4 rounded-lg border border-indigo-200 dark:border-indigo-700">
                  <h3 className="text-lg font-semibold text-indigo-900 dark:text-indigo-100 mb-3">
                    🔬 Tesi Dottorato - 16 Analisi di Frontiera Scientifica
                  </h3>
                  <p className="text-indigo-800 dark:text-indigo-200 text-sm mb-4">
                    Focus su <strong>contributo scientifico originale e rilevanza internazionale</strong>. 
                    Le analisi valutano l'innovazione scientifica, il rigore metodologico avanzato e l'impatto sulla conoscenza.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { name: 'Originalità Scientifica', desc: 'Innovazione e contributo alla conoscenza' },
                    { name: 'Metodologica di Frontiera', desc: 'Sofisticazione metodologica avanzata' },
                    { name: 'Stato dell\'Arte Internazionale', desc: 'Completezza panorama internazionale' },
                    { name: 'Framework Teorico', desc: 'Solidità dell\'impianto teorico' },
                    { name: 'Empirica Avanzata', desc: 'Robustezza dati e validazione avanzata' },
                    { name: 'Critica Profonda', desc: 'Discussione critica approfondita' },
                    { name: 'Impatto Scientifico', desc: 'Potenziale impatto sulla disciplina' },
                    { name: 'Riproducibilità', desc: 'Trasparenza e replicabilità' },
                    { name: 'Standard Internazionali', desc: 'Conformità standard internazionali' },
                    { name: 'Significatività Statistica', desc: 'Robustezza statistica avanzata' },
                    { name: 'Etica della Ricerca', desc: 'Aspetti etici e deontologici' },
                    { name: 'Sostenibilità Metodologica', desc: 'Sostenibilità dell\'approccio metodologico' },
                    { name: 'Interdisciplinarità', desc: 'Approcci interdisciplinari e multidisciplinari' },
                    { name: 'Scalabilità Risultati', desc: 'Generalizzabilità e scalabilità' },
                    { name: 'Pubblicabilità Internazionale', desc: 'Potenziale pubblicazione riviste internazionali' },
                    { name: 'Gap di Conoscenza', desc: 'Lacune conoscitive colmate dalla ricerca' }
                  ].map((analysis, index) => (
                    <div key={index} className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-indigo-200 dark:border-indigo-600">
                      <div className="font-semibold text-indigo-700 dark:text-indigo-300 text-sm mb-1">
                        {index + 1}. {analysis.name}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {analysis.desc}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-red-50 dark:bg-red-900/30 p-4 rounded-lg border border-red-200 dark:border-red-700">
                  <h4 className="font-semibold text-red-800 dark:text-red-200 mb-2">🎖️ Criteri di Valutazione Dottorato</h4>
                  <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                    <li>• <strong>Contributo significativo e originale</strong> - Avanzamento frontiera conoscenza</li>
                    <li>• <strong>Rilevanza scientifica internazionale</strong> - Standard di eccellenza mondiale</li>
                    <li>• <strong>Rigore metodologico assoluto</strong> - Metodologie all'avanguardia</li>
                    <li>• <strong>Potenziale impatto disciplinare</strong> - Influenza sviluppo futuro del campo</li>
                  </ul>
                </div>
              </div>
            )}

            {/* WORKFLOW TAB */}
            {currentTab === 'workflow' && (
              <div className="space-y-4">
                <div className="bg-emerald-50 dark:bg-emerald-900/30 p-4 rounded-lg border border-emerald-200 dark:border-emerald-700">
                  <h3 className="text-lg font-semibold text-emerald-900 dark:text-emerald-100 mb-3">
                    ⚡ Workflow Enterprise: Dalla Creazione alla Finalizzazione
                  </h3>
                  <p className="text-emerald-800 dark:text-emerald-200 text-sm">
                    Processo ottimizzato per gestire progetti di analisi complessi con massima efficienza e qualità professionale.
                  </p>
                </div>

                <div className="space-y-6">
                  {/* STEP 1 */}
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">1</div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">🚀 Setup Progetto</h4>
                      <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg border border-blue-200 dark:border-blue-700">
                        <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                          <li>• <strong>Nome progetto</strong> - Identificativo chiaro e descrittivo</li>
                          <li>• <strong>Facoltà e argomento</strong> - Contestualizzazione disciplinare</li>
                          <li>• <strong>Livello tesi</strong> - Triennale/Magistrale/Dottorato</li>
                          <li>• <strong>Visibilità</strong> - Privato o pubblico in biblioteca</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* STEP 2 */}
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-sm">2</div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">🎯 Loop di Analisi</h4>
                      <div className="bg-purple-50 dark:bg-purple-900/30 p-3 rounded-lg border border-purple-200 dark:border-purple-700">
                        <div className="space-y-3">
                          <div>
                            <strong className="text-purple-800 dark:text-purple-200 text-sm">a) Selezione Tipo Analisi</strong>
                            <p className="text-xs text-purple-700 dark:text-purple-300">Scegli dall'elenco delle analisi rimanenti per il tuo livello</p>
                          </div>
                          <div>
                            <strong className="text-purple-800 dark:text-purple-200 text-sm">b) Caricamento Materiale</strong>
                            <p className="text-xs text-purple-700 dark:text-purple-300">Upload PDF (SmartPdfReader) o incolla testo - max 20k caratteri per qualità ottimale</p>
                          </div>
                          <div>
                            <strong className="text-purple-800 dark:text-purple-200 text-sm">c) Elaborazione AgenteFox</strong>
                            <p className="text-xs text-purple-700 dark:text-purple-300">Analisi real-time con streaming response - risultati immediati</p>
                          </div>
                          <div>
                            <strong className="text-purple-800 dark:text-purple-200 text-sm">d) Salvataggio Automatico</strong>
                            <p className="text-xs text-purple-700 dark:text-purple-300">Ogni analisi viene salvata come "chunk" nel progetto</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* STEP 3 */}
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-sm">3</div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">📊 Gestione Progetto</h4>
                      <div className="bg-green-50 dark:bg-green-900/30 p-3 rounded-lg border border-green-200 dark:border-green-700">
                        <ul className="text-sm text-green-800 dark:text-green-200 space-y-1">
                          <li>• <strong>Progress tracking</strong> - Visualizzazione analisi completate/rimanenti</li>
                          <li>• <strong>Sessioni persistenti</strong> - Lavora quando vuoi, riprendi sempre da dove hai lasciato</li>
                          <li>• <strong>Progetti multipli</strong> - Gestisci fino a 5 progetti contemporaneamente</li>
                          <li>• <strong>Dashboard avanzata</strong> - Statistiche e timeline completion</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* STEP 4 */}
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center font-bold text-sm">4</div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">✅ Finalizzazione Enterprise</h4>
                      <div className="bg-orange-50 dark:bg-orange-900/30 p-3 rounded-lg border border-orange-200 dark:border-orange-700">
                        <ul className="text-sm text-orange-800 dark:text-orange-200 space-y-1">
                          <li>• <strong>Unione intelligente</strong> - Tutti i chunks vengono uniti in documento finale</li>
                          <li>• <strong>Quality Score</strong> - Algoritmo enterprise calcola punteggio qualità 0-100</li>
                          <li>• <strong>Metadati completi</strong> - Statistiche dettagliate e timeline progetto</li>
                          <li>• <strong>Salvataggio biblioteca</strong> - Documento finale disponibile per consultazione</li>
                          <li>• <strong>Export DOCX</strong> - Esportazione professionale per uso accademico</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                    🎓 Best Practices per Risultati Ottimali
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong className="text-blue-700 dark:text-blue-300">📝 Selezione Contenuto:</strong>
                      <ul className="text-blue-600 dark:text-blue-400 mt-1 space-y-1">
                        <li>• Usa SmartPdfReader per PDF lunghi</li>
                        <li>• Seleziona sezioni specifiche e rilevanti</li>
                        <li>• Max 20k caratteri per analisi ottimale</li>
                        <li>• Una analisi = una sezione tematica</li>
                      </ul>
                    </div>
                    <div>
                      <strong className="text-purple-700 dark:text-purple-300">🎯 Strategia Progetto:</strong>
                      <ul className="text-purple-600 dark:text-purple-400 mt-1 space-y-1">
                        <li>• Completa analisi fondamentali prima</li>
                        <li>• Procedi per sezioni logiche della tesi</li>
                        <li>• Salva frequentemente (auto-save attivo)</li>
                        <li>• Finalizza solo quando soddisfatto</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-900/30 p-4 rounded-lg border border-yellow-200 dark:border-yellow-700">
                  <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2 flex items-center gap-2">
                    ⚡ Funzionalità Avanzate
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <strong className="text-yellow-700 dark:text-yellow-300">🔄 Continuità:</strong>
                      <ul className="text-yellow-600 dark:text-yellow-400 mt-1 space-y-1">
                        <li>• Sessioni persistenti</li>
                        <li>• Ripresa automatica</li>
                        <li>• Backup continuo</li>
                        <li>• Multi-dispositivo</li>
                      </ul>
                    </div>
                    <div>
                      <strong className="text-yellow-700 dark:text-yellow-300">📊 Analytics:</strong>
                      <ul className="text-yellow-600 dark:text-yellow-400 mt-1 space-y-1">
                        <li>• Progress tracking</li>
                        <li>• Quality scoring</li>
                        <li>• Time estimation</li>
                        <li>• Completion stats</li>
                      </ul>
                    </div>
                    <div>
                      <strong className="text-yellow-700 dark:text-yellow-300">🎯 Smart Features:</strong>
                      <ul className="text-yellow-600 dark:text-yellow-400 mt-1 space-y-1">
                        <li>• Anti-duplicate check</li>
                        <li>• Intelligent prompts</li>
                        <li>• Real-time streaming</li>
                        <li>• Auto-formatting</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* BOTTOM ACTIONS */}
          <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700 p-6">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              💡 <strong>Suggerimento:</strong> Inizia sempre con un progetto di test per familiarizzare con il sistema
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => window.open('/docs/thesis-analysis', '_blank')}
                className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
              >
                📚 Documentazione
              </button>
              <DialogClose asChild>
                <button className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all">
                  🚀 Inizia Analisi
                </button>
              </DialogClose>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}