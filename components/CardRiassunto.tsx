interface RiassuntoType {
  id: string;
  titolo: string;
  input: string;
  output: string;
  creato_il: string;
  facolta?: string;
  materia?: string;
}

interface CardRiassuntoProps {
  riassunto: RiassuntoType;
  onOpenModal: (riassunto: RiassuntoType) => void;
}

export default function CardRiassunto({ riassunto, onOpenModal }: CardRiassuntoProps) {
  // Funzione per ottenere un'anteprima del contenuto
  const getPreview = (text: string, maxLength: number = 200) => {
    // Rimuove markdown e caratteri speciali per l'anteprima
    const cleanText = text.replace(/[#*`_~\[\]]/g, '').replace(/\n+/g, ' ');
    return cleanText.length > maxLength 
      ? cleanText.substring(0, maxLength) + '...' 
      : cleanText;
  };

  // Determina la categoria in base al contenuto
  const getCategoria = () => {
    const titolo = riassunto.titolo.toLowerCase();
    if (titolo.includes('esame') || titolo.includes('preparazione')) {
      return 'Preparazioni d\'esame';
    } else if (titolo.includes('lezione') || titolo.includes('appunti')) {
      return 'Appunti di lezione';
    }
    return 'Riassunto';
  };

  return (
    <div 
      className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group overflow-hidden"
      onClick={() => onOpenModal(riassunto)}
    >
      {/* Anteprima contenuto */}
      <div className="h-40 bg-gray-50 dark:bg-gray-800 p-3 relative overflow-hidden">
        <div className="text-xs leading-relaxed text-gray-600 dark:text-gray-400 font-mono">
          {getPreview(riassunto.output, 300)}
        </div>
        
        {/* Overlay gradient per effetto fade */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-gray-50 dark:to-gray-800 pointer-events-none"></div>
        
        {/* Badge categoria in alto a destra */}
        <div className="absolute top-2 right-2 px-2 py-1 bg-blue-600 text-white text-xs rounded">
          {getCategoria()}
        </div>
      </div>

      {/* Contenuto card */}
      <div className="p-4 space-y-3">
        {/* Titolo */}
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {riassunto.titolo}
        </h3>

        {/* Facoltà e Materia */}
        <div className="space-y-1">
          {riassunto.facolta && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              🎓 {riassunto.facolta}
            </p>
          )}
          {riassunto.materia && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              📚 {riassunto.materia}
            </p>
          )}
        </div>

        {/* Data creazione */}
        <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-700">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {new Date(riassunto.creato_il).toLocaleDateString()}
          </span>
          
          {/* Indicatore hover */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
              Clicca per leggere →
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}