import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import ReactMarkdown from "react-markdown";
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';

interface RiassuntoType {
  id: string;
  titolo: string;
  input: string;
  output: string;
  creato_il: string;
  facolta?: string;
  materia?: string;
  versione?: number;
  modificato_da?: string;
  modificato_il?: string;
}

interface ModaleModificaProps {
  riassunto: RiassuntoType | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (riassuntoAggiornato: RiassuntoType) => void;
}

export default function ModaleModifica({ riassunto, isOpen, onClose, onSave }: ModaleModificaProps) {
  const [titolo, setTitolo] = useState("");
  const [facolta, setFacolta] = useState("");
  const [materia, setMateria] = useState("");
  const [contenuto, setContenuto] = useState("");
  const [modalitaPreview, setModalitaPreview] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [motivoModifica, setMotivoModifica] = useState("");

  // Popola i campi quando si apre il modale
  useEffect(() => {
    if (riassunto && isOpen) {
      setTitolo(riassunto.titolo || "");
      setFacolta(riassunto.facolta || "");
      setMateria(riassunto.materia || "");
      setContenuto(riassunto.output || "");
      setMotivoModifica("");
      setModalitaPreview(false);
    }
  }, [riassunto, isOpen]);

  const handleSalva = async () => {
    if (!riassunto || salvando) return;

    setSalvando(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) {
        alert("Devi essere autenticato per modificare un riassunto");
        return;
      }

      const { data, error } = await supabase
        .from("riassunti_generati")
        .update({
          titolo: titolo.trim(),
          facolta: facolta.trim() || null,
          materia: materia.trim() || null,
          output: contenuto.trim(),
          modificato_da: user.id,
          modificato_il: new Date().toISOString(),
          versione: (riassunto.versione || 1) + 1
        })
        .eq("id", riassunto.id)
        .select("*")
        .single();

      if (error) {
        console.error("Errore nel salvataggio:", error);
        alert("Errore nel salvataggio delle modifiche");
        return;
      }

      // Callback per aggiornare la UI
      onSave({
        ...riassunto,
        titolo: titolo.trim(),
        facolta: facolta.trim() || "",
        materia: materia.trim() || "",
        output: contenuto.trim(),
        versione: (riassunto.versione || 1) + 1,
        modificato_da: user.id,
        modificato_il: new Date().toISOString()
      });

      onClose();
    } catch (error) {
      console.error("Errore:", error);
      alert("Errore nel salvataggio");
    } finally {
      setSalvando(false);
    }
  };

  const handleClose = () => {
    // Conferma se ci sono modifiche non salvate
    const hasChanges = 
      titolo !== (riassunto?.titolo || "") ||
      facolta !== (riassunto?.facolta || "") ||
      materia !== (riassunto?.materia || "") ||
      contenuto !== (riassunto?.output || "");

    if (hasChanges) {
      if (confirm("Ci sono modifiche non salvate. Vuoi davvero chiudere?")) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  if (!isOpen || !riassunto) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center px-4">
      <div className="relative w-full max-w-6xl max-h-[95vh] overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              ✏️ Modifica riassunto
            </h2>
            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs rounded">
              v{riassunto.versione || 1} → v{(riassunto.versione || 1) + 1}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setModalitaPreview(!modalitaPreview)}
              className={`px-3 py-1 rounded text-sm transition ${
                modalitaPreview 
                  ? "bg-green-600 text-white" 
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              }`}
            >
              {modalitaPreview ? "👁️ Preview" : "✏️ Editor"}
            </button>
            
            <button
              onClick={handleClose}
              className="text-gray-500 hover:text-red-500 text-xl transition-colors"
            >
              ✖
            </button>
          </div>
        </div>

        {/* Contenuto principale */}
        <div className="flex h-[calc(95vh-140px)]">
          {/* Pannello sinistro - Metadati */}
          <div className="w-80 p-6 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  📝 Titolo
                </label>
                <input
                  type="text"
                  value={titolo}
                  onChange={(e) => setTitolo(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                  placeholder="Titolo del riassunto..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  🎓 Facoltà
                </label>
                <input
                  type="text"
                  value={facolta}
                  onChange={(e) => setFacolta(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                  placeholder="es. Ingegneria, Economia..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  📚 Materia
                </label>
                <input
                  type="text"
                  value={materia}
                  onChange={(e) => setMateria(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                  placeholder="es. Analisi Matematica..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  💭 Motivo della modifica (opzionale)
                </label>
                <textarea
                  value={motivoModifica}
                  onChange={(e) => setMotivoModifica(e.target.value)}
                  rows={3}
                  className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Perché stai modificando questo riassunto?"
                />
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                  <p>📅 Creato: {new Date(riassunto.creato_il).toLocaleDateString()}</p>
                  {riassunto.modificato_il && (
                    <p>✏️ Ultima modifica: {new Date(riassunto.modificato_il).toLocaleDateString()}</p>
                  )}
                  <p>🔢 Versione attuale: {riassunto.versione || 1}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Pannello destro - Editor/Preview */}
          <div className="flex-1 flex flex-col">
            {modalitaPreview ? (
              /* Modalità Preview */
              <div className="flex-1 p-6 overflow-y-auto">
                <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkMath, remarkGfm]}
                    rehypePlugins={[rehypeKatex, rehypeHighlight]}
                  >
                    {contenuto || "*Nessun contenuto da visualizzare*"}
                  </ReactMarkdown>
                </div>
              </div>
            ) : (
              /* Modalità Editor */
              <div className="flex-1 p-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  📄 Contenuto riassunto (Markdown supportato)
                </label>
                <textarea
                  value={contenuto}
                  onChange={(e) => setContenuto(e.target.value)}
                  className="w-full h-full border rounded-lg px-4 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 resize-none font-mono text-sm"
                  placeholder="Modifica il contenuto del riassunto qui...

Puoi usare Markdown:
- **Grassetto**
- *Corsivo*  
- ## Titoli
- - Liste
- `Codice`

E formule matematiche: $x^2 + y^2 = z^2$"
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            💡 Le modifiche saranno visibili a tutti gli utenti
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            >
              Annulla
            </button>
            
            <button
              onClick={handleSalva}
              disabled={salvando || !titolo.trim() || !contenuto.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
            >
              {salvando ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Salvando...
                </>
              ) : (
                <>
                  💾 Salva modifiche
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}