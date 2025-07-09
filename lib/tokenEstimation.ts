// 🧮 SISTEMA DI CONTEGGIO TOKEN AVANZATO per MyUniAgent
// File: lib/tokenEstimation.ts

export interface TokenEstimate {
  inputTokens: number;
  promptTokens: number;
  totalInputTokens: number;
  maxOutputTokens: number;
  estimatedCost?: number;
  model: string;
}

export interface TokenCounter {
  estimateTokens(text: string): number;
  estimatePromptTokens(facolta: string, materia: string): number;
  getModelInfo(): ModelInfo;
}

interface ModelInfo {
  name: string;
  avgCharsPerToken: number;
  maxContextLength: number;
  costPer1kTokens?: number;
}

// 🦙 LLAMA TOKEN COUNTER - Ottimizzato per il modello attuale
class LlamaTokenCounter implements TokenCounter {
  private modelInfo: ModelInfo = {
    name: "meta-llama/llama-4-maverick-17b-128e-instruct",
    avgCharsPerToken: 3.8, // Llama è più efficiente di GPT
    maxContextLength: 32768,
    costPer1kTokens: 0.00059 // Costo Groq reale
  };

  estimateTokens(text: string): number {
    const baseEstimate = Math.ceil(text.length / this.modelInfo.avgCharsPerToken);
    
    // Correzioni per caratteristiche del testo
    let adjustment = 1.0;
    
    // Testi accademici hanno più token lunghi → meno token totali
    if (this.isAcademicText(text)) {
      adjustment *= 0.85;
    }
    
    // Molti numeri e formule → più token
    if (this.hasManyNumbers(text)) {
      adjustment *= 1.15;
    }
    
    // Molte parole tecniche/lunghe → meno token
    if (this.hasTechnicalTerms(text)) {
      adjustment *= 0.9;
    }
    
    return Math.ceil(baseEstimate * adjustment);
  }

  estimatePromptTokens(facolta: string, materia: string): number {
    // Stima basata sulla lunghezza del prompt HITL attuale
    const basePromptLength = 2800; // Caratteri del prompt di sistema
    const dinamicLength = facolta.length + materia.length + 100; // Parti dinamiche
    const totalPromptChars = basePromptLength + dinamicLength;
    
    return Math.ceil(totalPromptChars / this.modelInfo.avgCharsPerToken);
  }

  getModelInfo(): ModelInfo {
    return this.modelInfo;
  }

  private isAcademicText(text: string): boolean {
    const academicKeywords = [
      'teoria', 'principio', 'definizione', 'concetto', 'approccio',
      'metodologia', 'analisi', 'studio', 'ricerca', 'bibliografia',
      'diritto', 'legge', 'articolo', 'norma', 'giurisprudenza'
    ];
    const keywordCount = academicKeywords.filter(keyword => 
      text.toLowerCase().includes(keyword)
    ).length;
    return keywordCount >= 3;
  }

  private hasManyNumbers(text: string): boolean {
    const numberMatches = text.match(/\d+/g);
    return (numberMatches?.length || 0) / text.split(' ').length > 0.1;
  }

  private hasTechnicalTerms(text: string): boolean {
    const words = text.split(/\s+/);
    const longWords = words.filter(word => word.length > 12).length;
    return longWords / words.length > 0.05;
  }
}

// 🏭 FACTORY PATTERN
export class TokenCounterFactory {
  static create(model: string): TokenCounter {
    // Per ora solo Llama, ma estendibile
    return new LlamaTokenCounter();
  }
}

// 🧮 SERVIZIO PRINCIPALE
export class TokenEstimationService {
  private counter: TokenCounter;

  constructor(model: string = "meta-llama/llama-4-maverick-17b-128e-instruct") {
    this.counter = TokenCounterFactory.create(model);
  }

  // 🔓 METODO PUBBLICO per accedere alle info del modello
  getModelInfo(): ModelInfo {
    return this.counter.getModelInfo();
  }

  estimateRiassuntoTokens(
    text: string, 
    facolta: string, 
    materia: string
  ): TokenEstimate {
    const inputTokens = this.counter.estimateTokens(text);
    const promptTokens = this.counter.estimatePromptTokens(facolta, materia);
    const totalInputTokens = inputTokens + promptTokens;
    
    // Target 40% come da prompt HITL
    const maxOutputTokens = Math.ceil(inputTokens * 0.4);
    
    const modelInfo = this.counter.getModelInfo();
    const estimatedCost = modelInfo.costPer1kTokens 
      ? ((totalInputTokens + maxOutputTokens) / 1000) * modelInfo.costPer1kTokens
      : undefined;

    return {
      inputTokens,
      promptTokens,
      totalInputTokens,
      maxOutputTokens,
      estimatedCost,
      model: modelInfo.name
    };
  }

  // 🚦 CONTROLLO LIMITI INTELLIGENTE
  checkLimits(estimate: TokenEstimate): {
    isValid: boolean;
    warnings: string[];
    suggestions: string[];
  } {
    const warnings: string[] = [];
    const suggestions: string[] = [];
    const modelInfo = this.counter.getModelInfo();

    // Controllo limite di contesto
    const contextUsage = estimate.totalInputTokens / modelInfo.maxContextLength;
    
    if (contextUsage > 0.8) {
      warnings.push(`⚠️ Uso del contesto: ${(contextUsage * 100).toFixed(1)}%`);
      suggestions.push("Considera di ridurre il testo o usare SmartPdfReader per selezioni più precise");
    }

    // Controllo efficienza (troppo piccolo)
    if (estimate.inputTokens < 100) {
      warnings.push("Testo molto breve per un riassunto efficace");
      suggestions.push("Aggiungi più contenuto per ottenere un riassunto significativo");
    }

    // Controllo qualità (troppo grande)
    if (estimate.inputTokens > 6000) {
      warnings.push("Testo molto lungo - possibile perdita di qualità");
      suggestions.push("Usa SmartPdfReader per selezionare solo le sezioni più rilevanti");
    }

    return {
      isValid: estimate.totalInputTokens <= modelInfo.maxContextLength,
      warnings,
      suggestions
    };
  }

  // 📊 STATISTICHE COMPLETE per il Frontend
  getDetailedStats(text: string, facolta: string, materia: string) {
    const estimate = this.estimateRiassuntoTokens(text, facolta, materia);
    const limits = this.checkLimits(estimate);
    
    const words = text.trim().split(/\s+/).length;
    const avgWordsPerToken = words / estimate.inputTokens;
    const compressionRatio = estimate.maxOutputTokens / estimate.inputTokens;

    return {
      // Mantieni compatibilità con getTextStats() esistente
      chars: text.length,
      words,
      estimatedTokens: estimate.inputTokens, // Compatibilità
      
      // Nuove metriche avanzate
      ...estimate,
      limits,
      readability: {
        avgWordsPerToken: parseFloat(avgWordsPerToken.toFixed(2)),
        compressionRatio: parseFloat(compressionRatio.toFixed(2))
      }
    };
  }
}