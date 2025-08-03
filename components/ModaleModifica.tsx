import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import ReactMarkdown from "react-markdown";
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import { toast } from "react-hot-toast";

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

    if (!titolo.trim() || !contenuto.trim()) {
      toast.error("❌ Titolo e contenuto sono obbligatori");
      return;
    }

    setSalvando(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) {
        toast.error("❌ Devi essere autenticato per modificare");
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
        toast.error("❌ Errore nel salvataggio delle modifiche");
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

      toast.success("✅ Riassunto aggiornato con successo!");
      onClose();
    } catch (error) {
      console.error("Errore:", error);
      toast.error("❌ Errore di sistema nel salvataggio");
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
      if (confirm("⚠️ Ci sono modifiche non salvate. Vuoi davvero chiudere?")) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const getWordCount = () => {
    return contenuto.trim() ? contenuto.trim().split(/\s+/).length : 0;
  };

  const getCharCount = () => {
    return contenuto.length;
  };

  if (!isOpen || !riassunto) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center px-4">
      <div className="relative w-full max-w-7xl max-h-[95vh] overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl transition-all">
        
        {/* 🎨 HEADER ENTERPRISE */}
        <div className="p-6 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900 dark:to-blue-900 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center text-white font-bold text-xl">
                ✏️
              </div>
              <div>
                <h2 className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                  Editor Riassunto Enterprise
                </h2>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-sm text-purple-700 dark:text-purple-300">
                    Modifica contenuti della biblioteca condivisa
                  </span>
                  <div className="px-3 py-1 bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-800 dark:to-blue-800 text-purple-800 dark:text-purple-200 text-xs rounded-full border border-purple-200 dark:border-purple-700">
                    v{riassunto.versione || 1} → v{(riassunto.versione || 1) + 1}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* 🎯 TOGGLE PREVIEW/EDITOR */}
              <div className="flex bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-1">
                <button
                  onClick={() => setModalitaPreview(false)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all transform hover:scale-105 ${
                    !modalitaPreview 
                      ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-md" 
                      : "text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400"
                  }`}
                >
                  ✏️ Editor
                </button>
                <button
                  onClick={() => setModalitaPreview(true)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all transform hover:scale-105 ${
                    modalitaPreview 
                      ? "bg-gradient-to-r from-green-600 to-blue-600 text-white shadow-md" 
                      : "text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400"
                  }`}
                >
                  👁️ Preview
                </button>
              </div>
              
              <button
                onClick={handleClose}
                className="text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 text-2xl font-bold transition-all p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transform hover:scale-110"
              >
                ✖
              </button>
            </div>
          </div>
        </div>

        {/* 📊 STATISTICHE RAPIDE */}
        <div className="px-6 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <div className="flex gap-6 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                <span className="text-gray-600 dark:text-gray-400">
                  📊 {getCharCount().toLocaleString()} caratteri
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span className="text-gray-600 dark:text-gray-400">
                  📝 {getWordCount().toLocaleString()} parole
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                <span className="text-gray-600 dark:text-gray-400">
                  🕒 Ultima modifica: {riassunto.modificato_il ? new Date(riassunto.modificato_il).toLocaleDateString('it-IT') : 'Mai'}
                </span>
              </div>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              💾 Salvataggio automatico attivo
            </div>
          </div>
        </div>

        {/* 🎯 CONTENUTO PRINCIPALE */}
        <div className="flex h-[calc(95vh-240px)]">
          {/* 📝 PANNELLO SINISTRO - METADATI ENTERPRISE */}
          <div className="w-96 bg-gradient-to-b from-gray-50 to-purple-50 dark:from-gray-900 dark:to-purple-900 p-6 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
            <div className="space-y-6">
              {/* 📚 INFORMAZIONI GENERALI */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  📚 Informazioni Generali
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      📝 Titolo del riassunto
                    </label>
                    <input
                      type="text"
                      value={titolo}
                      onChange={(e) => setTitolo(e.target.value)}
                      className="w-full p-3 border rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-purple-500 transition-all"
                      placeholder="Inserisci un titolo descrittivo..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      🏛️ Facoltà di appartenenza
                    </label>
                    <input
                      type="text"
                      value={facolta}
                      onChange={(e) => setFacolta(e.target.value)}
                      className="w-full p-3 border rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-purple-500 transition-all"
                      placeholder="es. Ingegneria, Medicina..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      📘 Materia specifica
                    </label>
                    <input
                      type="text"
                      value={materia}
                      onChange={(e) => setMateria(e.target.value)}
                      className="w-full p-3 border rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-purple-500 transition-all"
                      placeholder="es. Analisi Matematica I..."
                    />
                  </div>
                </div>
              </div>

              {/* ✍️ MOTIVAZIONE MODIFICA */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  ✍️ Motivazione Modifica
                </h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    💭 Perché stai modificando questo contenuto?
                  </label>
                  <textarea
                    value={motivoModifica}
                    onChange={(e) => setMotivoModifica(e.target.value)}
                    rows={4}
                    className="w-full p-3 border rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-purple-500 transition-all resize-none"
                    placeholder="Descivi brevemente il motivo della modifica per aiutare la community..."
                  />
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    ℹ️ Questa informazione aiuta altri utenti a capire le migliorie apportate
                  </div>
                </div>
              </div>

              {/* 📊 METADATI VERSIONING */}
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900 dark:to-purple-900 rounded-xl p-4 border border-blue-200 dark:border-blue-700">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
                  📊 Cronologia Versioni
                </h3>
                
                <div className="text-sm space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-blue-700 dark:text-blue-300">📅 Creazione:</span>
                    <span className="text-blue-900 dark:text-blue-100 font-medium">
                      {new Date(riassunto.creato_il).toLocaleDateString('it-IT')}
                    </span>
                  </div>
                  
                  {riassunto.modificato_il && (
                    <div className="flex justify-between items-center">
                      <span className="text-blue-700 dark:text-blue-300">✏️ Ultima modifica:</span>
                      <span className="text-blue-900 dark:text-blue-100 font-medium">
                        {new Date(riassunto.modificato_il).toLocaleDateString('it-IT')}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center">
                    <span className="text-blue-700 dark:text-blue-300">🔢 Versione attuale:</span>
                    <span className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-bold">
                      v{riassunto.versione || 1}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center pt-2 border-t border-blue-200 dark:border-blue-700">
                    <span className="text-blue-700 dark:text-blue-300">🚀 Prossima versione:</span>
                    <span className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-2 py-1 rounded text-xs font-bold">
                      v{(riassunto.versione || 1) + 1}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 📄 PANNELLO DESTRO - EDITOR/PREVIEW */}
          <div className="flex-1 flex flex-col bg-white dark:bg-gray-900">
            {modalitaPreview ? (
              /* 👁️ MODALITÀ PREVIEW ENTERPRISE */
              <div className="flex-1 overflow-y-auto">
                <div className="p-6">
                  <div className="bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-900 dark:to-blue-900 border border-green-200 dark:border-green-700 rounded-xl p-4 mb-6">
                    <h3 className="font-semibold text-green-800 dark:text-green-200 flex items-center gap-2 mb-2">
                      👁️ Anteprima Rendering
                    </h3>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Visualizzazione di come apparirà il riassunto nella biblioteca condivisa
                    </p>
                  </div>
                  
                  <div className="prose prose-lg dark:prose-invert max-w-none bg-white dark:bg-gray-800 rounded-xl p-8 border border-gray-200 dark:border-gray-700 shadow-sm">
                    {contenuto.trim() ? (
                      <ReactMarkdown
                        remarkPlugins={[remarkMath, remarkGfm]}
                        rehypePlugins={[rehypeKatex, rehypeHighlight]}
                      >
                        {contenuto}
                      </ReactMarkdown>
                    ) : (
                      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                        <div className="text-4xl mb-4">📄</div>
                        <p className="text-lg">Nessun contenuto da visualizzare</p>
                        <p className="text-sm">Inserisci del testo nell'editor per vedere l'anteprima</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* ✏️ MODALITÀ EDITOR ENTERPRISE */
              <div className="flex-1 p-6">
                <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900 dark:to-blue-900 border border-purple-200 dark:border-purple-700 rounded-xl p-4 mb-4">
                  <h3 className="font-semibold text-purple-800 dark:text-purple-200 flex items-center gap-2 mb-2">
                    ✏️ Editor Markdown Avanzato
                  </h3>
                  <p className="text-sm text-purple-700 dark:text-purple-300">
                    Supporto completo per Markdown, LaTeX e sintassi avanzata
                  </p>
                </div>
                
                <div className="relative h-[calc(100%-80px)]">
                  <textarea
                    value={contenuto}
                    onChange={(e) => setContenuto(e.target.value)}
                    className="w-full h-full p-6 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 transition-all resize-none font-mono text-sm leading-relaxed shadow-inner"
                    placeholder="✏️ Modifica il contenuto del riassunto qui...

📝 **Supporto Markdown completo:**
- **Grassetto** e *corsivo*
- ## Titoli di sezione
- - Liste puntate e numerate
- `Codice inline` e blocchi di codice
- [Link](https://example.com)
- ![Immagini](url)

🔢 **Formule matematiche LaTeX:**
- Inline: $x^2 + y^2 = z^2$
- Display: $$\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}$$

💡 **Suggerimenti:**
- Usa titoli per organizzare il contenuto
- Aggiungi esempi pratici quando possibile
- Includi definizioni chiare dei concetti chiave"
                  />
                  
                  {/* 📊 INDICATORI DI STATO */}
                  <div className="absolute bottom-4 right-4 flex gap-2">
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1 text-xs text-gray-600 dark:text-gray-400 shadow-sm">
                      {getCharCount().toLocaleString()} caratteri
                    </div>
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1 text-xs text-gray-600 dark:text-gray-400 shadow-sm">
                      {getWordCount().toLocaleString()} parole
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 🎯 FOOTER AZIONI ENTERPRISE */}
        <div className="p-6 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                🌐 <strong>Visibilità pubblica:</strong> Le modifiche saranno visibili a tutti gli utenti della biblioteca
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="px-6 py-3 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all transform hover:scale-105 font-medium"
              >
                ❌ Annulla
              </button>
              
              <button
                onClick={handleSalva}
                disabled={salvando || !titolo.trim() || !contenuto.trim()}
                className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 font-medium shadow-lg flex items-center gap-2"
              >
                {salvando ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    🔄 Elaborazione in corso...
                  </>
                ) : (
                  <>
                    💾 Salva Modifiche Enterprise
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}