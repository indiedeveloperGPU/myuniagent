// pages/docente/classi/[id].tsx
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import DocenteLayout from "@/components/DocenteLayout";
import { supabase } from "@/lib/supabaseClient";
import { Copy, Check } from "lucide-react";

function DettaglioClassePage() {
  const router = useRouter();
  const { id } = router.query;

  const [classe, setClasse] = useState<any>(null);
  const [studenti, setStudenti] = useState<any[]>([]);
  const [materiali, setMateriali] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchDati = async () => {
      setLoading(true);

      const { data: classeData } = await supabase
        .from("classi")
        .select("*")
        .eq("id", id)
        .single();

      const { data: studentiData } = await supabase
        .from("studenti_classi")
        .select("id, joined_at, profilo:studente_id ( name, email )")
        .eq("classe_id", id);

      const { data: materialiData } = await supabase
        .from("materiali_classi")
        .select("*")
        .eq("classe_id", id)
        .order("caricato_il", { ascending: false });

      setClasse(classeData);
      setStudenti(studentiData || []);
      setMateriali(materialiData || []);
      setLoading(false);
    };

    fetchDati();
  }, [id]);

  const getDownloadUrl = (path: string) =>
    `https://ffzihxqgmfkxtntfwkck.supabase.co/storage/v1/object/public/materiali/${path}`;

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      alert("Errore durante la copia.");
    }
  };

  if (loading || !classe) {
    return (
      <DocenteLayout>
        <p className="text-gray-600 italic animate-pulse">⏳ Caricamento dati classe...</p>
      </DocenteLayout>
    );
  }

  return (
    <DocenteLayout>
      <h1 className="text-2xl font-bold mb-1">📘 {classe.nome}</h1>
      <p className="text-gray-700 mb-2 italic">{classe.descrizione}</p>

      <div className="text-sm text-gray-500 mb-6 flex items-center gap-2">
        Codice classe: <span className="font-mono">{classe.codice}</span>
        <button
          onClick={() => handleCopy(classe.codice)}
          className="text-blue-600 text-xs hover:underline flex items-center gap-1"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-green-600 animate-bounce" />
              Copiato!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copia
            </>
          )}
        </button>
      </div>

      {/* STUDENTI */}
      <div className="mb-10">
        <h2 className="text-lg font-semibold mb-2">👥 Studenti iscritti</h2>
        {studenti.length === 0 ? (
          <p className="text-gray-500 italic">Nessuno studente iscritto.</p>
        ) : (
          <ul className="space-y-2">
            {studenti.map((s) => (
              <li key={s.id} className="bg-white border rounded p-3">
                <p className="font-medium">{s.profilo.name}</p>
                <p className="text-sm text-gray-500">{s.profilo.email}</p>
                <p className="text-xs text-gray-400">
                  Iscritto il {new Date(s.joined_at).toLocaleDateString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* MATERIALI */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-2">📎 Materiali didattici</h2>
        {materiali.length === 0 ? (
          <p className="text-gray-500 italic">Nessun materiale caricato in questa classe.</p>
        ) : (
          <ul className="space-y-3">
            {materiali.map((m) => (
              <li key={m.id} className="border p-4 rounded bg-white shadow-sm">
                <p className="font-semibold">{m.nome_file}</p>
                {m.descrizione && (
                  <p className="text-sm text-gray-600">{m.descrizione}</p>
                )}
                <p className="text-xs text-gray-400 mb-2">
                  Caricato il {new Date(m.caricato_il).toLocaleString()}
                </p>
                <a
                  href={getDownloadUrl(m.percorso)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-sm"
                >
                  Scarica
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DocenteLayout>
  );
}


import { withAccess } from "@/lib/withRole";
export default withAccess(DettaglioClassePage, ["docente"]);
