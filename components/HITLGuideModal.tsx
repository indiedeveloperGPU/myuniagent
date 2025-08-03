// File: components/HITLGuideModal.tsx

import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose } from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

interface HITLGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HITLGuideModal({ isOpen, onClose }: HITLGuideModalProps) {
  // 🎨 HELPER FUNCTIONS PER CONSISTENZA ENTERPRISE
  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 50) return 'bg-yellow-500';
    if (percentage >= 25) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getSectionGradient = (color: string) => {
    const gradients = {
      blue: 'bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800',
      purple: 'bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900 dark:to-purple-800',
      green: 'bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900 dark:to-green-800',
      yellow: 'bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900 dark:to-yellow-800',
      red: 'bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900 dark:to-red-800',
      orange: 'bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900 dark:to-orange-800',
      gray: 'bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700'
    };
    return gradients[color as keyof typeof gradients] || gradients.gray;
  };

  const getCardBorder = (color: string) => {
    const borders = {
      blue: 'border-blue-200 dark:border-blue-700',
      purple: 'border-purple-200 dark:border-purple-700',
      green: 'border-green-200 dark:border-green-700',
      yellow: 'border-yellow-200 dark:border-yellow-700',
      red: 'border-red-200 dark:border-red-700',
      orange: 'border-orange-200 dark:border-orange-700',
      gray: 'border-gray-200 dark:border-gray-700'
    };
    return borders[color as keyof typeof borders] || borders.gray;
  };

  const getTextColor = (color: string, variant: 'primary' | 'secondary' = 'primary') => {
    const colors = {
      blue: variant === 'primary' ? 'text-blue-900 dark:text-blue-100' : 'text-blue-800 dark:text-blue-200',
      purple: variant === 'primary' ? 'text-purple-900 dark:text-purple-100' : 'text-purple-800 dark:text-purple-200',
      green: variant === 'primary' ? 'text-green-900 dark:text-green-100' : 'text-green-800 dark:text-green-200',
      yellow: variant === 'primary' ? 'text-yellow-900 dark:text-yellow-100' : 'text-yellow-800 dark:text-yellow-200',
      red: variant === 'primary' ? 'text-red-900 dark:text-red-100' : 'text-red-800 dark:text-red-200',
      orange: variant === 'primary' ? 'text-orange-900 dark:text-orange-100' : 'text-orange-800 dark:text-orange-200',
      gray: variant === 'primary' ? 'text-gray-900 dark:text-gray-100' : 'text-gray-800 dark:text-gray-200'
    };
    return colors[color as keyof typeof colors] || colors.gray;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {if (!open) onClose();}}>
      <DialogContent 
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <div className="bg-black/50 fixed inset-0" onClick={onClose} />
        <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-4xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300">
          {/* 🎯 HEADER ENTERPRISE */}
          <div className="flex justify-between items-start p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center">
                <span className="text-white text-2xl">🧠</span>
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  Come funziona il Riassunto HITL
                </DialogTitle>
                <DialogDescription className="text-gray-600 dark:text-gray-400 mt-2">
                  La guida completa per ottenere riassunti perfetti con Human-in-the-Loop
                </DialogDescription>
              </div>
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

          {/* 📋 CONTENT ENTERPRISE */}
          <div className="p-6 space-y-8">
            
            {/* 🎯 SEZIONE 1: CONCETTO CHIAVE */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">1</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  Il Concetto Chiave: Tu sei il Chunker
                </h3>
                <div className="text-2xl">🎯</div>
              </div>
              <div className={`${getSectionGradient('blue')} p-6 rounded-xl border ${getCardBorder('blue')}`}>
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-lg flex items-center justify-center border ${getCardBorder('blue')}">
                    <span className="text-2xl">🧠</span>
                  </div>
                  <div className="flex-1">
                    <p className={`${getTextColor('blue', 'secondary')} leading-relaxed mb-4`}>
                      <strong>HITL (Human-in-the-Loop)</strong> significa che <strong>tu</strong> decidi cosa riassumere, 
                      non un algoritmo. Questo elimina completamente le allucinazioni e garantisce qualità massima.
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-green-200 dark:border-green-600 hover:border-green-300 dark:hover:border-green-500 transition-colors">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm">✓</span>
                      </div>
                      <h4 className="font-semibold text-green-700 dark:text-green-400">Con HITL</h4>
                    </div>
                    <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                      <li>• Tu selezioni il contenuto rilevante</li>
                      <li>• Zero allucinazioni</li>
                      <li>• Qualità garantita</li>
                      <li>• Controllo totale</li>
                    </ul>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-red-200 dark:border-red-600 hover:border-red-300 dark:hover:border-red-500 transition-colors">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm">✗</span>
                      </div>
                      <h4 className="font-semibold text-red-700 dark:text-red-400">AI Automatica</h4>
                    </div>
                    <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                      <li>• L'AI decide cosa è importante</li>
                      <li>• Possibili allucinazioni</li>
                      <li>• Qualità variabile</li>
                      <li>• Risultati imprevedibili</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            {/* 🎯 SEZIONE 2: MODALITÀ DI LAVORO */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">2</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  Le Due Modalità di Lavoro
                </h3>
                <div className="text-2xl">⚙️</div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className={`${getSectionGradient('blue')} p-6 rounded-xl border ${getCardBorder('blue')} hover:border-blue-300 dark:hover:border-blue-500 transition-colors`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-lg flex items-center justify-center border ${getCardBorder('blue')}">
                      <span className="text-2xl">📄</span>
                    </div>
                    <h4 className={`font-semibold ${getTextColor('blue')}`}>
                      Riassunto Singolo
                    </h4>
                  </div>
                  <p className={`text-sm ${getTextColor('blue', 'secondary')} mb-3`}>
                    Perfetto per documenti brevi che entrano nel limite di 25k caratteri.
                  </p>
                  <ul className={`text-sm ${getTextColor('blue', 'secondary')} space-y-1`}>
                    <li>• Risultato immediato</li>
                    <li>• Salvato direttamente in Biblioteca</li>
                    <li>• Ideale per capitoli singoli</li>
                    <li>• Workflow classico</li>
                  </ul>
                </div>
                <div className={`${getSectionGradient('purple')} p-6 rounded-xl border ${getCardBorder('purple')} hover:border-purple-300 dark:hover:border-purple-500 transition-colors`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-lg flex items-center justify-center border ${getCardBorder('purple')}">
                      <span className="text-2xl">📚</span>
                    </div>
                    <h4 className={`font-semibold ${getTextColor('purple')}`}>
                      Progetto Multi-Parte
                    </h4>
                  </div>
                  <p className={`text-sm ${getTextColor('purple', 'secondary')} mb-3`}>
                    Per libri completi, dispense lunghe o manuali che richiedono più sessioni.
                  </p>
                  <ul className={`text-sm ${getTextColor('purple', 'secondary')} space-y-1`}>
                    <li>• Lavoro progressivo</li>
                    <li>• Salvataggio automatico dei progressi</li>
                    <li>• Unione finale automatica</li>
                    <li>• Riprendibile in qualsiasi momento</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* 🎯 SEZIONE 3: WORKFLOW OTTIMALE */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">3</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  Workflow per Risultati Perfetti
                </h3>
                <div className="text-2xl">🔄</div>
              </div>
              <div className={`${getSectionGradient('gray')} p-6 rounded-xl border ${getCardBorder('gray')}`}>
                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-600 transition-colors">
                    <div className="w-8 h-8 bg-gradient-to-br from-green-600 to-green-700 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-bold">1</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100">Usa SmartPdfReader</h4>
                        <span className="text-xl">📱</span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Per PDF: carica il file e seleziona solo le sezioni che ti servono. 
                        Evita indici, bibliography, pagine bianche.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-600 transition-colors">
                    <div className="w-8 h-8 bg-gradient-to-br from-green-600 to-green-700 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-bold">2</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100">Selezione Intelligente</h4>
                        <span className="text-xl">🎯</span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Seleziona testo per paragrafi logici. Un buon chunk = 1-2 concetti correlati.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-600 transition-colors">
                    <div className="w-8 h-8 bg-gradient-to-br from-green-600 to-green-700 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-bold">3</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100">Revisiona e Pulisci</h4>
                        <span className="text-xl">🎨</span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Prima di inviare, usa il pulsante "Formatta" e correggi eventuali errori di OCR.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-600 transition-colors">
                    <div className="w-8 h-8 bg-gradient-to-br from-green-600 to-green-700 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-bold">4</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100">Specifica Contesto</h4>
                        <span className="text-xl">🏛️</span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Facoltà e Materia sono cruciali: aiutano l'AI a usare il linguaggio e focus appropriati.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* 🎯 SEZIONE 4: TIPS PRO */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-yellow-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">💡</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  Tips da Pro
                </h3>
                <div className="text-2xl">⚡</div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`${getSectionGradient('yellow')} p-4 rounded-lg border ${getCardBorder('yellow')} hover:border-yellow-300 dark:hover:border-yellow-500 transition-colors`}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-white dark:bg-gray-800 rounded-lg flex items-center justify-center">
                      <span className="text-xl">🎯</span>
                    </div>
                    <h4 className={`font-semibold ${getTextColor('yellow')}`}>Dimensione Ottimale</h4>
                  </div>
                  <p className={`text-sm ${getTextColor('yellow', 'secondary')}`}>
                    15-20k caratteri = Sweet spot. L'AI ha abbastanza contesto ma rimane precisa.
                  </p>
                </div>
                <div className={`${getSectionGradient('green')} p-4 rounded-lg border ${getCardBorder('green')} hover:border-green-300 dark:hover:border-green-500 transition-colors`}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-white dark:bg-gray-800 rounded-lg flex items-center justify-center">
                      <span className="text-xl">🧹</span>
                    </div>
                    <h4 className={`font-semibold ${getTextColor('green')}`}>Pulizia Testo</h4>
                  </div>
                  <p className={`text-sm ${getTextColor('green', 'secondary')}`}>
                    Rimuovi header/footer ripetitivi, numeri di pagina, note marginali non rilevanti.
                  </p>
                </div>
                <div className={`${getSectionGradient('blue')} p-4 rounded-lg border ${getCardBorder('blue')} hover:border-blue-300 dark:hover:border-blue-500 transition-colors`}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-white dark:bg-gray-800 rounded-lg flex items-center justify-center">
                      <span className="text-xl">📚</span>
                    </div>
                    <h4 className={`font-semibold ${getTextColor('blue')}`}>Progetti Grandi</h4>
                  </div>
                  <p className={`text-sm ${getTextColor('blue', 'secondary')}`}>
                    Per libri di 200+ pagine: lavora per capitoli logici, non per numero di pagine.
                  </p>
                </div>
                <div className={`${getSectionGradient('purple')} p-4 rounded-lg border ${getCardBorder('purple')} hover:border-purple-300 dark:hover:border-purple-500 transition-colors`}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-white dark:bg-gray-800 rounded-lg flex items-center justify-center">
                      <span className="text-xl">⚡</span>
                    </div>
                    <h4 className={`font-semibold ${getTextColor('purple')}`}>Speed Tips</h4>
                  </div>
                  <p className={`text-sm ${getTextColor('purple', 'secondary')}`}>
                    Usa keyboard shortcuts: Ctrl+A per selezionare tutto, Ctrl+V per incollare velocemente.
                  </p>
                </div>
              </div>
            </section>

            {/* 🎯 SEZIONE 5: TROUBLESHOOTING */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">🛠️</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  Risoluzione Problemi Comuni
                </h3>
                <div className="text-2xl">🔧</div>
              </div>
              <div className="space-y-4">
                <div className={`${getSectionGradient('gray')} p-4 rounded-lg border ${getCardBorder('gray')} hover:border-red-300 dark:hover:border-red-600 transition-colors`}>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-white text-sm">?</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        "Il testo non è selezionabile nel PDF"
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <strong>Soluzione:</strong> Il PDF è probabilmente scansionato. Usa il pulsante "Attiva OCR" 
                        per estrarre il testo automaticamente.
                      </p>
                    </div>
                  </div>
                </div>
                <div className={`${getSectionGradient('gray')} p-4 rounded-lg border ${getCardBorder('gray')} hover:border-yellow-300 dark:hover:border-yellow-600 transition-colors`}>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-yellow-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-white text-sm">?</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        "Il riassunto è troppo generico"
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <strong>Soluzione:</strong> Specifica meglio Facoltà e Materia. Invece di "Università" 
                        scrivi "Giurisprudenza", invece di "Esame" scrivi "Diritto Civile".
                      </p>
                    </div>
                  </div>
                </div>
                <div className={`${getSectionGradient('gray')} p-4 rounded-lg border ${getCardBorder('gray')} hover:border-orange-300 dark:hover:border-orange-600 transition-colors`}>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-white text-sm">?</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        "Errore: testo troppo lungo"
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <strong>Soluzione:</strong> Usa SmartPdfReader per selezionare solo le sezioni necessarie, 
                        oppure passa alla modalità "Progetto Multi-Parte".
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* 🎯 SEZIONE 6: PROGRESS DEMO */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">📊</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  Esempio di Progresso Enterprise
                </h3>
                <div className="text-2xl">📈</div>
              </div>
              <div className={`${getSectionGradient('purple')} p-6 rounded-xl border ${getCardBorder('purple')}`}>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white dark:bg-gray-800 rounded-lg flex items-center justify-center border ${getCardBorder('purple')}">
                      <span className="text-2xl">📖</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                        Tesi di Laurea Magistrale - Economia
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Analisi del mercato finanziario europeo post-pandemico
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Progresso Analisi Completo
                      </span>
                      <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                        85%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                      <div 
                        className={`h-3 rounded-full transition-all duration-300 ${getProgressColor(85)}`}
                        style={{ width: '85%' }}
                      ></div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        17/20 analisi completate
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Tempo stimato: 2h rimanenti
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg text-center border border-green-200 dark:border-green-700">
                      <div className="text-lg font-bold text-green-600 dark:text-green-400">✅</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">Completate</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg text-center border border-blue-200 dark:border-blue-700">
                      <div className="text-lg font-bold text-blue-600 dark:text-blue-400">⚡</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">In Corso</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg text-center border border-gray-200 dark:border-gray-700">
                      <div className="text-lg font-bold text-gray-600 dark:text-gray-400">⏳</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">In Attesa</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg text-center border border-purple-200 dark:border-purple-700">
                      <div className="text-lg font-bold text-purple-600 dark:text-purple-400">🎯</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">Finalizzazione</div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

          </div>

          {/* 🎯 FOOTER ENTERPRISE */}
          <div className={`p-6 border-t border-gray-200 dark:border-gray-700 ${getSectionGradient('gray')}`}>
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm">💡</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <strong>Tip:</strong> Questa guida è sempre accessibile dal pulsante "Come funziona"
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all font-medium"
                >
                  Chiudi Guida
                </button>
                <DialogClose asChild>
                  <button className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all transform hover:scale-105 font-medium flex items-center gap-2">
                    <span>Iniziamo!</span>
                    <span className="text-lg">🚀</span>
                  </button>
                </DialogClose>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}