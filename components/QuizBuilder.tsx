import { useState, useEffect } from "react";

interface DomandaQuiz {
  tipo: "singola" | "multipla" | "aperta";
  domanda: string;
  opzioni: string[];
  risposta: string | string[];
}

interface QuizBuilderProps {
  onChange: (json: string) => void;
}

export default function QuizBuilder({ onChange }: QuizBuilderProps) {
  const [domande, setDomande] = useState<DomandaQuiz[]>([]);

  useEffect(() => {
    onChange(JSON.stringify(domande));
  }, [domande, onChange]);

  const aggiornaDomanda = (index: number, campo: keyof DomandaQuiz, valore: any) => {
    const nuove = [...domande];
    if (campo === "opzioni") {
      nuove[index].opzioni = valore;
      if (nuove[index].tipo !== "aperta" && !valore.includes(nuove[index].risposta as string)) {
        nuove[index].risposta = nuove[index].tipo === "multipla" ? [] : "";
      }
    } else {
      nuove[index][campo] = valore;
      // Inizializza risposta multipla come array se serve
      if (campo === "tipo" && valore === "multipla") {
        nuove[index].risposta = Array.isArray(nuove[index].risposta) ? nuove[index].risposta : [];
      }
    }
    setDomande(nuove);
  };

  const aggiungiDomanda = () => {
    setDomande([...domande, { tipo: "singola", domanda: "", opzioni: ["", ""], risposta: "" }]);
  };

  const rimuoviDomanda = (index: number) => {
    const nuove = [...domande];
    nuove.splice(index, 1);
    setDomande(nuove);
  };

  const aggiornaOpzione = (index: number, opIndex: number, valore: string) => {
    const nuove = [...domande];
    nuove[index].opzioni[opIndex] = valore;
    setDomande(nuove);
  };

  const toggleRispostaMultipla = (index: number, opzione: string) => {
    const nuove = [...domande];
    const risposte = Array.isArray(nuove[index].risposta) ? nuove[index].risposta : [];

    if (risposte.includes(opzione)) {
      nuove[index].risposta = risposte.filter(r => r !== opzione);
    } else {
      nuove[index].risposta = [...risposte, opzione];
    }

    setDomande(nuove);
  };

  const aggiungiOpzione = (index: number) => {
    const nuove = [...domande];
    if (nuove[index].opzioni.length < 5) {
      nuove[index].opzioni.push("");
      setDomande(nuove);
    }
  };

  const rimuoviOpzione = (index: number, opIndex: number) => {
    const nuove = [...domande];
    nuove[index].opzioni.splice(opIndex, 1);
    setDomande(nuove);
  };

  return (
    <div className="space-y-6">
      {domande.map((d, i) => (
        <div key={i} className="border rounded p-4 space-y-2">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Domanda {i + 1}</h3>
            <button onClick={() => rimuoviDomanda(i)} className="text-red-600 text-sm hover:underline">
              Rimuovi
            </button>
          </div>

          <select
            value={d.tipo}
            onChange={(e) => aggiornaDomanda(i, "tipo", e.target.value)}
            className="border p-2 rounded w-full text-sm"
          >
            <option value="singola">Scelta singola</option>
            <option value="multipla">Scelta multipla</option>
            <option value="aperta">Domanda aperta</option>
          </select>

          <input
            type="text"
            value={d.domanda}
            onChange={(e) => aggiornaDomanda(i, "domanda", e.target.value)}
            placeholder="Scrivi la domanda..."
            className="w-full border p-2 rounded"
          />

          {(d.tipo === "singola" || d.tipo === "multipla") && (
            <div className="space-y-1">
              {d.opzioni.map((op, j) => (
                <div key={j} className="flex items-center gap-2">
                  {d.tipo === "singola" ? (
                    <input
                      type="radio"
                      name={`risposta-${i}`}
                      checked={d.risposta === op}
                      onChange={() => aggiornaDomanda(i, "risposta", op)}
                    />
                  ) : (
                    <input
                      type="checkbox"
                      checked={Array.isArray(d.risposta) && d.risposta.includes(op)}
                      onChange={() => toggleRispostaMultipla(i, op)}
                    />
                  )}
                  <input
                    type="text"
                    value={op}
                    onChange={(e) => aggiornaOpzione(i, j, e.target.value)}
                    placeholder={`Opzione ${j + 1}`}
                    className="border p-2 rounded w-full"
                  />
                  {d.opzioni.length > 2 && (
                    <button onClick={() => rimuoviOpzione(i, j)} className="text-sm text-red-500">
                      ✕
                    </button>
                  )}
                </div>
              ))}
              {d.opzioni.length < 5 && (
                <button
                  onClick={() => aggiungiOpzione(i)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  ➕ Aggiungi opzione
                </button>
              )}
            </div>
          )}

          {d.tipo === "aperta" && (
            <input
              type="text"
              value={d.risposta as string}
              onChange={(e) => aggiornaDomanda(i, "risposta", e.target.value)}
              placeholder="Risposta corretta..."
              className="w-full border p-2 rounded"
            />
          )}
        </div>
      ))}

      <button
        onClick={aggiungiDomanda}
        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
      >
        ➕ Aggiungi domanda
      </button>
    </div>
  );
}
