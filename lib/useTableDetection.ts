// hooks/useTableDetection.ts
import { useState, useCallback } from 'react';
import { PdfTableExtractor } from '@/lib/pdfTableExtractor';

interface DetectedTable {
  cells: Array<Array<{ text: string; row: number; col: number }>>;
  startY: number;
  endY: number;
  confidence: number;
}

interface UseTableDetectionReturn {
  detectedTables: DetectedTable[];
  isDetecting: boolean;
  detectTablesInPage: (page: any) => Promise<void>;
  selectTable: (tableIndex: number) => string;
  clearDetectedTables: () => void;
  formatTableAsMarkdown: (table: DetectedTable) => string;
  formatTableAsText: (table: DetectedTable) => string;
}

export const useTableDetection = (): UseTableDetectionReturn => {
  const [detectedTables, setDetectedTables] = useState<DetectedTable[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);
  
  /**
   * Rileva tabelle in una pagina PDF
   */
  const detectTablesInPage = useCallback(async (page: any) => {
    if (!page) {
      console.warn('Nessuna pagina fornita per il rilevamento tabelle');
      return;
    }

    setIsDetecting(true);
    try {
      const extractor = new PdfTableExtractor();
      const { tables } = await extractor.extractTablesFromPage(page);
      
      // Filtra solo tabelle con confidence alta
      const highConfidenceTables = tables.filter(t => t.confidence > 0.7);
      
      setDetectedTables(highConfidenceTables);
      
      if (highConfidenceTables.length > 0) {
        console.log(`🎯 Rilevate ${highConfidenceTables.length} tabelle nella pagina`);
      }
    } catch (error) {
      console.error('Errore rilevamento tabelle:', error);
      setDetectedTables([]);
    } finally {
      setIsDetecting(false);
    }
  }, []);
  
  /**
   * Formatta una tabella come Markdown
   */
  const formatTableAsMarkdown = useCallback((table: DetectedTable): string => {
    if (!table || !table.cells || table.cells.length === 0) return '';
    
    let markdown = '';
    
    // Header (prima riga)
    const headerRow = table.cells[0];
    markdown += '| ' + headerRow.map(cell => (cell.text || ' ').trim()).join(' | ') + ' |\n';
    
    // Separator
    markdown += '|' + Array(headerRow.length).fill('---').join('|') + '|\n';
    
    // Body (righe successive)
    for (let i = 1; i < table.cells.length; i++) {
      const row = table.cells[i];
      markdown += '| ' + row.map(cell => (cell.text || ' ').trim()).join(' | ') + ' |\n';
    }
    
    return markdown;
  }, []);
  
  /**
   * Formatta una tabella come testo semplice
   */
  const formatTableAsText = useCallback((table: DetectedTable): string => {
    if (!table || !table.cells || table.cells.length === 0) return '';
    
    // Calcola larghezza massima per ogni colonna
    const columnWidths: number[] = [];
    for (let col = 0; col < table.cells[0].length; col++) {
      let maxWidth = 0;
      for (let row = 0; row < table.cells.length; row++) {
        const cellText = table.cells[row][col]?.text || '';
        maxWidth = Math.max(maxWidth, cellText.length);
      }
      columnWidths[col] = maxWidth;
    }
    
    let textOutput = '';
    
    // Formatta ogni riga
    for (let row = 0; row < table.cells.length; row++) {
      const rowCells = table.cells[row];
      const formattedCells = rowCells.map((cell, col) => {
        const text = cell.text || '';
        return text.padEnd(columnWidths[col], ' ');
      });
      
      textOutput += formattedCells.join(' | ') + '\n';
      
      // Aggiungi separatore dopo header
      if (row === 0) {
        const separator = columnWidths.map(width => '-'.repeat(width)).join('-+-');
        textOutput += separator + '\n';
      }
    }
    
    return textOutput;
  }, []);
  
  /**
   * Seleziona una tabella specifica e la restituisce formattata
   */
  const selectTable = useCallback((tableIndex: number): string => {
    const table = detectedTables[tableIndex];
    if (!table) {
      console.warn(`Tabella con indice ${tableIndex} non trovata`);
      return '';
    }
    
    // Di default usa Markdown, ma puoi cambiare in base alle preferenze
    const formattedTable = formatTableAsMarkdown(table);
    
    // Aggiungi metadata come commento
    const metadata = `<!-- Tabella ${tableIndex + 1} - Confidence: ${Math.round(table.confidence * 100)}% -->`;
    
    return `${metadata}\n${formattedTable}`;
  }, [detectedTables, formatTableAsMarkdown]);
  
  /**
   * Pulisce tutte le tabelle rilevate
   */
  const clearDetectedTables = useCallback(() => {
    setDetectedTables([]);
  }, []);
  
  return {
    detectedTables,
    isDetecting,
    detectTablesInPage,
    selectTable,
    clearDetectedTables,
    formatTableAsMarkdown,
    formatTableAsText
  };
};