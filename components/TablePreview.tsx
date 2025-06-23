// components/TablePreview.tsx
import React from 'react';

interface TablePreviewProps {
  tables: Array<{
    cells: Array<Array<{ text: string }>>;
    confidence: number;
  }>;
  onSelectTable: (index: number) => void;
}

export const TablePreview: React.FC<TablePreviewProps> = ({ tables, onSelectTable }) => {
  if (tables.length === 0) return null;

  return (
    <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
      <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
        <span>📊</span>
        <span>Tabelle rilevate ({tables.length})</span>
      </h3>
      
      {tables.map((table, idx) => (
        <div key={idx} className="mb-3 bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-gray-600 dark:text-gray-400">
              Tabella {idx + 1} • {table.cells.length} righe × {table.cells[0]?.length || 0} colonne
            </span>
            <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-100 rounded">
              {Math.round(table.confidence * 100)}% confidence
            </span>
          </div>
          
          {/* Mini preview della tabella */}
          <div className="overflow-x-auto">
            <table className="text-xs w-full">
              <tbody>
                {table.cells.slice(0, 3).map((row, rowIdx) => (
                  <tr key={rowIdx} className="border-b dark:border-gray-700">
                    {row.slice(0, 4).map((cell, colIdx) => (
                      <td key={colIdx} className="px-1 py-0.5 truncate max-w-[100px]">
                        {cell.text || '-'}
                      </td>
                    ))}
                    {row.length > 4 && <td className="px-1 text-gray-400">...</td>}
                  </tr>
                ))}
                {table.cells.length > 3 && (
                  <tr>
                    <td colSpan={5} className="text-center text-gray-400 py-1">
                      ... {table.cells.length - 3} righe rimanenti
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          <button
            onClick={() => onSelectTable(idx)}
            className="mt-2 text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 w-full"
          >
            Seleziona questa tabella
          </button>
        </div>
      ))}
    </div>
  );
};

// hooks/useTableDetection.ts
import { useState, useCallback } from 'react';
import { PdfTableExtractor } from '@/lib/pdfTableExtractor';

export const useTableDetection = () => {
  const [detectedTables, setDetectedTables] = useState<any[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);
  
  const detectTablesInPage = useCallback(async (page: any) => {
    setIsDetecting(true);
    try {
      const extractor = new PdfTableExtractor();
      const { tables } = await extractor.extractTablesFromPage(page);
      setDetectedTables(tables.filter(t => t.confidence > 0.7));
    } catch (error) {
      console.error('Errore rilevamento tabelle:', error);
    } finally {
      setIsDetecting(false);
    }
  }, []);
  
  const selectTable = useCallback((tableIndex: number) => {
    const table = detectedTables[tableIndex];
    if (!table) return '';
    
    // Converti in Markdown
    let markdown = '| ' + table.cells[0].map((c: any) => c.text).join(' | ') + ' |\n';
    markdown += '|' + Array(table.cells[0].length).fill('---').join('|') + '|\n';
    
    for (let i = 1; i < table.cells.length; i++) {
      markdown += '| ' + table.cells[i].map((c: any) => c.text).join(' | ') + ' |\n';
    }
    
    return markdown;
  }, [detectedTables]);
  
  return {
    detectedTables,
    isDetecting,
    detectTablesInPage,
    selectTable
  };
};
