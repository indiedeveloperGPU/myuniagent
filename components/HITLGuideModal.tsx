// File: components/HITLGuideModal.tsx

import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose } from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

interface HITLGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HITLGuideModal({ isOpen, onClose }: HITLGuideModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => {if (!open) onClose();}}>
      <DialogContent 
  className="fixed inset-0 z-50 flex items-center justify-center p-4"
  onPointerDownOutside={(e) => e.preventDefault()}
>
  <div className="bg-black/50 fixed inset-0" onClick={onClose} />
  <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-4xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="flex justify-between items-start p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
              🧠 Come funziona il Riassunto HITL
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400 mt-2">
              La guida completa per ottenere riassunti perfetti con Human-in-the-Loop
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

        {/* Content */}
        <div className="p-6 space-y-8">
          
          {/* Sezione 1: Concetto Chiave */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">1</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Il Concetto Chiave: Tu sei il Chunker
              </h3>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/30 p-6 rounded-xl border border-blue-200 dark:border-blue-700">
              <p className="text-gray-800 dark:text-gray-200 leading-relaxed mb-4">
                <strong>HITL (Human-in-the-Loop)</strong> significa che <strong>tu</strong> decidi cosa riassumere, 
                non un algoritmo. Questo elimina completamente le allucinazioni e garantisce qualità massima.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-blue-200 dark:border-blue-600">
                  <h4 className="font-semibold text-green-700 dark:text-green-400 mb-2">✅ Con HITL</h4>
                  <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                    <li>• Tu selezioni il contenuto rilevante</li>
                    <li>• Zero allucinazioni</li>
                    <li>• Qualità garantita</li>
                    <li>• Controllo totale</li>
                  </ul>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-red-200 dark:border-red-600">
                  <h4 className="font-semibold text-red-700 dark:text-red-400 mb-2">❌ AI Automatica</h4>
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

          {/* Sezione 2: Modalità di Lavoro */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">2</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Le Due Modalità di Lavoro
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-blue-50 dark:bg-blue-900/30 p-6 rounded-xl border border-blue-200 dark:border-blue-700">
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
                  📄 Riassunto Singolo
                </h4>
                <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                  Perfetto per documenti brevi che entrano nel limite di 25k caratteri.
                </p>
                <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                  <li>• Risultato immediato</li>
                  <li>• Salvato direttamente in Biblioteca</li>
                  <li>• Ideale per capitoli singoli</li>
                  <li>• Workflow classico</li>
                </ul>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/30 p-6 rounded-xl border border-purple-200 dark:border-purple-700">
                <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-3 flex items-center gap-2">
                  📚 Progetto Multi-Parte
                </h4>
                <p className="text-sm text-purple-800 dark:text-purple-200 mb-3">
                  Per libri completi, dispense lunghe o manuali che richiedono più sessioni.
                </p>
                <ul className="text-sm text-purple-700 dark:text-purple-300 space-y-1">
                  <li>• Lavoro progressivo</li>
                  <li>• Salvataggio automatico dei progressi</li>
                  <li>• Unione finale automatica</li>
                  <li>• Riprendibile in qualsiasi momento</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Sezione 3: Workflow Ottimale */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">3</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Workflow per Risultati Perfetti
              </h3>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-white text-xs font-bold">1</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100">Usa SmartPdfReader</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Per PDF: carica il file e seleziona solo le sezioni che ti servono. 
                      Evita indici, bibliography, pagine bianche.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-white text-xs font-bold">2</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100">Selezione Intelligente</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Seleziona testo per paragrafi logici. Un buon chunk = 1-2 concetti correlati.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-white text-xs font-bold">3</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100">Revisiona e Pulisci</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Prima di inviare, usa il pulsante "🎨 Formatta" e correggi eventuali errori di OCR.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-white text-xs font-bold">4</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100">Specifica Contesto</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Facoltà e Materia sono cruciali: aiutano l'AI a usare il linguaggio e focus appropriati.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Sezione 4: Tips Pro */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-yellow-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">💡</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Tips da Pro
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-yellow-50 dark:bg-yellow-900/30 p-4 rounded-lg border border-yellow-200 dark:border-yellow-700">
                <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">🎯 Dimensione Ottimale</h4>
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  15-20k caratteri = Sweet spot. L'AI ha abbastanza contesto ma rimane precisa.
                </p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-lg border border-green-200 dark:border-green-700">
                <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2">🧹 Pulizia Testo</h4>
                <p className="text-sm text-green-800 dark:text-green-200">
                  Rimuovi header/footer ripetitivi, numeri di pagina, note marginali non rilevanti.
                </p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">📚 Progetti Grandi</h4>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Per libri di 200+ pagine: lavora per capitoli logici, non per numero di pagine.
                </p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/30 p-4 rounded-lg border border-purple-200 dark:border-purple-700">
                <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">⚡ Speed Tips</h4>
                <p className="text-sm text-purple-800 dark:text-purple-200">
                  Usa keyboard shortcuts: Ctrl+A per selezionare tutto, Ctrl+V per incollare velocemente.
                </p>
              </div>
            </div>
          </section>

          {/* Sezione 5: Troubleshooting */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">🛠️</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Risoluzione Problemi Comuni
              </h3>
            </div>
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  ❓ "Il testo non è selezionabile nel PDF"
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <strong>Soluzione:</strong> Il PDF è probabilmente scansionato. Usa il pulsante "🧠 Attiva OCR" 
                  per estrarre il testo automaticamente.
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  ❓ "Il riassunto è troppo generico"
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <strong>Soluzione:</strong> Specifica meglio Facoltà e Materia. Invece di "Università" 
                  scrivi "Giurisprudenza", invece di "Esame" scrivi "Diritto Civile".
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  ❓ "Errore: testo troppo lungo"
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <strong>Soluzione:</strong> Usa SmartPdfReader per selezionare solo le sezioni necessarie, 
                  oppure passa alla modalità "Progetto Multi-Parte".
                </p>
              </div>
            </div>
          </section>

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              💡 <strong>Tip:</strong> Questa guida è sempre accessibile dal pulsante "📖 Come funziona"
            </p>
            <DialogClose asChild>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Iniziamo! 🚀
              </button>
            </DialogClose>
          </div>
        </div>
</div>
      </DialogContent>
    </Dialog>
  );
}