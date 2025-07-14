// File: lib/thesisPrompts.ts
// Modulo centralizzato per la generazione di prompt per l'analisi delle tesi.

// =================================================================
// TYPESCRIPT INTERFACES
// =================================================================
type ThesisLevel = 'triennale' | 'magistrale' | 'dottorato';

interface ThesisContext {
  faculty: string;
  thesis_topic: string;
  level: ThesisLevel;
  project_title: string;
}

// =================================================================
// PROMPT GENERATION LOGIC
// =================================================================

/**
 * Fornisce le istruzioni dettagliate e specializzate basate sul tipo di analisi e sul livello accademico.
 * @param analysis_type La chiave del tipo di analisi (es. 'analisi_strutturale').
 * @param level Il livello della tesi.
 * @param faculty La facoltà, per contestualizzare ulteriormente.
 * @returns Una stringa contenente le istruzioni per l'IA.
 */
function getSpecializedAnalysisInstructions(
  analysis_type: string, 
  level: ThesisLevel, 
  faculty: string
): string {
  
  const instructions: Record<string, Partial<Record<ThesisLevel, string>>> = {
    // --- TRIENNALE ---
    'analisi_strutturale': {
      triennale: `## ISTRUZIONI SPECIALIZZATE: ANALISI STRUTTURALE (TRIENNALE)
Valuta l'organizzazione logica e la struttura del lavoro:
- **Coerenza strutturale**: Verifica la sequenza logica delle argomentazioni.
- **Chiarezza espositiva**: Analizza la capacità di presentare idee in modo ordinato.
- **Equilibrio delle parti**: Valuta la proporzione tra le diverse sezioni.
- **Transizioni**: Esamina i collegamenti tra i capitoli/paragrafi.
Criteri di valutazione: Struttura semplice ma efficace, logica consequenziale chiara.`
    },
    'analisi_metodologica': {
      triennale: `## ISTRUZIONI SPECIALIZZATE: ANALISI METODOLOGICA (TRIENNALE)
Valuta l'approccio metodologico adottato:
- **Appropriatezza del metodo**: Verifica l'adeguatezza del metodo scelto rispetto agli obiettivi.
- **Descrizione metodologica**: Analizza la chiarezza nella presentazione del metodo.
- **Applicazione pratica**: Valuta l'implementazione concreta del metodo.
Criteri di valutazione: Comprensione dei principi metodologici, applicazione corretta di metodi standard.`
    },
    // --- MAGISTRALE ---
    'analisi_strutturale_avanzata': {
      magistrale: `## ISTRUZIONI SPECIALIZZATE: ANALISI STRUTTURALE AVANZATA (MAGISTRALE)
Conduci un'analisi approfondita della struttura complessa:
- **Architettura argomentativa**: Esamina la costruzione logica avanzata delle argomentazioni.
- **Interdipendenze concettuali**: Valuta i collegamenti tra concetti complessi.
- **Progressione teorica**: Analizza lo sviluppo teorico attraverso i capitoli.
Criteri di valutazione: Struttura articolata e sofisticata, capacità di gestire complessità concettuale.`
    },
    // --- DOTTORATO ---
    'analisi_originalita_scientifica': {
      dottorato: `## ISTRUZIONI SPECIALIZZATE: ANALISI ORIGINALITÀ SCIENTIFICA (DOTTORATO)
Valuta il contributo originale alla conoscenza scientifica:
- **Novità teorica**: Identifica gli elementi di innovazione teorica.
- **Contributo empirico**: Valuta l'originalità dei dati e delle scoperte.
- **Avanzamento della conoscenza**: Analizza come il lavoro fa progredire il campo.
Criteri di valutazione: Contributo significativo e originale, rilevanza scientifica internazionale.`
    }
  };

  // Ottieni istruzioni specifiche o genera un fallback generico
  return instructions[analysis_type]?.[level] || 
    `## ISTRUZIONI SPECIALIZZATE: ${analysis_type.replace(/_/g, ' ').toUpperCase()} (${level.toUpperCase()})
Conduci un'analisi completa di "${analysis_type.replace(/_/g, ' ')}" secondo i più alti standard accademici per la facoltà di ${faculty} e il livello ${level}. Valuta con rigore, fornendo osservazioni dettagliate, punti di forza e aree di miglioramento.`;
}

/**
 * Crea il prompt completo da inviare all'IA, assemblando contesto e istruzioni.
 * @param text Il testo della tesi da analizzare.
 * @param context L'oggetto contenente il contesto accademico.
 * @param analysis_type Il tipo di analisi da eseguire.
 * @returns La stringa del prompt completo.
 */
export function createThesisAnalysisPrompt(
  text: string, 
  context: ThesisContext, 
  analysis_type: string
): string {
  const { faculty, thesis_topic, level, project_title } = context;
  const specializedInstructions = getSpecializedAnalysisInstructions(analysis_type, level, faculty);

  return `Agisci come AgenteFox, l'esperto relatore universitario più avanzato al mondo, specializzato in valutazione di tesi accademiche.

CONTESTO ACCADEMICO:
- Progetto: ${project_title}
- Facoltà: ${faculty}
- Argomento tesi: ${thesis_topic}
- Livello: ${level.toUpperCase()}
- Tipo di analisi richiesta: "${analysis_type.replace(/_/g, ' ')}"

OBIETTIVO:
Devi condurre un'analisi "${analysis_type}" approfondita e professionale del materiale di tesi fornito, seguendo rigorosamente le istruzioni specializzate per il livello ${level}.

${specializedInstructions}

STRUTTURA DELL'ANALISI RICHIESTA:
La tua analisi deve essere strutturata, chiara e fornire una valutazione critica. Includi osservazioni dettagliate, riferimenti puntuali al testo, identifica punti di forza e suggerisci aree di miglioramento.

MATERIALE DA ANALIZZARE:
---
${text}
---

Procedi ora con l'analisi richiesta.`;
}
