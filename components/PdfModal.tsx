import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@radix-ui/react-dialog';
import { Document, Page, pdfjs } from 'react-pdf';
import { useEffect, useRef, useState } from 'react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf-worker/pdf.worker.min.js";

interface PdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: File | null;
  onTextSelected: (text: string) => void;
}

export default function PdfModal({ isOpen, onClose, file, onTextSelected }: PdfModalProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [tempSelection, setTempSelection] = useState<string>("");
  const [isFormatted, setIsFormatted] = useState(false);

  const handleTextSelection = () => {
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim();
    if (selectedText) {
      const formattedText = formatSelectedText(selectedText);
      setTempSelection((prev) => {
        const newText = prev ? prev + "\n\n" + formattedText : formattedText;
        return newText;
      });
    }
  };

  // Funzione per migliorare la formattazione del testo selezionato
  const formatSelectedText = (text: string): string => {
    return text
      // Rimuove spazi multipli e li sostituisce con uno singolo
      .replace(/\s+/g, ' ')
      // Gestisce i punti seguiti da lettere maiuscole (fine frase)
      .replace(/\.\s*([A-Z])/g, '.\n\n$1')
      // Gestisce i due punti seguiti da lettere maiuscole (liste o definizioni)
      .replace(/:\s*([A-Z])/g, ':\n$1')
      // Gestisce punti e virgola in liste
      .replace(/;\s*([A-Z])/g, ';\n- $1')
      // Rimuove spazi all'inizio e alla fine
      .trim();
  };

  // Funzione migliorata per estrarre tutto il testo con migliore formattazione
  const extractAllTextFromPDF = async (pdfFile: File): Promise<string> => {
    try {
      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      const numPages = pdf.numPages;

      let fullText = "";

      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        
        // Organizza gli elementi di testo per posizione Y (dall'alto al basso)
        const textItems = content.items
  .filter((item: any) => item.str && item.str.trim())
  .sort((a: any, b: any) => b.transform[5] - a.transform[5]) as any[];

        let pageText = "";
        let currentLineY = null;
        let currentLine = "";

        for (const item of textItems) {
  const itemY = Math.round((item as any).transform[5]);
  const itemText = (item as any).str;

          // Se siamo sulla stessa riga (tolleranza di 2 pixel)
          if (currentLineY !== null && Math.abs(itemY - currentLineY) <= 2) {
            currentLine += " " + itemText;
          } else {
            // Nuova riga
            if (currentLine.trim()) {
              pageText += currentLine.trim() + "\n";
            }
            currentLine = itemText;
            currentLineY = itemY;
          }
        }

        // Aggiungi l'ultima riga
        if (currentLine.trim()) {
          pageText += currentLine.trim() + "\n";
        }

        // Migliora la formattazione della pagina
        pageText = formatPageText(pageText);
        fullText += `=== PAGINA ${i} ===\n\n${pageText}\n\n`;
      }

      return fullText;
    } catch (error) {
      console.error('Errore nell\'estrazione del testo:', error);
      return "Errore nell'estrazione del testo dal PDF.";
    }
  };

  // Funzione per migliorare la formattazione del testo di una pagina
  const formatPageText = (text: string): string => {
    return text
      // Rimuove righe vuote multiple
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      // Gestisce i paragrafi (riga che inizia con maiuscola dopo punto)
      .replace(/\.\s*\n([A-Z])/g, '.\n\n$1')
      // Gestisce titoli (righe molto corte in maiuscolo)
      .replace(/\n([A-Z\s]{3,30})\n/g, '\n\n**$1**\n\n')
      // Gestisce liste numerate
      .replace(/\n(\d+[\.\)])\s*/g, '\n$1 ')
      // Gestisce liste puntate
      .replace(/\n([-•])\s*/g, '\n$1 ')
      .trim();
  };

  // Funzione per applicare/rimuovere formattazione avanzata
  const toggleFormatting = () => {
    if (!isFormatted && tempSelection) {
      const formatted = tempSelection
        .split('\n')
        .map(line => {
          const trimmed = line.trim();
          if (!trimmed) return '';
          
          // Identifica possibili titoli (righe corte in maiuscolo)
          if (trimmed.length < 50 && trimmed === trimmed.toUpperCase() && /^[A-Z\s]+$/.test(trimmed)) {
            return `**${trimmed}**`;
          }
          
          // Identifica liste
          if (/^\d+[\.\)]/.test(trimmed) || /^[-•]/.test(trimmed)) {
            return trimmed;
          }
          
          return trimmed;
        })
        .join('\n');
      
      setTempSelection(formatted);
      setIsFormatted(true);
    } else {
      // Rimuove la formattazione markdown
      const unformatted = tempSelection
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/__(.*?)__/g, '$1');
      setTempSelection(unformatted);
      setIsFormatted(false);
    }
  };

  const clearSelection = () => {
    setTempSelection("");
    setIsFormatted(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {if (!open) onClose();}} modal={false}>
      <DialogContent
        forceMount
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        className="max-w-7xl max-h-[95vh] overflow-hidden bg-white rounded-lg shadow-md p-4"
      >
        <DialogTitle className="text-lg font-semibold text-gray-800">
          Visualizzazione PDF
        </DialogTitle>
        <DialogDescription className="text-sm text-gray-500 mb-4">
          Seleziona uno o più testi da diverse pagine, poi modifica e conferma. La formattazione viene preservata automaticamente.
        </DialogDescription>

        <div className="flex gap-6 h-[75vh] overflow-hidden">
          {/* Sezione PDF */}
          <div ref={containerRef} onMouseUp={handleTextSelection} className="flex-1 overflow-y-scroll border rounded p-2">
            <div className="flex justify-between items-center mb-2">
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    if (file) {
                      const allText = await extractAllTextFromPDF(file);
                      setTempSelection(allText);
                      setIsFormatted(false);
                    }
                  }}
                  className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                >
                  Seleziona tutto il testo
                </button>
                <button
                  onClick={clearSelection}
                  className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                >
                  Pulisci selezione
                </button>
              </div>
              
              {numPages && (
                <div className="text-sm text-gray-600">
                  Pagine totali: {numPages}
                </div>
              )}
            </div>

            {file && (
              <Document
                file={file}
                onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                loading="Caricamento PDF..."
                error="Errore nel caricamento del PDF"
              >
                {numPages && (
                  <>
                    <Page 
                      pageNumber={pageNumber} 
                      width={Math.min(600, window.innerWidth * 0.4)}
                      renderTextLayer={true}
                      renderAnnotationLayer={true}
                    />
                    <div className="flex justify-center items-center gap-4 mt-4">
                      <button
                        onClick={() => setPageNumber((prev) => Math.max(prev - 1, 1))}
                        disabled={pageNumber <= 1}
                        className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
                      >
                        ← Precedente
                      </button>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-700">Pagina</span>
                        <input
                          type="number"
                          min="1"
                          max={numPages}
                          value={pageNumber}
                          onChange={(e) => {
                            const page = parseInt(e.target.value);
                            if (page >= 1 && page <= numPages) {
                              setPageNumber(page);
                            }
                          }}
                          className="w-16 px-2 py-1 text-center border rounded text-sm"
                        />
                        <span className="text-sm text-gray-700">di {numPages}</span>
                      </div>
                      <button
                        onClick={() => setPageNumber((prev) => Math.min(prev + 1, numPages!))}
                        disabled={pageNumber >= numPages}
                        className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
                      >
                        Successiva →
                      </button>
                    </div>
                  </>
                )}
              </Document>
            )}
          </div>

          {/* Sezione testo selezionato */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm text-gray-600">Testo selezionato:</p>
              <div className="flex gap-2">
                <button
                  onClick={toggleFormatting}
                  className={`px-3 py-1 text-xs rounded ${
                    isFormatted 
                      ? 'bg-orange-600 text-white hover:bg-orange-700' 
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {isFormatted ? 'Rimuovi formattazione' : 'Applica formattazione'}
                </button>
                <span className="text-xs text-gray-500 self-center">
                  {tempSelection.length} caratteri
                </span>
              </div>
            </div>
            
            <textarea
              value={tempSelection}
              onChange={(e) => setTempSelection(e.target.value)}
              className="flex-1 w-full p-3 border rounded bg-gray-50 text-sm resize-none font-mono leading-relaxed"
              placeholder="Il testo selezionato comparirà qui con formattazione migliorata. Puoi modificarlo prima dell'invio..."
              style={{ minHeight: '200px' }}
            />
            
            <div className="flex justify-between items-center mt-2">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Annulla
              </button>
              <button
                onClick={() => {
                  if (tempSelection.trim()) {
                    onTextSelected(tempSelection.trim());
                    onClose();
                    setTempSelection("");
                    setIsFormatted(false);
                  }
                }}
                disabled={!tempSelection.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Usa questo testo
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
