// lib/semanticChunker.ts

interface ChunkMetadata {
  index: number;
  type: 'intro' | 'chapter' | 'section' | 'paragraph' | 'conclusion' | 'mixed';
  hasTable: boolean;
  hasList: boolean;
  startOffset: number;
  endOffset: number;
  pageReferences?: number[];
}

interface SemanticChunk {
  text: string;
  metadata: ChunkMetadata;
  tokenCount: number; // stima approssimativa
}

export class SemanticChunker {
  private readonly MAX_CHUNK_SIZE = 4800;
  private readonly HARD_LIMIT = 5000;
  private readonly MIN_CHUNK_SIZE = 500; // Non creare chunk troppo piccoli
  private readonly OVERLAP_SIZE = 100; // Caratteri di overlap tra chunk
  
  // Pattern per identificare strutture
  private readonly PATTERNS = {
    chapter: /^(CAPITOLO|CHAPTER|CAP\.|PARTE)\s+[\dIVXLCDM]+/i,
    section: /^(\d+\.[\d\.]*\s+|[A-Z]{2,}:)/,
    pageBreak: /^=== PAGINA \d+ ===/,
    listItem: /^[\d\-•\*]\s+/,
    definition: /^[A-Z][^:]+:\s+/,
    conclusion: /^(CONCLUSIONI?|RIASSUNTO|SUMMARY|IN SINTESI)/i,
    tableStart: /^\|.*\|/,
    emptyLine: /^\s*$/
  };

  /**
   * Divide il testo in chunk semantici intelligenti
   */
  chunkText(text: string): SemanticChunk[] {
    // Pre-processing: normalizza il testo
    const normalizedText = this.normalizeText(text);
    
    // Identifica le unità semantiche
    const semanticUnits = this.identifySemanticUnits(normalizedText);
    
    // Raggruppa le unità in chunk ottimali
    const chunks = this.groupUnitsIntoChunks(semanticUnits);
    
    // Post-processing: aggiungi overlap e metadata
    return this.finalizeChunks(chunks);
  }

  /**
   * Normalizza il testo per l'analisi
   */
  private normalizeText(text: string): string {
    return text
      .replace(/\r\n/g, '\n') // Normalizza line endings
      .replace(/\n{3,}/g, '\n\n') // Max 2 newline consecutive
      .trim();
  }

  /**
   * Identifica le unità semantiche nel testo
   */
  private identifySemanticUnits(text: string): Array<{
    content: string;
    type: string;
    priority: number;
    canSplit: boolean;
  }> {
    const lines = text.split('\n');
    const units: Array<{
      content: string;
      type: string;
      priority: number;
      canSplit: boolean;
    }> = [];
    
    let currentUnit = {
      content: '',
      type: 'paragraph',
      priority: 1,
      canSplit: true
    };
    
    let inTable = false;
    let inList = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const nextLine = lines[i + 1] || '';
      
      // Rileva inizio capitolo/sezione
      if (this.PATTERNS.chapter.test(line)) {
        if (currentUnit.content) {
          units.push({...currentUnit});
        }
        currentUnit = {
          content: line,
          type: 'chapter',
          priority: 10, // Alta priorità, non separare
          canSplit: false
        };
        continue;
      }
      
      // Rileva sezioni numerate
      if (this.PATTERNS.section.test(line) && line.length < 100) {
        if (currentUnit.content) {
          units.push({...currentUnit});
        }
        currentUnit = {
          content: line,
          type: 'section',
          priority: 8,
          canSplit: false
        };
        continue;
      }
      
      // Rileva tabelle
      if (this.PATTERNS.tableStart.test(line)) {
        if (!inTable && currentUnit.content) {
          units.push({...currentUnit});
          currentUnit = {
            content: '',
            type: 'table',
            priority: 7,
            canSplit: false // Mai dividere tabelle
          };
        }
        inTable = true;
      }
      
      // Fine tabella (riga vuota dopo tabella)
      if (inTable && this.PATTERNS.emptyLine.test(line)) {
        currentUnit.content += line + '\n';
        units.push({...currentUnit});
        currentUnit = {
          content: '',
          type: 'paragraph',
          priority: 1,
          canSplit: true
        };
        inTable = false;
        continue;
      }
      
      // Rileva liste
      if (this.PATTERNS.listItem.test(line)) {
        if (!inList && currentUnit.content) {
          units.push({...currentUnit});
          currentUnit = {
            content: '',
            type: 'list',
            priority: 5,
            canSplit: true // Le liste possono essere divise se troppo lunghe
          };
        }
        inList = true;
      }
      
      // Fine lista
      if (inList && !this.PATTERNS.listItem.test(line) && this.PATTERNS.emptyLine.test(line)) {
        units.push({...currentUnit});
        currentUnit = {
          content: '',
          type: 'paragraph',
          priority: 1,
          canSplit: true
        };
        inList = false;
        continue;
      }
      
      // Rileva definizioni
      if (this.PATTERNS.definition.test(line) && line.length < 200) {
        if (currentUnit.content) {
          units.push({...currentUnit});
        }
        currentUnit = {
          content: line,
          type: 'definition',
          priority: 6,
          canSplit: false
        };
        continue;
      }
      
      // Paragrafo normale - fine detection
      if (this.PATTERNS.emptyLine.test(line) && currentUnit.content) {
        units.push({...currentUnit});
        currentUnit = {
          content: '',
          type: 'paragraph',
          priority: 1,
          canSplit: true
        };
        continue;
      }
      
      // Aggiungi la riga all'unità corrente
      currentUnit.content += (currentUnit.content ? '\n' : '') + line;
    }
    
    // Aggiungi l'ultima unità
    if (currentUnit.content) {
      units.push({...currentUnit});
    }
    
    return units;
  }

  /**
   * Raggruppa le unità semantiche in chunk ottimali
   */
  private groupUnitsIntoChunks(units: Array<{
    content: string;
    type: string;
    priority: number;
    canSplit: boolean;
  }>): Array<{
    units: typeof units;
    totalLength: number;
  }> {
    const chunks: Array<{
      units: typeof units;
      totalLength: number;
    }> = [];
    
    let currentChunk = {
      units: [] as typeof units,
      totalLength: 0
    };
    
    for (const unit of units) {
      const unitLength = unit.content.length;
      
      // Se l'unità singola è troppo grande
      if (unitLength > this.MAX_CHUNK_SIZE) {
        // Salva il chunk corrente se non vuoto
        if (currentChunk.units.length > 0) {
          chunks.push({...currentChunk});
          currentChunk = { units: [], totalLength: 0 };
        }
        
        // Gestisci l'unità oversize
        if (unit.canSplit) {
          // Dividi l'unità grande
          const splitUnits = this.splitLargeUnit(unit);
          for (const splitUnit of splitUnits) {
            chunks.push({
              units: [splitUnit],
              totalLength: splitUnit.content.length
            });
          }
        } else {
          // Non divisibile: accetta come chunk oversize
          chunks.push({
            units: [unit],
            totalLength: unitLength
          });
        }
        continue;
      }
      
      // Verifica se aggiungere l'unità supererebbe il limite
      if (currentChunk.totalLength + unitLength > this.MAX_CHUNK_SIZE) {
        // Non aggiungere unità ad alta priorità a chunk quasi pieni
        if (unit.priority >= 8 && currentChunk.totalLength > this.MIN_CHUNK_SIZE) {
          chunks.push({...currentChunk});
          currentChunk = {
            units: [unit],
            totalLength: unitLength
          };
          continue;
        }
        
        // Per altre unità, verifica se possiamo ancora aggiungerle
        if (currentChunk.totalLength + unitLength <= this.HARD_LIMIT) {
          // Aggiungi se sotto il limite hard
          currentChunk.units.push(unit);
          currentChunk.totalLength += unitLength;
        } else {
          // Inizia nuovo chunk
          chunks.push({...currentChunk});
          currentChunk = {
            units: [unit],
            totalLength: unitLength
          };
        }
      } else {
        // Aggiungi normalmente
        currentChunk.units.push(unit);
        currentChunk.totalLength += unitLength;
      }
    }
    
    // Aggiungi l'ultimo chunk
    if (currentChunk.units.length > 0) {
      chunks.push(currentChunk);
    }
    
    return chunks;
  }

  /**
   * Divide un'unità grande in parti più piccole
   */
  private splitLargeUnit(unit: {
    content: string;
    type: string;
    priority: number;
    canSplit: boolean;
  }): Array<typeof unit> {
    const sentences = this.splitIntoSentences(unit.content);
    const subUnits: Array<typeof unit> = [];
    
    let currentContent = '';
    
    for (const sentence of sentences) {
      if (currentContent.length + sentence.length > this.MAX_CHUNK_SIZE) {
        if (currentContent) {
          subUnits.push({
            ...unit,
            content: currentContent.trim(),
            priority: unit.priority - 1 // Riduci priorità per parti divise
          });
        }
        currentContent = sentence;
      } else {
        currentContent += (currentContent ? ' ' : '') + sentence;
      }
    }
    
    if (currentContent) {
      subUnits.push({
        ...unit,
        content: currentContent.trim(),
        priority: unit.priority - 1
      });
    }
    
    return subUnits;
  }

  /**
   * Divide il testo in frasi
   */
  private splitIntoSentences(text: string): string[] {
    // Usa Intl.Segmenter se disponibile, altrimenti fallback
    if (typeof Intl !== 'undefined' && Intl.Segmenter) {
      const segmenter = new Intl.Segmenter('it', { granularity: 'sentence' });
      return Array.from(segmenter.segment(text)).map(s => s.segment);
    }
    
    // Fallback: split semplice
    return text.split(/(?<=[.!?])\s+/);
  }

  /**
   * Finalizza i chunk con metadata e overlap
   */
  private finalizeChunks(chunks: Array<{
    units: Array<{
      content: string;
      type: string;
      priority: number;
      canSplit: boolean;
    }>;
    totalLength: number;
  }>): SemanticChunk[] {
    const semanticChunks: SemanticChunk[] = [];
    let offset = 0;
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const chunkText = chunk.units.map(u => u.content).join('\n\n');
      
      // Determina il tipo predominante del chunk
      const types = chunk.units.map(u => u.type);
      const predominantType = this.getPredominantType(types);
      
      // Aggiungi overlap con chunk precedente (se esiste)
      let finalText = chunkText;
      if (i > 0 && this.OVERLAP_SIZE > 0) {
        const prevChunk = semanticChunks[i - 1];
        const prevText = prevChunk.text;
        const overlapText = prevText.slice(-this.OVERLAP_SIZE);
        finalText = `[...${overlapText}]\n\n${chunkText}`;
      }
      
      // Crea metadata
      const metadata: ChunkMetadata = {
        index: i,
        type: predominantType as any,
        hasTable: types.includes('table'),
        hasList: types.includes('list'),
        startOffset: offset,
        endOffset: offset + chunkText.length,
        pageReferences: this.extractPageReferences(chunkText)
      };
      
      semanticChunks.push({
        text: finalText,
        metadata,
        tokenCount: this.estimateTokens(finalText)
      });
      
      offset += chunkText.length;
    }
    
    return semanticChunks;
  }

  /**
   * Determina il tipo predominante in un array di tipi
   */
  private getPredominantType(types: string[]): string {
    const typeCounts = types.reduce((acc, type) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Priorità dei tipi
    const priorities = ['chapter', 'section', 'conclusion', 'definition', 'table', 'list', 'paragraph'];
    
    for (const priorityType of priorities) {
      if (typeCounts[priorityType]) {
        return priorityType;
      }
    }
    
    return 'mixed';
  }

  /**
   * Estrae riferimenti alle pagine dal testo
   */
  private extractPageReferences(text: string): number[] {
    const pageRefs: number[] = [];
    const regex = /=== PAGINA (\d+) ===/g;
    let match;
    
    while ((match = regex.exec(text)) !== null) {
      pageRefs.push(parseInt(match[1]));
    }
    
    return pageRefs;
  }

  /**
   * Stima approssimativa dei token (1 token ≈ 4 caratteri)
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}