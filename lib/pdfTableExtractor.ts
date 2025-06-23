// utils/pdfTableExtractor.ts

interface TextItem {
  str: string;
  transform: number[];
  width: number;
  height: number;
}

interface TableCell {
  text: string;
  row: number;
  col: number;
  x: number;
  y: number;
}

interface DetectedTable {
  cells: TableCell[][];
  startY: number;
  endY: number;
  confidence: number;
}

export class PdfTableExtractor {
  private readonly SAME_LINE_THRESHOLD = 3; // pixels
  private readonly MIN_COLUMN_GAP = 10; // pixels
  private readonly TABLE_CONFIDENCE_THRESHOLD = 0.7;

  /**
   * Estrae tabelle da una pagina PDF
   */
  async extractTablesFromPage(page: any): Promise<{ tables: DetectedTable[], text: string }> {
    const textContent = await page.getTextContent();
    const textItems = textContent.items as TextItem[];
    
    // Step 1: Raggruppa elementi per riga
    const rows = this.groupItemsByRow(textItems);
    
    // Step 2: Identifica potenziali tabelle
    const potentialTables = this.identifyTableRegions(rows);
    
    // Step 3: Costruisci struttura tabelle
    const tables = potentialTables.map(region => this.buildTableStructure(region));
    
    // Step 4: Genera output combinato
    const formattedOutput = this.formatPageWithTables(textItems, tables);
    
    return { tables, text: formattedOutput };
  }

  /**
   * Raggruppa text items per coordinate Y (righe)
   */
  private groupItemsByRow(items: TextItem[]): Map<number, TextItem[]> {
    const rows = new Map<number, TextItem[]>();
    
    items.forEach(item => {
      const y = Math.round(item.transform[5]);
      let assigned = false;
      
      // Cerca una riga esistente vicina
      for (const [rowY, rowItems] of rows.entries()) {
        if (Math.abs(y - rowY) <= this.SAME_LINE_THRESHOLD) {
          rowItems.push(item);
          assigned = true;
          break;
        }
      }
      
      // Crea nuova riga se necessario
      if (!assigned) {
        rows.set(y, [item]);
      }
    });
    
    // Ordina items in ogni riga per coordinate X
    rows.forEach(rowItems => {
      rowItems.sort((a, b) => a.transform[4] - b.transform[4]);
    });
    
    return rows;
  }

  /**
   * Identifica regioni che potrebbero essere tabelle
   */
  private identifyTableRegions(rows: Map<number, TextItem[]>): TextItem[][][] {
    const sortedRows = Array.from(rows.entries())
      .sort(([y1], [y2]) => y2 - y1); // Dal basso verso l'alto
    
    const tableRegions: TextItem[][][] = [];
    let currentRegion: TextItem[][] = [];
    let previousColumnPattern: number[] = [];
    
    for (const [y, items] of sortedRows) {
      const columnPattern = this.detectColumnPattern(items);
      
      if (columnPattern.length >= 2) { // Almeno 2 colonne
        const isSimilarPattern = this.compareColumnPatterns(previousColumnPattern, columnPattern);
        
        if (isSimilarPattern && currentRegion.length > 0) {
          currentRegion.push(items);
        } else {
          if (currentRegion.length >= 2) { // Almeno 2 righe
            tableRegions.push(currentRegion);
          }
          currentRegion = [items];
          previousColumnPattern = columnPattern;
        }
      } else {
        if (currentRegion.length >= 2) {
          tableRegions.push(currentRegion);
        }
        currentRegion = [];
        previousColumnPattern = [];
      }
    }
    
    if (currentRegion.length >= 2) {
      tableRegions.push(currentRegion);
    }
    
    return tableRegions;
  }

  /**
   * Rileva pattern di colonne in una riga
   */
  private detectColumnPattern(items: TextItem[]): number[] {
    if (items.length < 2) return [];
    
    const gaps: number[] = [];
    for (let i = 1; i < items.length; i++) {
      const gap = items[i].transform[4] - (items[i-1].transform[4] + items[i-1].width);
      if (gap > this.MIN_COLUMN_GAP) {
        gaps.push(items[i].transform[4]); // Posizione X della colonna
      }
    }
    
    return gaps;
  }

  /**
   * Confronta due pattern di colonne per similarità
   */
  private compareColumnPatterns(pattern1: number[], pattern2: number[]): boolean {
    if (pattern1.length !== pattern2.length) return false;
    if (pattern1.length === 0) return false;
    
    const tolerance = 15; // pixels
    return pattern1.every((x1, i) => Math.abs(x1 - pattern2[i]) < tolerance);
  }

  /**
   * Costruisce la struttura della tabella
   */
  private buildTableStructure(region: TextItem[][]): DetectedTable {
    const cells: TableCell[][] = [];
    const columnPositions = this.inferColumnPositions(region);
    
    region.forEach((rowItems, rowIndex) => {
      const rowCells: TableCell[] = [];
      
      // Assegna ogni item a una colonna
      rowItems.forEach(item => {
        const colIndex = this.findColumnIndex(item.transform[4], columnPositions);
        const cell: TableCell = {
          text: item.str.trim(),
          row: rowIndex,
          col: colIndex,
          x: item.transform[4],
          y: item.transform[5]
        };
        rowCells[colIndex] = cell;
      });
      
      // Riempi celle vuote
      for (let i = 0; i < columnPositions.length; i++) {
        if (!rowCells[i]) {
          rowCells[i] = { text: '', row: rowIndex, col: i, x: columnPositions[i], y: 0 };
        }
      }
      
      cells.push(rowCells);
    });
    
    return {
      cells,
      startY: Math.max(...region.flat().map(item => item.transform[5])),
      endY: Math.min(...region.flat().map(item => item.transform[5])),
      confidence: this.calculateTableConfidence(cells)
    };
  }

  /**
   * Inferisce le posizioni delle colonne
   */
  private inferColumnPositions(region: TextItem[][]): number[] {
    const allX = new Set<number>();
    
    region.forEach(row => {
      row.forEach(item => {
        allX.add(Math.round(item.transform[4]));
      });
    });
    
    return Array.from(allX).sort((a, b) => a - b);
  }

  /**
   * Trova l'indice della colonna per una posizione X
   */
  private findColumnIndex(x: number, columnPositions: number[]): number {
    const tolerance = 20;
    for (let i = 0; i < columnPositions.length; i++) {
      if (Math.abs(x - columnPositions[i]) < tolerance) {
        return i;
      }
    }
    return columnPositions.length; // Nuova colonna
  }

  /**
   * Calcola il confidence score della tabella
   */
  private calculateTableConfidence(cells: TableCell[][]): number {
    if (cells.length < 2 || cells[0].length < 2) return 0;
    
    let filledCells = 0;
    let totalCells = 0;
    
    cells.forEach(row => {
      row.forEach(cell => {
        totalCells++;
        if (cell.text) filledCells++;
      });
    });
    
    const fillRate = filledCells / totalCells;
    const regularityScore = this.calculateRegularityScore(cells);
    
    return (fillRate + regularityScore) / 2;
  }

  /**
   * Calcola quanto è regolare la struttura della tabella
   */
  private calculateRegularityScore(cells: TableCell[][]): number {
    const colCounts = cells.map(row => row.filter(cell => cell.text).length);
    const avgCols = colCounts.reduce((a, b) => a + b, 0) / colCounts.length;
    const variance = colCounts.reduce((sum, count) => sum + Math.pow(count - avgCols, 2), 0) / colCounts.length;
    
    return Math.max(0, 1 - (variance / avgCols));
  }

  /**
   * Formatta l'output combinando testo e tabelle
   */
  private formatPageWithTables(allItems: TextItem[], tables: DetectedTable[]): string {
    let output = '';
    const processedItems = new Set<TextItem>();
    
    // Marca gli items che fanno parte di tabelle
    tables.forEach(table => {
      if (table.confidence >= this.TABLE_CONFIDENCE_THRESHOLD) {
        table.cells.flat().forEach(cell => {
          const matchingItem = allItems.find(item => 
            item.str.trim() === cell.text && 
            Math.abs(item.transform[5] - cell.y) < 5
          );
          if (matchingItem) processedItems.add(matchingItem);
        });
      }
    });
    
    // Ordina items per posizione Y (dall'alto al basso)
    const sortedItems = [...allItems].sort((a, b) => b.transform[5] - a.transform[5]);
    
    let currentY = Infinity;
    let currentLine = '';
    
    for (const item of sortedItems) {
      const y = item.transform[5];
      
      // Controlla se c'è una tabella a questa altezza
      const tableAtY = tables.find(t => 
        t.confidence >= this.TABLE_CONFIDENCE_THRESHOLD &&
        y <= t.startY && y >= t.endY
      );
      
      if (tableAtY && !processedItems.has(item)) {
        // Inserisci la tabella nel punto giusto
        if (currentLine) {
          output += currentLine + '\n';
          currentLine = '';
        }
        output += '\n' + this.tableToMarkdown(tableAtY) + '\n\n';
        
        // Marca tutti gli items di questa tabella come processati
        tableAtY.cells.flat().forEach(cell => {
          const matchingItem = allItems.find(i => 
            i.str.trim() === cell.text && 
            Math.abs(i.transform[5] - cell.y) < 5
          );
          if (matchingItem) processedItems.add(matchingItem);
        });
      } else if (!processedItems.has(item)) {
        // Testo normale
        if (Math.abs(currentY - y) > this.SAME_LINE_THRESHOLD && currentLine) {
          output += currentLine + '\n';
          currentLine = item.str;
        } else {
          currentLine += (currentLine ? ' ' : '') + item.str;
        }
        currentY = y;
      }
    }
    
    if (currentLine) {
      output += currentLine + '\n';
    }
    
    return output.trim();
  }

  /**
   * Converte una tabella in formato Markdown
   */
  private tableToMarkdown(table: DetectedTable): string {
    if (table.cells.length === 0) return '';
    
    const maxCols = Math.max(...table.cells.map(row => row.length));
    let markdown = '';
    
    // Header (prima riga)
    markdown += '| ' + table.cells[0].map(cell => cell.text || ' ').join(' | ') + ' |\n';
    
    // Separator
    markdown += '|' + Array(maxCols).fill('---').join('|') + '|\n';
    
    // Body
    for (let i = 1; i < table.cells.length; i++) {
      markdown += '| ' + table.cells[i].map(cell => cell.text || ' ').join(' | ') + ' |\n';
    }
    
    return markdown;
  }

  /**
   * Converte una tabella in formato HTML (alternativa)
   */
  private tableToHTML(table: DetectedTable): string {
    if (table.cells.length === 0) return '';
    
    let html = '<table class="extracted-table">\n';
    
    // Header
    html += '  <thead>\n    <tr>\n';
    table.cells[0].forEach(cell => {
      html += `      <th>${cell.text || '&nbsp;'}</th>\n`;
    });
    html += '    </tr>\n  </thead>\n';
    
    // Body
    html += '  <tbody>\n';
    for (let i = 1; i < table.cells.length; i++) {
      html += '    <tr>\n';
      table.cells[i].forEach(cell => {
        html += `      <td>${cell.text || '&nbsp;'}</td>\n`;
      });
      html += '    </tr>\n';
    }
    html += '  </tbody>\n</table>';
    
    return html;
  }
}