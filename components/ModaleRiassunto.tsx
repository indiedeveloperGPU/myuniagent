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

interface ModaleRiassuntoProps {
  riassunto: RiassuntoType | null;
  isOpen: boolean;
  onClose: () => void;
  onModifica?: (riassunto: RiassuntoType) => void;
}

export default function ModaleRiassunto({ riassunto, isOpen, onClose, onModifica }: ModaleRiassuntoProps) {
  if (!isOpen || !riassunto) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center px-4">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl p-6 space-y-6 transition-all">
        
        {/* Pulsante chiusura */}
        <button
          className="absolute top-3 right-3 text-gray-500 hover:text-red-500 text-xl transition-colors"
          onClick={onClose}
        >
          ✖
        </button>

        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-start justify-between">
            <h2 className="text-2xl font-bold text-blue-600 dark:text-blue-300">
              📄 {riassunto.titolo}
            </h2>
            
            {/* Pulsante modifica */}
            {onModifica && (
              <button
                onClick={() => onModifica(riassunto)}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition flex items-center gap-2 text-sm"
              >
                ✏️ Suggerisci modifica
              </button>
            )}
          </div>
          
          <div className="flex flex-wrap gap-2 text-sm text-gray-600 dark:text-gray-400">
            {riassunto.facolta && (
              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                🎓 {riassunto.facolta}
              </span>
            )}
            {riassunto.materia && (
              <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded">
                📚 {riassunto.materia}
              </span>
            )}
            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded">
              📅 {new Date(riassunto.creato_il).toLocaleDateString()}
            </span>
            {riassunto.versione && riassunto.versione > 1 && (
              <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded">
                v{riassunto.versione} {riassunto.modificato_il && `• ${new Date(riassunto.modificato_il).toLocaleDateString()}`}
              </span>
            )}
          </div>
        </div>

        {/* Contenuto input originale */}
        {riassunto.input && (
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              📝 Contenuto originale
            </h3>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg max-h-40 overflow-y-auto">
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {riassunto.input}
              </p>
            </div>
          </div>
        )}

        {/* Riassunto generato */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            ✨ Riassunto generato
          </h3>
          <div className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none markdown-table">
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
    </div>
  );
}