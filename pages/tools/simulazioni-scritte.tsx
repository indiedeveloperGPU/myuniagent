import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import DashboardLayout from "@/components/DashboardLayout";
import Link from "next/link";

export default function SimulazioniScrittePage() {
  const [categoria, setCategoria] = useState("superiori");
  const [indirizzo, setIndirizzo] = useState("");
  const [facolta, setFacolta] = useState("");
  const [materia, setMateria] = useState("");
  const [argomento, setArgomento] = useState("");
  const [tipoSimulazione, setTipoSimulazione] = useState("");
  const [materieDisponibili, setMaterieDisponibili] = useState<string[]>([]);
  const [argomentiDisponibili, setArgomentiDisponibili] = useState<string[]>([]);
  const [tipologieDisponibili, setTipologieDisponibili] = useState<string[]>([]);
  const [simulazione, setSimulazione] = useState<any>(null);
  const [risposteMultiple, setRisposteMultiple] = useState<Record<number, string>>({});
  const [risposteAperte, setRisposteAperte] = useState<Record<number, string>>({});
  const [correzione, setCorrezione] = useState("");
  const [successo, setSuccesso] = useState(false);
  const [voto, setVoto] = useState(0);
  const [lode, setLode] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [errore, setErrore] = useState("");

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) window.location.href = "/auth";
      setUser(data.user);
    };
    fetchUser();
  }, []);

  useEffect(() => {
    const fetchMaterie = async () => {
      const filtro = categoria === "superiori"
        ? { categoria, indirizzo }
        : { categoria, facolta };

      if ((categoria === "superiori" && indirizzo) || (categoria === "università" && facolta)) {
        const { data, error } = await supabase
          .from("simulazioni_scritti_dataset")
          .select("materia")
          .match(filtro)
          .neq("materia", null);

        if (!error && data) {
          const uniche = [...new Set(data.map((d) => d.materia))];
          setMaterieDisponibili(uniche);
        }
      } else {
        setMaterieDisponibili([]);
      }
      setMateria("");
      setArgomento("");
      setArgomentiDisponibili([]);
    };
    fetchMaterie();
  }, [categoria, indirizzo, facolta]);

  useEffect(() => {
    const fetchArgomenti = async () => {
      if (materia) {
        const { data, error } = await supabase
          .from("simulazioni_scritti_dataset")
          .select("argomento")
          .eq("materia", materia)
          .neq("argomento", null);

        if (!error && data) {
          const unici = [...new Set(data.map((d) => d.argomento))];
          setArgomentiDisponibili(unici);
        }
      } else {
        setArgomentiDisponibili([]);
      }
      setArgomento("");
    };
    fetchArgomenti();
  }, [materia]);

  useEffect(() => {
    const fetchTipologie = async () => {
      if (materia && argomento) {
        const { data, error } = await supabase
          .from("simulazioni_scritti_dataset")
          .select("tipo")
          .eq("materia", materia)
          .eq("argomento", argomento);

        if (!error && data) {
          const tipiUnici = [...new Set(data.map((d) => d.tipo))];
          setTipologieDisponibili(tipiUnici);
          if (tipiUnici.length === 1) {
            setTipoSimulazione(tipiUnici[0]);
          }
        }
      } else {
        setTipologieDisponibili([]);
      }
    };
    fetchTipologie();
  }, [materia, argomento]);

  const generaSimulazione = async () => {
    if (!categoria || (!indirizzo && !facolta) || !materia || !argomento || !tipoSimulazione) {
      setErrore("Inserisci tutti i campi richiesti.");
      return;
    }

    setLoading(true);
    setSimulazione(null);
    setRisposteAperte("");
    setErrore("");
    setCorrezione("");

    try {
      let query = supabase
        .from("simulazioni_scritti_dataset")
        .select("*")
        .eq("categoria", categoria)
        .eq("materia", materia)
        .eq("argomento", argomento)
        .eq("tipo", tipoSimulazione);

      if (categoria === "superiori") {
        query = query.eq("indirizzo", indirizzo);
      } else {
        query = query.eq("facolta", facolta);
      }

      const { data, error } = await query;

      if (error || !data || data.length === 0) throw new Error("Simulazione non trovata.");

      const randomSimulazione = data[Math.floor(Math.random() * data.length)];
      setSimulazione(randomSimulazione);
    } catch (err: any) {
      setErrore(err.message || "Errore durante il caricamento della simulazione.");
    } finally {
      setLoading(false);
    }
  };

  const correggiRisposte = async () => {
    const risposteFinali = tipoSimulazione === "multiple" ? risposteMultiple : risposteAperte;

    if (!simulazione || Object.keys(risposteFinali).length === 0) {
      setErrore("Compila la simulazione prima di correggerla.");
      return;
    }

    if (!voto && voto !== 0) {
      setErrore("Assegna un voto prima di correggere.");
      return;
    }

    setLoading(true);
    setErrore("");
    setSuccesso(false);

    try {
      const { error } = await supabase.from("simulazioni_scritti_risposte").insert({
        user_id: user.id,
        simulazione_id: simulazione.id,
        categoria,
        indirizzo,
        facolta,
        materia: simulazione.materia,
        argomento: simulazione.argomento,
        tipo: simulazione.tipo,
        risposte_utente: JSON.stringify(risposteFinali),
        voto,
        lode,
        correzione: simulazione.soluzione_esempio,
      });

      if (error) throw new Error("Errore nel salvataggio della simulazione.");

      setCorrezione(simulazione.soluzione_esempio);
      setSuccesso(true);
      setRisposteAperte({});
      setRisposteMultiple({});
      setVoto(0);
      setLode(false);
    } catch (err: any) {
      setErrore(err.message || "Errore durante la correzione.");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <DashboardLayout><p>Caricamento...</p></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">✍️ Simulazione Esame Scritto</h1>
        <Link href="/tools/storico-simulazioni" className="text-blue-600 hover:underline font-medium">
          📚 Vai al tuo Storico
        </Link>
      </div>

      <div className="bg-white border border-gray-200 p-4 rounded-2xl shadow-sm mb-6 text-gray-700 text-sm animate-fadein">
        <div className="flex items-center gap-2">
          <span className="text-green-500 text-lg">📝</span>
          <p>
  <strong>Info:</strong> Scegli {categoria === "superiori" ? "categoria, indirizzo" : "categoria, facoltà"}, materia e argomento per generare una simulazione.
</p>

        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
  {/* Categoria */}
  <div>
    <label className="font-medium">Categoria</label>
    <select
      value={categoria}
      onChange={(e) => {
        setCategoria(e.target.value);
        setIndirizzo("");
        setFacolta("");
        setMateria("");
        setArgomento("");
        setTipologieDisponibili([]);
        setMaterieDisponibili([]);
        setArgomentiDisponibili([]);
      }}
      className="w-full border rounded p-2"
    >
      <option value="superiori">🏫 Scuola Superiore</option>
      <option value="università">🎓 Università</option>
    </select>
  </div>

  {/* Indirizzo (solo se superiori) */}
  {categoria === "superiori" && (
    <div>
      <label className="font-medium">Indirizzo</label>
      <select
        value={indirizzo}
        onChange={(e) => setIndirizzo(e.target.value)}
        className="w-full border rounded p-2"
      >
        <option value="">-- Seleziona Indirizzo --</option>
        <option value="scientifico">🔬 Liceo Scientifico</option>
        <option value="classico">📚 Liceo Classico</option>
        <option value="linguistico">🌎 Liceo Linguistico</option>
        <option value="scienze-umane">🧠 Liceo Scienze Umane</option>
        <option value="artistico">🎨 Liceo Artistico</option>
        <option value="musicale-coreutico">🎵 Liceo Musicale/Coreutico</option>
        <option value="istituto-tecnico-economico">💼 Tecnico Economico</option>
        <option value="istituto-tecnico-tecnologico">⚙️ Tecnico Tecnologico</option>
        <option value="istituto-professionale">🔧 Istituto Professionale</option>
      </select>
    </div>
  )}

  {/* Facoltà (solo se università) */}
  {categoria === "università" && (
    <div>
      <label className="font-medium">Facoltà</label>
      <select
        value={facolta}
        onChange={(e) => setFacolta(e.target.value)}
        className="w-full border rounded p-2"
      >
        <option value="">-- Seleziona Facoltà --</option>
        <option value="giurisprudenza">⚖️ Giurisprudenza</option>
        <option value="medicina">🧬 Medicina</option>
        <option value="ingegneria">🔧 Ingegneria</option>
        <option value="psicologia">🧠 Psicologia</option>
        <option value="economia">💼 Economia</option>
        <option value="lettere">📚 Lettere</option>
        <option value="lingue">🌍 Lingue</option>
        <option value="scienze-politiche">🏛️ Scienze Politiche</option>
        <option value="architettura">🏗️ Architettura</option>
      </select>
    </div>
  )}

  {/* Materia */}
  <div>
    <label className="font-medium">Materia</label>
    <select
      value={materia}
      onChange={(e) => setMateria(e.target.value)}
      className="w-full border rounded p-2"
    >
      <option value="">-- Seleziona Materia --</option>
      {materieDisponibili.map((m) => (
        <option key={m} value={m}>{m}</option>
      ))}
    </select>
  </div>

  {/* Argomento */}
  <div>
    <label className="font-medium">Argomento</label>
    <select
      value={argomento}
      onChange={(e) => setArgomento(e.target.value)}
      className="w-full border rounded p-2"
    >
      <option value="">-- Seleziona Argomento --</option>
      {argomentiDisponibili.map((a) => (
        <option key={a} value={a}>{a}</option>
      ))}
    </select>
  </div>

  {/* Tipo simulazione */}
  <div>
    <label className="font-medium">Tipo Simulazione</label>
    <select
      value={tipoSimulazione}
      onChange={(e) => setTipoSimulazione(e.target.value)}
      className="w-full border rounded p-2"
    >
      <option value="">-- Seleziona Tipo --</option>
      {tipologieDisponibili.map((tipo) => (
        <option key={tipo} value={tipo}>
          {tipo === "aperte" && "📄 Domande Aperte"}
          {tipo === "multiple" && "✅ Risposte Multiple"}
          {tipo === "misto" && "🔀 Misto"}
        </option>
      ))}
    </select>
  </div>
</div>


      <button onClick={generaSimulazione} disabled={loading} className="bg-green-600 text-white px-4 py-2 rounded-lg transition-transform duration-200 hover:bg-green-700 hover:scale-105">
        {loading ? "Caricamento..." : "Genera Simulazione"}
      </button>

      {errore && <p className="text-red-600 mt-4">{errore}</p>}
      {successo && <p className="text-green-600 mt-4">✅ Simulazione salvata con successo!</p>}


     

{simulazione && (
  <div className="mt-8 bg-gray-50 p-6 rounded border">
    <h2 className="text-lg font-semibold mb-4">📝 Simulazione</h2>

    {simulazione.testo_base && (
      <div className="mb-6 p-4 bg-gray-100 rounded-lg">
        <h2 className="text-lg font-bold mb-2">📖 Testo da Analizzare</h2>
        <p className="whitespace-pre-line">{simulazione.testo_base}</p>
      </div>
    )}

    <div className="space-y-4">
      {Array.isArray(simulazione.contenuto_simulazione) &&
        simulazione.contenuto_simulazione.map((item: any, index: number) => (
          <div key={index} className="mb-4">
            <p className="font-medium mb-1">
              <b>{index + 1}.</b> {item.domanda}
            </p>

            {item.opzioni && Array.isArray(item.opzioni) ? (
              <div className="space-y-1">
                {item.opzioni.map((opzione: string, opIndex: number) => (
                  <label key={opIndex} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`domanda-${index}`}
                      value={opzione}
                      checked={risposteMultiple[index] === opzione}
                      onChange={(e) =>
                        setRisposteMultiple((prev) => ({
                          ...prev,
                          [index]: e.target.value,
                        }))
                      }
                    />
                    {opzione}
                  </label>
                ))}
              </div>
            ) : (
              <textarea
  value={risposteAperte[index] || ""}
  onChange={(e) =>
    setRisposteAperte((prev) => ({
      ...prev,
      [index]: e.target.value,
    }))
  }
  className="w-full border rounded p-2 mt-2"
  rows={3}
  placeholder="Scrivi la tua risposta qui..."
/>

            )}
          </div>
        ))}
    </div>

    <div className="mt-6">
      <label className="font-medium block mb-2">🎯 Assegna il tuo voto:</label>
      <input
        type="number"
        min={0}
        max={categoria === "università" ? 30 : 10}
        value={voto}
        onChange={(e) => setVoto(Number(e.target.value))}
        className="w-full border rounded p-2 mb-2"
      />
      {categoria === "università" && (
        <div className="flex items-center gap-2">
          <input type="checkbox" checked={lode} onChange={(e) => setLode(e.target.checked)} />
          <span>Con Lode</span>
        </div>
      )}
    </div>

    <button
      onClick={correggiRisposte}
      disabled={loading}
      className="bg-blue-600 text-white px-4 py-2 rounded-lg transition-transform duration-200 hover:bg-blue-700 hover:scale-105 mt-4"
    >
      {loading ? "Salvataggio..." : "Correggi e Salva"}
    </button>
  </div>
)}

{correzione && (
  <div className="mt-8 bg-green-50 p-6 rounded border">
    <h2 className="text-lg font-semibold mb-4">✅ Soluzione Ideale:</h2>
    <div className="space-y-2">
      {Array.isArray(correzione) &&
        correzione.map((item: any, index: number) => (
          <p key={index} className="whitespace-pre-line">
            <b>{index + 1}.</b> {item.soluzione}
          </p>
        ))}
    </div>
  </div>
)}

    </DashboardLayout>
  );
}

SimulazioniScrittePage.requireAuth = true;

