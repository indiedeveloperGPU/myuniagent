import ReactMarkdown from "react-markdown";
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import { toast } from "react-hot-toast";
import { useState } from "react";

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

interface ModaleRiassuntoProps {
  riassunto: RiassuntoType | null;
  isOpen: boolean;
  onClose: () => void;
  onModifica?: (riassunto: RiassuntoType) => void;
}

export default function ModaleRiassunto({ riassunto, isOpen, onClose, onModifica }: ModaleRiassuntoProps) {
  const [activeTab, setActiveTab] = useState<"riassunto" | "originale">("riassunto");
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (!isOpen || !riassunto) return null;

  const getWordCount = (text: string) => {
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  };

  const getCharCount = (text: string) => {
    return text.length;
  };

  const getReadingTime = (text: string) => {
    const words = getWordCount(text);
    return Math.ceil(words / 200); // 200 parole al minuto
  };

  const handleCopyContent = () => {
    navigator.clipboard.writeText(riassunto.output);
    toast.success("📋 Riassunto copiato negli appunti!");
  };

  const handleExportContent = () => {
    const element = document.createElement('a');
    const file = new Blob([riassunto.output], { type: 'text/markdown' });
    element.href = URL.createObjectURL(file);
    element.download = `${riassunto.titolo.replace(/[^a-zA-Z0-9]/g, '_')}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast.success("📥 File esportato con successo!");
  };

  const daysSinceCreation = Math.floor((new Date().getTime() - new Date(riassunto.creato_il).getTime()) / (1000 * 3600 * 24));

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center px-4">
      <div className={`relative ${isFullscreen ? 'w-full h-full' : 'w-full max-w-6xl max-h-[95vh]'} overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl transition-all`}>
        
        {/* 🎨 HEADER ENTERPRISE */}
        <div className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900 dark:to-purple-900 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4 flex-1">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                📄
              </div>
              
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-bold text-blue-900 dark:text-blue-100 mb-2 line-clamp-2">
                  {riassunto.titolo}
                </h2>
                
                {/* 🏷️ BADGE ENTERPRISE */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {riassunto.facolta && (
                    <div className="px-3 py-1 bg-gradient-to-r from-blue-100 to-cyan-100 dark:from-blue-800 dark:to-cyan-800 text-blue-800 dark:text-blue-200 rounded-full border border-blue-200 dark:border-blue-700 text-sm font-medium">
                      🏛️ {riassunto.facolta}
                    </div>
                  )}
                  {riassunto.materia && (
                    <div className="px-3 py-1 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-800 dark:to-emerald-800 text-green-800 dark:text-green-200 rounded-full border border-green-200 dark:border-green-700 text-sm font-medium">
                      📚 {riassunto.materia}
                    </div>
                  )}
                  <div className="px-3 py-1 bg-gradient-to-r from-gray-100 to-slate-100 dark:from-gray-700 dark:to-slate-700 text-gray-800 dark:text-gray-200 rounded-full border border-gray-200 dark:border-gray-600 text-sm font-medium">
                    📅 {new Date(riassunto.creato_il).toLocaleDateString('it-IT')}
                  </div>
                  {riassunto.versione && riassunto.versione > 1 && (
                    <div className="px-3 py-1 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-800 dark:to-pink-800 text-purple-800 dark:text-purple-200 rounded-full border border-purple-200 dark:border-purple-700 text-sm font-medium">
                      🔄 v{riassunto.versione}
                      {riassunto.modificato_il && (
                        <span className="ml-1 text-xs opacity-75">
                          • {new Date(riassunto.modificato_il).toLocaleDateString('it-IT')}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="px-3 py-1 bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-800 dark:to-orange-800 text-yellow-800 dark:text-yellow-200 rounded-full border border-yellow-200 dark:border-yellow-700 text-sm font-medium">
                    🕒 {daysSinceCreation === 0 ? 'Oggi' : `${daysSinceCreation} giorni fa`}
                  </div>
                </div>

                {/* 📊 STATISTICHE ENTERPRISE */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-blue-200 dark:border-blue-700">
                    <div className="text-blue-600 dark:text-blue-400 font-semibold">📊 Caratteri</div>
                    <div className="text-lg font-bold text-blue-900 dark:text-blue-100">
                      {getCharCount(riassunto.output).toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-green-200 dark:border-green-700">
                    <div className="text-green-600 dark:text-green-400 font-semibold">📝 Parole</div>
                    <div className="text-lg font-bold text-green-900 dark:text-green-100">
                      {getWordCount(riassunto.output).toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-purple-200 dark:border-purple-700">
                    <div className="text-purple-600 dark:text-purple-400 font-semibold">⏱️ Lettura</div>
                    <div className="text-lg font-bold text-purple-900 dark:text-purple-100">
                      {getReadingTime(riassunto.output)} min
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-orange-200 dark:border-orange-700">
                    <div className="text-orange-600 dark:text-orange-400 font-semibold">📏 Rapporto</div>
                    <div className="text-lg font-bold text-orange-900 dark:text-orange-100">
                      {riassunto.input ? `${Math.round((riassunto.output.length / riassunto.input.length) * 100)}%` : 'N/A'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 🎯 CONTROLLI HEADER */}
            <div className="flex items-center gap-3 ml-4">
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all transform hover:scale-105"
                title={isFullscreen ? "Esci da schermo intero" : "Schermo intero"}
              >
                {isFullscreen ? "📱" : "🖥️"}
              </button>
              
              {onModifica && (
                <button
                  onClick={() => onModifica(riassunto)}
                  className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg transition-all transform hover:scale-105 flex items-center gap-2 text-sm font-medium shadow-md"
                >
                  ✏️ Suggerisci Modifica
                </button>
              )}
              
              <button
                className="text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 text-2xl font-bold transition-all p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transform hover:scale-110"
                onClick={onClose}
              >
                ✖
              </button>
            </div>
          </div>
        </div>

        {/* 🎯 TAB NAVIGATION ENTERPRISE */}
        <div className="px-6 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("riassunto")}
              className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all transform hover:scale-[1.02] ${
                activeTab === "riassunto"
                  ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
                  : "text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-gray-700"
              }`}
            >
              ✨ Riassunto Generato
            </button>
            {riassunto.input && (
              <button
                onClick={() => setActiveTab("originale")}
                className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all transform hover:scale-[1.02] ${
                  activeTab === "originale"
                    ? "bg-gradient-to-r from-gray-600 to-slate-600 text-white shadow-lg"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white dark:hover:bg-gray-700"
                }`}
              >
                📝 Contenuto Originale
              </button>
            )}
          </div>
        </div>

        {/* 📄 CONTENUTO PRINCIPALE */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "riassunto" ? (
            /* ✨ TAB RIASSUNTO ENTERPRISE */
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 border border-blue-200 dark:border-blue-700 rounded-xl p-4">
                <h3 className="font-semibold text-blue-800 dark:text-blue-200 flex items-center gap-2 mb-2">
                  ✨ Riassunto AI Enterprise
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Contenuto generato e ottimizzato con intelligenza artificiale avanzata per massima comprensibilità
                </p>
              </div>
              
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden">
                <div className="p-8">
                  <div className="prose prose-lg dark:prose-invert max-w-none">
                    <ReactMarkdown
                      remarkPlugins={[remarkMath, remarkGfm]}
                      rehypePlugins={[rehypeKatex, rehypeHighlight]}
                    >
                      {riassunto.output}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* 📝 TAB CONTENUTO ORIGINALE ENTERPRISE */
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-900/30 dark:to-slate-900/30 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                <h3 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2 mb-2">
                  📝 Materiale Fonte Originale
                </h3>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Contenuto originale utilizzato per la generazione del riassunto
                </p>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm">
                <div className="p-8 max-h-96 overflow-y-auto">
                  <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">
                    {riassunto.input}
                  </pre>
                </div>
              </div>

              {/* 📊 STATISTICHE CONFRONTO */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                  <div className="text-gray-600 dark:text-gray-400 font-semibold mb-2">📊 Testo Originale</div>
                  <div className="space-y-1 text-sm">
                    <div>Caratteri: <span className="font-bold">{getCharCount(riassunto.input).toLocaleString()}</span></div>
                    <div>Parole: <span className="font-bold">{getWordCount(riassunto.input).toLocaleString()}</span></div>
                  </div>
                </div>
                
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                  <div className="text-blue-600 dark:text-blue-400 font-semibold mb-2">✨ Riassunto</div>
                  <div className="space-y-1 text-sm">
                    <div>Caratteri: <span className="font-bold">{getCharCount(riassunto.output).toLocaleString()}</span></div>
                    <div>Parole: <span className="font-bold">{getWordCount(riassunto.output).toLocaleString()}</span></div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 rounded-xl p-4 border border-green-200 dark:border-green-700">
                  <div className="text-green-600 dark:text-green-400 font-semibold mb-2">📈 Efficienza</div>
                  <div className="space-y-1 text-sm">
                    <div>Riduzione: <span className="font-bold">{Math.round((1 - riassunto.output.length / riassunto.input.length) * 100)}%</span></div>
                    <div>Densità: <span className="font-bold">Alta</span></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 🎯 FOOTER AZIONI ENTERPRISE */}
        <div className="p-6 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                🌟 <strong>Qualità enterprise:</strong> Contenuto verificato e ottimizzato
              </div>
              {riassunto.modificato_il && (
                <div className="text-xs text-gray-500 dark:text-gray-500 bg-white dark:bg-gray-800 px-3 py-1 rounded-full border border-gray-200 dark:border-gray-700">
                  ✏️ Ultima modifica: {new Date(riassunto.modificato_il).toLocaleDateString('it-IT')}
                </div>
              )}
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handleCopyContent}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all transform hover:scale-105 font-medium flex items-center gap-2"
              >
                📋 Copia
              </button>
              
              <button
                onClick={handleExportContent}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all transform hover:scale-105 font-medium flex items-center gap-2"
              >
                📥 Esporta
              </button>
              
              <button
                onClick={onClose}
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all transform hover:scale-105 font-medium shadow-lg"
              >
                ✅ Chiudi
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}