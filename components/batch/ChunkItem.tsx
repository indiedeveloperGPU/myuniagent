import React from 'react';

// Interfacce necessarie
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

interface ChunkItemProps {
  chunk: Chunk;
  isSelected: boolean;
  isEditing: boolean;
  editFormData: { title: string; section: string; };
  onToggleSelect: (id: string, checked: boolean) => void;
  onStartEditing: (chunk: Chunk) => void;
  onCancelEditing: () => void;
  onSaveEditing: () => void;
  onDelete: (id: string) => void;
  onEditFormChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  getStatusColor: (status: string) => string;
}

const ChunkItemComponent: React.FC<ChunkItemProps> = ({
  chunk,
  isSelected,
  isEditing,
  editFormData,
  onToggleSelect,
  onStartEditing,
  onCancelEditing,
  onSaveEditing,
  onDelete,
  onEditFormChange,
  getStatusColor,
}) => {
  return (
    <div
      className={`group bg-white dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 p-6 hover:border-blue-300 dark:hover:border-blue-600 transition-all ${
        isSelected ? 'ring-2 ring-blue-500 border-blue-500' : ''
      }`}
    >
      <div className="flex items-start gap-4">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onToggleSelect(chunk.id, e.target.checked)}
          className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 mt-1"
        />
        
        <div className="flex-1">
          {isEditing ? (
            <div className="space-y-3">
              <input
                type="text"
                name="title"
                value={editFormData.title}
                onChange={onEditFormChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"
                placeholder="Titolo sezione..."
                autoFocus
              />
              <input
                type="text"
                name="section"
                value={editFormData.section}
                onChange={onEditFormChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"
                placeholder="Sezione (opzionale)..."
              />
              <div className="flex gap-2">
                <button
                  onClick={onSaveEditing}
                  disabled={!editFormData.title.trim() || editFormData.title.trim().length < 3}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm transition-all"
                >
                  ✅ Salva
                </button>
                <button
                  onClick={onCancelEditing}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm transition-all"
                >
                  ❌ Annulla
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-start mb-3">
                <h4 
                  className="font-semibold text-gray-900 dark:text-gray-100 cursor-pointer hover:text-blue-600 transition-colors flex-1"
                  onClick={() => onStartEditing(chunk)}
                  title="Clicca per modificare"
                >
                  {chunk.title}
                </h4>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(chunk.status)} ml-3`}>
                  {chunk.status}
                </span>
              </div>
              
              {chunk.section ? (
                <p 
                  className="text-gray-600 dark:text-gray-400 mb-3 cursor-pointer hover:text-blue-600 transition-colors"
                  onClick={() => onStartEditing(chunk)}
                  title="Clicca per modificare"
                >
                  📚 {chunk.section}
                </p>
              ) : (
                <p 
                  className="text-gray-400 mb-3 cursor-pointer hover:text-blue-600 transition-colors italic"
                  onClick={() => onStartEditing(chunk)}
                  title="Clicca per aggiungere sezione"
                >
                  📚 Aggiungi sezione...
                </p>
              )}

              <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400 mb-3">
                <div className="flex gap-6">
                  <span>{chunk.char_count.toLocaleString()} caratteri</span>
                  <span>{chunk.word_count.toLocaleString()} parole</span>
                  {chunk.page_range && <span>📄 {chunk.page_range}</span>}
                </div>
                <span>#{chunk.order_index}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-400">
                  {new Date(chunk.created_at).toLocaleDateString('it-IT', {
                    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                  })}
                </span>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); onStartEditing(chunk); }}
                    className="px-3 py-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded text-sm transition-all"
                  >
                    ✏️ Modifica
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(chunk.id); }}
                    className="px-3 py-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-sm transition-all"
                  >
                    🗑️ Elimina
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const ChunkItem = React.memo(ChunkItemComponent);