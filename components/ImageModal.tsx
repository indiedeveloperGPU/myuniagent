import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@radix-ui/react-dialog";
import Tesseract from "tesseract.js";

interface ImageModalProps {
  open: boolean;
  onClose: () => void;
  imageUrl: string;
  onExtractedText: (text: string) => void;
}

export default function ImageModal({ open, onClose, imageUrl, onExtractedText }: ImageModalProps) {
  const [ocrText, setOcrText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && imageUrl) {
      setLoading(true);
      setError(null);
      Tesseract.recognize(imageUrl, "ita", {
        logger: m => console.log(m),
      })
        .then(({ data: { text } }) => {
          setOcrText(text.trim());
          setLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setError("Errore durante l'OCR. Riprova.");
          setLoading(false);
        });
    }
  }, [open, imageUrl]);

  const handleUseText = () => {
    if (ocrText.trim()) {
      onExtractedText(ocrText.trim());
      onClose();
      setOcrText("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()} modal={false}>
      <DialogContent
        forceMount
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        className="max-w-7xl max-h-[95vh] overflow-hidden bg-white rounded-lg shadow-md p-4"
      >
        <DialogTitle className="text-lg font-semibold">📸 Testo da immagine</DialogTitle>
        <DialogDescription className="text-sm text-muted-foreground mt-1">
          Visualizza e modifica il testo rilevato tramite tecnologia avanzata. Puoi incollarlo direttamente nel campo principale.
        </DialogDescription>

        <DialogDescription className="text-sm text-gray-500 mb-4">
          L'immagine viene analizzata per rilevare e convertire il testo selezionabile/modificabile.
        </DialogDescription>

        <div className="flex gap-6 h-[75vh] overflow-hidden">
          <div className="flex-1 border rounded p-2 bg-gray-50 flex items-center justify-center max-h-full overflow-auto">
            <img src={imageUrl} alt="Immagine caricata" className="max-h-full object-contain rounded" />
          </div>
          <div className="flex-1 flex flex-col min-w-0">
            <p className="text-sm text-gray-600 mb-2">Testo rilevato:</p>

            {loading ? (
              <div className="text-sm text-muted-foreground animate-pulse">🧠 Estrazione in corso...</div>
            ) : error ? (
              <p className="text-sm text-red-500">{error}</p>
            ) : (
              <textarea
                value={ocrText}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setOcrText(e.target.value)}
                className="flex-1 w-full p-3 border rounded bg-gray-50 text-sm resize-none font-mono leading-relaxed"
                placeholder="Il testo rilevato comparirà qui. Puoi modificarlo prima dell’invio..."
                style={{ minHeight: '200px' }}
              />
            )}

            <div className="flex justify-between items-center mt-4">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Annulla
              </button>
              <button
                onClick={handleUseText}
                disabled={!ocrText.trim()}
                title={!ocrText.trim() ? "Attendi l'estrazione OCR..." : ""}
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
