import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";
import DashboardLayout from "@/components/DashboardLayout";
import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";


interface Parola {
  parola: string;
  traduzione: string;
  esempio: string;
}

interface VocabolarioLight {
  id: string;
  tema: string;
  ordine: number;
}

interface VocabolarioCompleto extends VocabolarioLight {
  introduzione?: string;
  parole: Parola[];
  quiz: any[];
}


const livelli = ["A1", "A2", "B1", "B2", "C1", "C2"];

export default function Vocabolario() {
  const router = useRouter();
  const [lingua, setLingua] = useState<string>("");
  const [livello, setLivello] = useState<string>(() => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("fox-livello") || "A1";
  }
  return "A1";
});
  const [vocabolario, setVocabolario] = useState<VocabolarioLight[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [completati, setCompletati] = useState<Set<string>>(new Set());
  const [selezionato, setSelezionato] = useState<string | null>(null);
  const [risposte, setRisposte] = useState<Record<string, Record<string, string>>>({});
  const [vocabolarioSelezionato, setVocabolarioSelezionato] = useState<VocabolarioCompleto | null>(null);
  const [messaggi, setMessaggi] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingModulo, setLoadingModulo] = useState<boolean>(false);

  useEffect(() => {
    const fetchLingua = async () => {
      const { data: session } = await supabase.auth.getUser();
      if (!session.user) return;
      const { data: profilo } = await supabase
        .from("profiles")
        .select("lingua_preferita")
        .eq("id", session.user.id)
        .single();
      if (profilo?.lingua_preferita) {
        setLingua(profilo.lingua_preferita);
      }
    };
    fetchLingua();
  }, []);

  useEffect(() => {
  if (livello) {
    localStorage.setItem("fox-livello", livello);
  }
}, [livello]);


  useEffect(() => {
  if (!lingua) return;
  const fetchData = async () => {
    setLoading(true);
    setError(null);  // reset errore
    const session = await supabase.auth.getUser();
    const user = session.data?.user;
    if (!user) {
      setLoading(false);
      setError("Utente non autenticato.");
      return;
    }

    try {
      const [{ data: vocabolarioData }, { data: completatiData }] = await Promise.all([
        supabase
          .from("vocabolario")
          .select("id, tema, ordine")
          .eq("lingua", lingua)
          .eq("livello", livello)
          .order("ordine", { ascending: true }),

        supabase
          .from("vocabolario_risposte")
          .select("contenuto_id")
          .eq("user_id", user.id)
          .eq("stato", "corretto")
      ]);

      if (vocabolarioData) setVocabolario(vocabolarioData);
      if (completatiData) {
        const ids = completatiData.map((c) => c.contenuto_id);
        setCompletati(new Set(ids));
      }
      setError(null);
    } catch (e) {
      setError("Errore durante il caricamento. Riprova più tardi.");
    }
    setLoading(false);
  };
  fetchData();
}, [lingua, livello]);


  const handleRispostaChange = (itemId: string, domandaIdx: number, valore: string) => {
    setRisposte((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [domandaIdx]: valore,
      },
    }));
  };

  const moduliDaVisualizzare = useMemo(() => {
  return Object.values(
    vocabolario.reduce((acc, curr) => {
      const key = curr.tema;
      const isCompletato = completati.has(curr.id);
      if (!acc[key]) acc[key] = [];
      acc[key].push({ ...curr, completato: isCompletato });
      return acc;
    }, {} as Record<string, Array<VocabolarioLight & { completato: boolean }>>)
  )
  .map((moduli) => {
    const ordinati = [...moduli].sort((a, b) => (a.ordine ?? 0) - (b.ordine ?? 0));
    return ordinati.find((m) => !m.completato);
  })
  .filter((v): v is VocabolarioLight & { completato: boolean } => v !== undefined);
}, [vocabolario, completati]);

  const selezionaModulo = async (id: string) => {
  setSelezionato(id);
  setLoadingModulo(true);
  const { data } = await supabase
    .from("vocabolario")
    .select("id, tema, ordine, introduzione, parole, quiz")
    .eq("id", id)
    .single();
  if (data) setVocabolarioSelezionato(data);
  setLoadingModulo(false);
};


  const inviaRisposte = async (item: VocabolarioCompleto) => {
  const { data: session } = await supabase.auth.getUser();
  if (!session.user) return;

  const risposteUtente = Object.entries(risposte[item.id] || {}).map(([idx, risposta]) => {
    const quiz = item.quiz[parseInt(idx)];
    return {
      domanda: quiz.domanda,
      tipo: quiz.tipo,
      opzioni: quiz.opzioni || [],
      risposta_corretta: quiz.risposta,
      risposta_utente: risposta,
    };
  });

  const payload = {
    user_id: session.user.id,
    contenuto_id: item.id,
    lingua,
    livello,
    tema: item.tema,
    risposte: risposteUtente,
    stato: "in_attesa",
  };

  const { error } = await supabase.from("vocabolario_risposte").insert(payload);

  if (!error) {
    setMessaggi((prev) => ({
      ...prev,
      [item.id]: "✅ Risposte inviate. In attesa di valutazione da Agente Fox.",
    }));
  }
};


  return (
    <DashboardLayout>
      <div className="flex gap-6">
        {/* Sidebar sinistra */}
        <div className="w-1/4 border-r pr-4 border-gray-200 dark:border-gray-700">
          <button
            onClick={() => router.back()}
            className="mb-4 inline-flex items-center gap-2 bg-white dark:bg-gray-900 text-blue-700 dark:text-blue-200 border border-blue-300 dark:border-gray-700 rounded-full px-4 py-2 text-sm font-medium shadow-sm hover:bg-blue-50 dark:hover:bg-gray-800 transition"
          >
            🔙 Torna alla pagina Lingue
          </button>

          <h2 className="text-lg font-semibold mb-3">📚 Temi disponibili ({livello})</h2>
          <select
            value={livello}
            onChange={(e) => setLivello(e.target.value)}
            className="w-full border px-3 py-2 mb-4 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
          >
            {livelli.map((lvl) => (
              <option key={lvl} value={lvl}>{lvl}</option>
            ))}
          </select>

          <ul className="space-y-2">
  {moduliDaVisualizzare.map((v) => {
    const variantiTotali = vocabolario.filter(m => m.tema === v.tema).length;
    const isCompletato = completati.has(v.id);
    return (
      <li key={v.id}>
        <button
  onClick={() => selezionaModulo(v.id)}
  className={`w-full text-left px-3 py-2 rounded-md border flex flex-col items-start ${
    selezionato === v.id
      ? 'bg-blue-100 dark:bg-blue-900 font-semibold'
      : 'bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
  } border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100`}
>
  <span className="flex items-center gap-2 text-sm font-medium">
    📌 {v.tema}
    {completati.has(v.id) && (
      <span className="text-green-600" title="Modulo completato">✔️</span>
    )}
  </span>
  <span className="text-xs text-gray-600">Modulo {v.ordine} di {variantiTotali}</span>
</button>
      </li>
    );
  })}
</ul>
        </div>

        {/* Contenuto vocabolario selezionato */}
        <div className="w-3/4">
          {error && <p className="text-red-600 mb-4 animate-fadein">{error}</p>}
          {loading && <p className="text-gray-500">Caricamento contenuti...</p>}

          {!loading && vocabolario.length === 0 && (
  <p className="text-gray-500">Nessun contenuto disponibile per questo livello.</p>
)}

          {!loading && vocabolario.length > 0 && selezionato && (
  <div className="...">
    {loadingModulo && <p className="text-gray-500">⏳ Caricamento modulo...</p>}
    {!loadingModulo && vocabolarioSelezionato && (
      <div>
        <h2 className="text-xl font-bold mb-1">📌 {vocabolarioSelezionato.tema}</h2>
        {vocabolarioSelezionato.introduzione && (
  <div className="prose max-w-none mb-3 dark:prose-invert">
    <ReactMarkdown
      rehypePlugins={[rehypeRaw, rehypeSanitize]}
      remarkPlugins={[remarkGfm]}
    >
      {vocabolarioSelezionato.introduzione}
    </ReactMarkdown>
  </div>
)}

        <div className="prose max-w-none dark:prose-invert mb-6">
  <ul className="list-disc list-inside space-y-2">
    {vocabolarioSelezionato.parole.map((p, idx) => (
      <li key={idx}>
        <strong>{p.parola}</strong> – {p.traduzione}<br />
        <em className="text-gray-600 text-sm">{p.esempio}</em>
      </li>
    ))}
  </ul>
</div>


        {vocabolarioSelezionato.quiz && (
          <div className="mt-4">
            <h3 className="font-medium mb-2">📝 Quiz</h3>
            <div className="space-y-3">
              {vocabolarioSelezionato.quiz.map((q: any, idx: number) => (
                <div key={idx} className="border p-4 rounded bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 mb-4">
                  <p className="text-sm font-medium mb-1">{q.domanda}</p>
                  {q.tipo === "multipla" ? (
                    <div className="space-y-1">
                      {q.opzioni.map((opt: string, oidx: number) => (
                        <label key={oidx}className={`block text-sm px-2 py-1 rounded cursor-pointer transition-colors duration-300${risposte[vocabolarioSelezionato.id]?.[idx] === opt
                         ? "bg-blue-100 dark:bg-blue-800 font-semibold"
                        : "hover:bg-gray-100 dark:hover:bg-gray-700"}`}>
  <input
    type="radio"
    name={`quiz-${vocabolarioSelezionato.id}-${idx}`}
    value={opt}
    checked={risposte[vocabolarioSelezionato.id]?.[idx] === opt}
    onChange={(e) => handleRispostaChange(vocabolarioSelezionato.id, idx, e.target.value)}
    className="mr-2 accent-blue-600"
  />
  {opt}
</label>

                      ))}
                    </div>
                  ) : (
                    <textarea
                      rows={2}
                      className="w-full border mt-1 p-2 rounded bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="Scrivi la tua risposta"
                      value={risposte[vocabolarioSelezionato.id]?.[idx] || ""}
                      onChange={(e) => handleRispostaChange(vocabolarioSelezionato.id, idx, e.target.value)}
                    />
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={() => inviaRisposte(vocabolarioSelezionato)}
              className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Invia risposte
            </button>

            {messaggi[vocabolarioSelezionato.id] && (
              <p className="text-green-600 text-sm mt-2">{messaggi[vocabolarioSelezionato.id]}</p>
            )}
          </div>
        )}
      </div>
    )}
  </div>
)}

        </div>
      </div>
    </DashboardLayout>
  );
}

Vocabolario.requireAuth = true





