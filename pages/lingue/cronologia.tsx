import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/lib/supabaseClient";

export default function CronologiaInglese() {
  const [userChecked, setUserChecked] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  

  const [teoria, setTeoria] = useState<any[]>([]);
  const [vocabolari, setVocabolari] = useState<any[]>([]);
  const [quiz, setQuiz] = useState<any[]>([]);
  const [conversazioni, setConversazioni] = useState<any[]>([]);
  const [correzioni, setCorrezioni] = useState<any[]>([]);
  const [simulazioni, setSimulazioni] = useState<any[]>([]);


  const [dettaglio, setDettaglio] = useState<{
    tipo: "teoria" | "vocabolario" | "correzione";
    contenuto: string;
    titolo: string;
    data: string;
  } | null>(null);

  useEffect(() => {
    const checkAuthAndFetch = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        window.location.href = "/auth";
        return;
      }
      setUserId(data.user.id);
      setUserChecked(true);
      await Promise.all([
        fetchTeoria(data.user.id),
        fetchVocabolari(data.user.id),
        fetchQuiz(data.user.id),
        fetchConversazioni(data.user.id),
        fetchCorrezioni(data.user.id),
        fetchSimulazioni(data.user.id),
      ]);
      
    };

    checkAuthAndFetch();
  }, []);

  const fetchTeoria = async (userId: string) => {
    const { data } = await supabase
      .from("teoria_grammaticale")
      .select("*")
      .eq("user_id", userId)
      .order("creata_il", { ascending: false });
    if (data) setTeoria(data);
  };

  const fetchVocabolari = async (userId: string) => {
    const { data } = await supabase
      .from("vocabolario_tematico")
      .select("*")
      .eq("user_id", userId)
      .order("creata_il", { ascending: false });
    if (data) setVocabolari(data);
  };

  const fetchQuiz = async (userId: string) => {
    const { data } = await supabase
      .from("vocabolario_risultati")
      .select("*")
      .eq("user_id", userId)
      .order("creato_il", { ascending: false });
    if (data) setQuiz(data);
  };

  const fetchConversazioni = async (userId: string) => {
    const { data } = await supabase
      .from("conversazione_risultati")
      .select("*")
      .eq("user_id", userId)
      .order("creato_il", { ascending: false });
    if (data) setConversazioni(data);
  };

  const fetchCorrezioni = async (userId: string) => {
    const { data } = await supabase
      .from("correzione_testi")
      .select("*")
      .eq("user_id", userId)
      .order("creato_il", { ascending: false });
    if (data) setCorrezioni(data);
  };

  const fetchSimulazioni = async (userId: string) => {
    const { data } = await supabase
      .from("simulazione_certificazioni")
      .select("*")
      .eq("user_id", userId)
      .order("creato_il", { ascending: false });
    if (data) setSimulazioni(data);
  };
  

  const mostraDettaglio = (
    tipo: "teoria" | "vocabolario" | "correzione",
    titolo: string,
    contenuto: string,
    data: string
  ) => {
    setDettaglio({ tipo, titolo, contenuto, data });
  };

  if (!userChecked) {
    return (
      <DashboardLayout>
        <p>Caricamento in corso...</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold mb-4">📂 Cronologia Allenamento Inglese</h1>
      <p className="text-gray-700 mb-6">
        Tutto il lavoro svolto nelle varie modalità: teoria grammaticale, vocabolario, quiz, conversazioni simulate e correzioni del testo.
      </p>

      {/* TEORIA */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">📚 Teoria Grammaticale</h2>
        {teoria.length === 0 ? (
          <p className="text-gray-500">Nessuna spiegazione salvata.</p>
        ) : (
          <ul className="space-y-2">
            {teoria.map((item) => (
              <li
                key={item.id}
                onClick={() =>
                  mostraDettaglio("teoria", item.titolo, item.contenuto, item.creata_il)
                }
                className="cursor-pointer p-3 border rounded hover:bg-gray-100 transition"
              >
                <div className="font-medium">
                  {item.titolo} <span className="text-sm text-gray-500">({item.livello})</span>
                </div>
                <div className="text-sm text-gray-500">
                  {new Date(item.creata_il).toLocaleString()}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* VOCABOLARIO */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">🧠 Vocabolario Tematico</h2>
        {vocabolari.length === 0 ? (
          <p className="text-gray-500">Nessun vocabolario generato.</p>
        ) : (
          <ul className="space-y-2">
            {vocabolari.map((item) => (
              <li
                key={item.id}
                onClick={() =>
                  mostraDettaglio(
                    "vocabolario",
                    `${item.tema} (${item.livello})`,
                    item.contenuto,
                    item.creata_il
                  )
                }
                className="cursor-pointer p-3 border rounded hover:bg-gray-100 transition"
              >
                <div className="font-medium">
                  {item.tema} ({item.livello})
                </div>
                <div className="text-sm text-gray-500">
                  {new Date(item.creata_il).toLocaleString()}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* QUIZ */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">📊 Risultati Quiz</h2>
        {quiz.length === 0 ? (
          <p className="text-gray-500">Nessun quiz completato.</p>
        ) : (
          <ul className="space-y-2">
            {quiz.map((item) => (
              <li key={item.id} className="p-3 border rounded bg-gray-50">
                <div className="font-medium">
                  {item.tema} ({item.livello})
                </div>
                <div className="text-sm text-gray-700">
                  Punteggio: <strong>{item.punteggio}%</strong>
                </div>
                <div className="text-sm text-gray-500">
                  {new Date(item.creato_il).toLocaleString()}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* CONVERSAZIONI */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">🗣️ Conversazioni Simulate</h2>
        {conversazioni.length === 0 ? (
          <p className="text-gray-500">Nessuna conversazione salvata.</p>
        ) : (
          <ul className="space-y-2">
            {conversazioni.map((item) => (
              <li key={item.id} className="p-3 border rounded bg-gray-50">
                <div className="font-medium">{item.scenario}</div>
                <div className="text-sm text-gray-700">
                  Scrittura: <strong>{item.punteggio_scrittura}%</strong> – Pronuncia: <strong>{item.punteggio_pronuncia}%</strong>
                </div>
                <div className="text-sm text-gray-500">
                  {new Date(item.creato_il).toLocaleString()}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* CORREZIONE TESTO */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">✍️ Correzioni del Testo</h2>
        {correzioni.length === 0 ? (
          <p className="text-gray-500">Nessuna correzione salvata.</p>
        ) : (
          <ul className="space-y-2">
            {correzioni.map((item) => (
              <li
                key={item.id}
                onClick={() =>
                  mostraDettaglio("correzione", `Correzione (${item.livello})`, item.testo_corretto, item.creato_il)
                }
                className="cursor-pointer p-3 border rounded hover:bg-gray-100 transition"
              >
                <div className="font-medium">Correzione ({item.livello})</div>
                <div className="text-sm text-gray-700">
                  Punteggio: <strong>{item.punteggio}%</strong>
                </div>
                <div className="text-sm text-gray-500">
                  {new Date(item.creato_il).toLocaleString()}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* SIMULAZIONI CERTIFICAZIONI */}
<div className="mb-6">
  <h2 className="text-xl font-semibold mb-2">📝 Simulazioni Certificazioni</h2>
  {simulazioni.length === 0 ? (
    <p className="text-gray-500">Nessuna simulazione registrata.</p>
  ) : (
    <ul className="space-y-2">
      {simulazioni.map((item) => (
        <li key={item.id} className="p-4 border rounded bg-gray-50">
          <div className="font-medium">
            {item.certificazione} – Sezione: {item.sezione}
          </div>
          <div className="text-sm text-gray-700 mt-1">
            Punteggio: <strong>{item.punteggio}%</strong>
          </div>
          {item.feedback_gpt && (
            <div className="text-sm text-gray-600 mt-2 whitespace-pre-line">
              <strong>Feedback:</strong><br />
              {item.feedback_gpt}
            </div>
          )}
          <div className="text-sm text-gray-500 mt-2">
            {new Date(item.creato_il).toLocaleString()}
          </div>
        </li>
      ))}
    </ul>
  )}
</div>



      {/* DETTAGLIO */}
      {dettaglio && (
        <div className="mt-6 p-4 border rounded bg-white shadow">
          <h3 className="text-lg font-semibold mb-2">{dettaglio.titolo}</h3>
          <p className="text-sm text-gray-500 mb-4">
            Salvato il {new Date(dettaglio.data).toLocaleString()}
          </p>
          <div className="whitespace-pre-line text-gray-800">{dettaglio.contenuto}</div>

          <button
            onClick={() => setDettaglio(null)}
            className="mt-4 text-blue-600 hover:underline"
          >
            ← Torna all’elenco
          </button>
        </div>
      )}
    </DashboardLayout>
  );
}

CronologiaInglese.requireAuth = true;
