import React from 'react';

// Interfaccia Chunk
interface Chunk {
  id: string;
  title: string;
  section: string | null;
  page_range: string | null;
  order_index: number;
  word_count: number;
  char_count: number;
  status: 'bozza' | 'pronto' | 'in_coda' | 'elaborazione' | 'completato' | 'errore';
  created_at: string;
}

interface ResultItemProps {
  chunk: Chunk;
}

const ResultItemComponent: React.FC<ResultItemProps> = ({ chunk }) => {
  return (
    <div className="bg-white dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 p-6 hover:border-green-300 dark:hover:border-green-600 transition-all">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">{chunk.title}</h4>
          {chunk.section && (
            <p className="text-gray-600 dark:text-gray-400 text-sm">📚 {chunk.section}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">✅ Completato</span>
          <span className="text-xs text-gray-400">#{chunk.order_index}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <div className="text-gray-500 dark:text-gray-400">Caratteri</div>
          <div className="font-medium text-gray-900 dark:text-gray-100">{chunk.char_count.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-gray-500 dark:text-gray-400">Parole</div>
          <div className="font-medium text-gray-900 dark:text-gray-100">{chunk.word_count.toLocaleString()}</div>
        </div>
        {chunk.page_range && (
          <div>
            <div className="text-gray-500 dark:text-gray-400">Pagine</div>
            <div className="font-medium text-gray-900 dark:text-gray-100">{chunk.page_range}</div>
          </div>
        )}
        <div>
          <div className="text-gray-500 dark:text-gray-400">Elaborato</div>
          <div className="font-medium text-gray-900 dark:text-gray-100">{new Date(chunk.created_at).toLocaleDateString('it-IT')}</div>
        </div>
      </div>
    </div>
  );
};

export const ResultItem = React.memo(ResultItemComponent);