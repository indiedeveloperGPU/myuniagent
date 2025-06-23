import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose } from '@radix-ui/react-dialog';
import { Document, Page, pdfjs } from 'react-pdf';
import { TablePreview } from '@/components/TablePreview';
import { PdfTableExtractor } from '@/lib/pdfTableExtractor';
import { useTableDetection } from '@/lib/useTableDetection';
import Tesseract from "tesseract.js";
import { useEffect, useRef, useState, useCallback } from 'react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf-worker/pdf.worker.min.js";

interface Selection {
  id: string;
  text: string;
  page?: number;
  timestamp: number;
  type: 'manual' | 'ocr';
}

interface SmartPdfReaderProps {
  isOpen: boolean;
  onClose: () => void;
  file: File | null;
  onTextSelected: (text: string) => void;
}

export default function SmartPdfReader({ isOpen, onClose, file, onTextSelected }: SmartPdfReaderProps) {
  // PDF States
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<{page: number, matches: number}[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const [allPagesText, setAllPagesText] = useState<{[key: number]: string}>({});
  
  // OCR States
  const [ocrPages, setOcrPages] = useState<{[key: number]: string}>({});
  const [isOCRLoading, setIsOCRLoading] = useState<{[key: number | string]: boolean}>({});
  const [ocrProgress, setOcrProgress] = useState<{[key: number | string]: number}>({});
  
  // Selection States
  const [tempSelection, setTempSelection] = useState<string>("");
  const [isFormatted, setIsFormatted] = useState(false);
  const [selections, setSelections] = useState<Selection[]>([]);
  
  // Table Detection
  const { detectedTables, isDetecting, detectTablesInPage, selectTable } = useTableDetection();
  
  // UI States
  const [fileType, setFileType] = useState<'pdf' | 'image' | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Detect file type on file change
  useEffect(() => {
    if (!file) {
      setFileType(null);
      setImageUrl(null);
      return;
    }

    if (file.type === 'application/pdf') {
      setFileType('pdf');
    } else if (file.type.startsWith('image/')) {
      setFileType('image');
      const url = URL.createObjectURL(file);
      setImageUrl(url);
      
      // Auto-start OCR for images
      performOCR(url, 'image');
      
      return () => URL.revokeObjectURL(url);
    }
  }, [file]);

  // Table detection for PDF pages
  useEffect(() => {
    const detectTables = async () => {
      if (!file || fileType !== 'pdf' || !pageNumber || !numPages) return;
      
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(pageNumber);
        
        await detectTablesInPage(page);
      } catch (error) {
        console.error('Errore nel rilevamento tabelle:', error);
      }
    };
    
    detectTables();
  }, [pageNumber, file, numPages, detectTablesInPage, fileType]);

  // Handle table selection
  const handleSelectTable = (index: number) => {
    const tableMarkdown = selectTable(index);
    const newSelection: Selection = {
      id: Date.now().toString(),
      text: tableMarkdown,
      page: pageNumber,
      timestamp: Date.now(),
      type: 'manual'
    };
    
    setSelections(prev => [...prev, newSelection]);
    setTempSelection(prev => prev + '\n\n' + tableMarkdown);
  };

  // OCR function for both images and PDF pages
  const performOCR = async (source: string, sourceType: 'image' | 'pdf', pageNum?: number) => {
    const key = sourceType === 'image' ? 'image' : pageNum!;
    
    setIsOCRLoading(prev => ({ ...prev, [key]: true }));
    setOcrProgress(prev => ({ ...prev, [key]: 0 }));

    try {
      const result = await Tesseract.recognize(source, "ita", {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setOcrProgress(prev => ({ ...prev, [key]: Math.round(m.progress * 100) }));
          }
        },
      });

      const extractedText = result.data.text.trim();
      
      if (sourceType === 'pdf' && pageNum) {
        setOcrPages(prev => ({ ...prev, [pageNum]: extractedText }));
        setAllPagesText(prev => ({ ...prev, [pageNum]: formatPageText(extractedText) }));
      }

      const newSelection: Selection = {
        id: Date.now().toString(),
        text: extractedText,
        page: sourceType === 'pdf' ? pageNum : undefined,
        timestamp: Date.now(),
        type: 'ocr'
      };

      setSelections(prev => [...prev, newSelection]);
      setTempSelection(prev => {
        const prefix = sourceType === 'pdf' ? `\n\n=== PAGINA ${pageNum} (OCR) ===\n` : '\n\n=== IMMAGINE (OCR) ===\n';
        return prev + prefix + extractedText;
      });

    } catch (error) {
      console.error('Errore OCR:', error);
    } finally {
      setIsOCRLoading(prev => ({ ...prev, [key]: false }));
      setOcrProgress(prev => ({ ...prev, [key]: 0 }));
    }
  };

  // Extract text from PDF page
  const extractPageText = useCallback(async (pageNum: number): Promise<string> => {
    if (allPagesText[pageNum]) {
      return allPagesText[pageNum];
    }

    if (!file || fileType !== 'pdf') return "";
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      const page = await pdf.getPage(pageNum);
      
      const tableExtractor = new PdfTableExtractor();
      const { text: extractedText } = await tableExtractor.extractTablesFromPage(page);
      
      const formattedText = formatPageText(extractedText);
      setAllPagesText(prev => ({...prev, [pageNum]: formattedText}));
      return formattedText;
    } catch (error) {
      console.error('Errore nell\'estrazione del testo:', error);
      return "";
    }
  }, [file, allPagesText, fileType]);

  // OCR for current PDF page
  const runOCRForCurrentPage = async () => {
    if (!file || fileType !== 'pdf' || !pageNumber) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      const page = await pdf.getPage(pageNumber);
      
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({ canvasContext: context!, viewport }).promise;
      const imageDataUrl = canvas.toDataURL();

      await performOCR(imageDataUrl, 'pdf', pageNumber);
    } catch (error) {
      console.error('Errore OCR pagina PDF:', error);
    }
  };

  // Check if current page has selectable text
  const hasSelectableText = async (pageNum: number): Promise<boolean> => {
    const text = await extractPageText(pageNum);
    return text.trim().length > 20;
  };

  // Search in document
  const searchInDocument = useCallback(async (term: string) => {
    if (!term.trim() || !numPages) {
      setSearchResults([]);
      return;
    }

    const results: {page: number, matches: number}[] = [];
    const searchRegex = new RegExp(term, 'gi');

    for (let i = 1; i <= numPages; i++) {
      const text = await extractPageText(i);
      const matches = text.match(searchRegex);
      if (matches && matches.length > 0) {
        results.push({ page: i, matches: matches.length });
      }
    }

    setSearchResults(results);
    setCurrentSearchIndex(0);
    
    if (results.length > 0) {
      setPageNumber(results[0].page);
    }
  }, [numPages, extractPageText]);

  // Handle text selection
  const handleTextSelection = () => {
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim();
    if (selectedText && selectedText.length > 3) {
      const formattedText = formatSelectedText(selectedText);
      const newSelection: Selection = {
        id: Date.now().toString(),
        text: formattedText,
        page: pageNumber,
        timestamp: Date.now(),
        type: 'manual'
      };
      
      setSelections(prev => [...prev, newSelection]);
      setTempSelection((prev) => {
        const newText = prev ? prev + "\n\n" + formattedText : formattedText;
        return newText;
      });
      
      selection?.removeAllRanges();
    }
  };

  // Formatting functions
  const formatSelectedText = (text: string): string => {
    return text
      .replace(/\s+/g, ' ')
      .replace(/\.\s*([A-Z])/g, '.\n\n$1')
      .replace(/:\s*([A-Z])/g, ':\n$1')
      .replace(/;\s*([A-Z])/g, ';\n- $1')
      .trim();
  };

  const formatPageText = (text: string): string => {
    return text
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .replace(/\.\s*\n([A-Z])/g, '.\n\n$1')
      .replace(/\n([A-Z\s]{3,30})\n/g, '\n\n**$1**\n\n')
      .replace(/\n(\d+[\.\)])\s*/g, '\n$1 ')
      .replace(/\n([-•])\s*/g, '\n$1 ')
      .trim();
  };

  // Toggle formatting
  const toggleFormatting = () => {
    if (!isFormatted && tempSelection) {
      const formatted = tempSelection
        .split('\n')
        .map(line => {
          const trimmed = line.trim();
          if (!trimmed) return '';
          
          if (trimmed.length < 50 && trimmed === trimmed.toUpperCase() && /^[A-Z\s]+$/.test(trimmed)) {
            return `**${trimmed}**`;
          }
          
          if (/^\d+[\.\)]/.test(trimmed) || /^[-•]/.test(trimmed)) {
            return trimmed;
          }
          
          return trimmed;
        })
        .join('\n');
      
      setTempSelection(formatted);
      setIsFormatted(true);
    } else {
      const unformatted = tempSelection
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/__(.*?)__/g, '$1');
      setTempSelection(unformatted);
      setIsFormatted(false);
    }
  };

  // Clear selection
  const clearSelection = () => {
    setTempSelection("");
    setSelections([]);
    setIsFormatted(false);
  };

  // Page range selection
  const selectPageRange = async (startPage: number, endPage: number) => {
    let combinedText = "";
    for (let i = startPage; i <= endPage; i++) {
      const pageText = await extractPageText(i);
      combinedText += `=== PAGINA ${i} ===\n\n${pageText}\n\n`;
    }
    setTempSelection(combinedText);
    setIsFormatted(false);
  };

  // Extract all text from PDF
  const extractAllTextFromPDF = async (): Promise<string> => {
    if (!numPages) return "";
    
    let fullText = "";
    for (let i = 1; i <= numPages; i++) {
      const pageText = await extractPageText(i);
      fullText += `=== PAGINA ${i} ===\n\n${pageText}\n\n`;
    }
    return fullText;
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm && fileType === 'pdf') {
        searchInDocument(searchTerm);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, searchInDocument, fileType]);

  // Check if current page has OCR
  const currentPageHasOCR = Boolean(pageNumber && ocrPages[pageNumber]);
  const currentPageOCRLoading = Boolean(pageNumber && isOCRLoading[pageNumber]);
  const currentPageOCRProgress = pageNumber ? (ocrProgress[pageNumber] || 0) : 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {if (!open) onClose();}} modal={false}>
      <DialogContent
        forceMount
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        className="max-w-[98vw] max-h-[98vh] overflow-hidden data-[state=closed]:hidden"
      >
        <DialogTitle className="text-lg font-semibold text-gray-800">
          Smart PDF & Image Reader
        </DialogTitle>
        <DialogDescription className="text-sm text-gray-500 mb-4">
          {fileType === 'pdf' 
            ? "Naviga, cerca, evidenzia testo e usa OCR per pagine scansionate"
            : "Estrazione automatica del testo dall'immagine con OCR"
          }
        </DialogDescription>

        <div className="flex gap-4 h-[85vh] overflow-hidden">
          
          {/* Content Section - PDF or Image */}
          <div className="w-1/2 flex flex-col">
            
            {/* Toolbar - Only for PDF */}
            {fileType === 'pdf' && (
              <div className="flex gap-2 items-center mb-2 p-2 bg-gray-50 rounded">
                <div className="flex gap-2">
                  <button
                    onClick={() => setScale(prev => Math.max(prev - 0.25, 0.5))}
                    className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm"
                  >
                    -
                  </button>
                  <span className="px-2 py-1 text-sm">{Math.round(scale * 100)}%</span>
                  <button
                    onClick={() => setScale(prev => Math.min(prev + 0.25, 3))}
                    className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm"
                  >
                    +
                  </button>
                </div>

                <div className="flex-1 flex gap-2">
                  <input
                    type="text"
                    placeholder="Cerca nel documento..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1 px-2 py-1 border rounded text-sm"
                  />
                  {searchResults.length > 0 && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          const newIndex = Math.max(currentSearchIndex - 1, 0);
                          setCurrentSearchIndex(newIndex);
                          setPageNumber(searchResults[newIndex].page);
                        }}
                        className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm"
                      >
                        ↑
                      </button>
                      <span className="px-2 py-1 text-sm">{currentSearchIndex + 1}/{searchResults.length}</span>
                      <button
                        onClick={() => {
                          const newIndex = Math.min(currentSearchIndex + 1, searchResults.length - 1);
                          setCurrentSearchIndex(newIndex);
                          setPageNumber(searchResults[newIndex].page);
                        }}
                        className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm"
                      >
                        ↓
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Content Viewer */}
            <div 
              ref={containerRef} 
              onMouseUp={fileType === 'pdf' ? handleTextSelection : undefined}
              className="flex-1 overflow-y-auto border rounded p-2 bg-white"
            >
              {fileType === 'pdf' && file && (
                <Document
                  file={file}
                  onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                  loading="Caricamento PDF..."
                  error="Errore nel caricamento del PDF"
                >
                  {numPages && (
                    <Page 
                      pageNumber={pageNumber} 
                      scale={scale}
                      renderTextLayer={true}
                      renderAnnotationLayer={true}
                    />
                  )}
                </Document>
              )}

              {fileType === 'image' && imageUrl && (
                <div className="flex items-center justify-center h-full">
                  <img
                    src={imageUrl}
                    alt="Immagine caricata"
                    className="max-h-full max-w-full object-contain rounded"
                  />
                </div>
              )}
            </div>

            {/* OCR Button for PDF pages */}
            {fileType === 'pdf' && pageNumber && !currentPageHasOCR && (
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-900">
                      Testo non selezionabile?
                    </p>
                    <p className="text-xs text-blue-700">
                      Questa pagina potrebbe essere scansionata. Usa l'OCR per estrarre il testo.
                    </p>
                  </div>
                  <button
                    onClick={runOCRForCurrentPage}
                    disabled={Boolean(currentPageOCRLoading)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm flex items-center"
                  >
                    {currentPageOCRLoading ? (
                      <>
                        <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {currentPageOCRProgress}%
                      </>
                    ) : (
                      <>
                        🧠 Attiva OCR
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* OCR Success for PDF pages */}
            {fileType === 'pdf' && currentPageHasOCR && (
              <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm font-medium text-green-900">
                  ✅ OCR completato per pagina {pageNumber}
                </p>
                <p className="text-xs text-green-700">
                  Il testo estratto è stato aggiunto alla selezione.
                </p>
              </div>
            )}

            {/* OCR Progress for Image */}
            {fileType === 'image' && isOCRLoading['image'] && (
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-medium text-blue-900">
                  🧠 Estrazione testo in corso...
                </p>
                <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(ocrProgress['image'] || 0)}%` }}
                  ></div>
                </div>
                <p className="text-xs text-blue-700 mt-1">
                  {(ocrProgress['image'] || 0)}% completato
                </p>
              </div>
            )}

            {/* Table Preview - Only for PDF */}
            {fileType === 'pdf' && (
              <TablePreview 
                tables={detectedTables}
                onSelectTable={handleSelectTable}
              />
            )}

            {/* Navigation Controls - Only for PDF */}
            {fileType === 'pdf' && numPages && (
              <div className="flex justify-between items-center mt-2">
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      const startPage = parseInt(prompt("Pagina iniziale:", "1") || "1");
                      const endPage = parseInt(prompt("Pagina finale:", numPages.toString()) || numPages.toString());
                      if (startPage >= 1 && endPage <= numPages && startPage <= endPage) {
                        await selectPageRange(startPage, endPage);
                      }
                    }}
                    className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm"
                  >
                    Seleziona range
                  </button>
                  <button
                    onClick={async () => {
                      const allText = await extractAllTextFromPDF();
                      setTempSelection(allText);
                      setIsFormatted(false);
                    }}
                    className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                  >
                    Tutto il testo
                  </button>
                </div>

                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setPageNumber((prev) => Math.max(prev - 1, 1))}
                    disabled={pageNumber <= 1}
                    className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
                  >
                    ← Prec
                  </button>
                  <div className="flex items-center gap-2">
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
                    <span className="text-sm text-gray-700">/ {numPages}</span>
                  </div>
                  <button
                    onClick={() => setPageNumber((prev) => Math.min(prev + 1, numPages!))}
                    disabled={pageNumber >= numPages}
                    className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
                  >
                    Succ →
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Text Selection Panel */}
          <div className="w-1/2 flex flex-col overflow-hidden">
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm text-gray-600">
                Testo selezionato:
                {selections.length > 0 && (
                  <span className="ml-2 text-xs text-blue-600">
                    {selections.filter(s => s.type === 'manual').length} manuali, 
                    {selections.filter(s => s.type === 'ocr').length} OCR
                  </span>
                )}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={toggleFormatting}
                  className={`px-3 py-1 text-xs rounded ${
                    isFormatted 
                      ? 'bg-orange-600 text-white hover:bg-orange-700' 
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {isFormatted ? 'Raw' : 'Format'}
                </button>
                <button
                  onClick={clearSelection}
                  className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col">
              <textarea
                value={tempSelection}
                onChange={(e) => setTempSelection(e.target.value)}
                className="w-full flex-1 p-3 border rounded bg-gray-50 text-sm resize-none font-mono leading-relaxed"
                placeholder="Il testo selezionato o estratto con OCR comparirà qui. Puoi modificarlo prima dell'invio..."
              />
              <div className="text-xs text-gray-500 mt-1 mb-2">
                {tempSelection.length} caratteri | {selections.length} selezioni
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 mt-auto pt-2">
                <DialogClose asChild>
                  <button
                    type="button"
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                  >
                    Annulla
                  </button>
                </DialogClose>
                <button
                  onClick={() => {
                    if (tempSelection.trim()) {
                      onTextSelected(tempSelection.trim());
                      onClose();
                      clearSelection();
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
        </div>
      </DialogContent>
    </Dialog>
  );
}