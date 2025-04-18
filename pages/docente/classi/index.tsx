import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";
import DocenteLayout from "@/components/DocenteLayout";
import { v4 as uuidv4 } from "uuid";
import { Copy, Check } from "lucide-react";

function ListaClassiDocente() {
  const [classi, setClassi] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [nomeClasse, setNomeClasse] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchClassi = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return router.push("/auth");
      setUserId(user.id);

      const { data, error } = await supabase
        .from("classi")
        .select("id, nome, descrizione, codice, creata_il")
        .eq("docente_id", user.id)
        .order("creata_il", { ascending: false });

      if (!error && data) setClassi(data);
      setLoading(false);
    };

    fetchClassi();
  }, [router]);

  const creaClasse = async () => {
    if (!nomeClasse.trim() || !userId) return;

    const codice = uuidv4().slice(0, 8);
    const { error } = await supabase.from("classi").insert({
      docente_id: userId,
      nome: nomeClasse,
      codice,
    });

    if (!error) {
      setNomeClasse("");
      const { data } = await supabase
        .from("classi")
        .select("*")
        .eq("docente_id", userId)
        .order("creata_il", { ascending: false });
      if (data) setClassi(data);
    } else {
      alert("Errore nella creazione della classe.");
    }
  };

  const eliminaClasse = async (id: string) => {
    if (!confirm("Vuoi davvero eliminare questa classe?")) return;
    const { error } = await supabase.from("classi").delete().eq("id", id);
    if (!error) {
      setClassi((prev) => prev.filter((c) => c.id !== id));
    } else {
      alert("Errore durante l'eliminazione.");
    }
  };

  const copiaCodice = async (codice: string, classeId: string) => {
    try {
      await navigator.clipboard.writeText(codice);
      setCopiedId(classeId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      alert("Errore nella copia del codice.");
    }
  };

  return (
    <DocenteLayout>
      <h1 className="text-2xl font-bold mb-4">🏫 Le tue Classi</h1>

      <div className="mb-6">
        <label className="block font-semibold mb-1">➕ Crea nuova classe</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={nomeClasse}
            onChange={(e) => setNomeClasse(e.target.value)}
            placeholder="Nome classe (es. 5A - Informatica)"
            className="border rounded p-2 w-full"
          />
          <button
            onClick={creaClasse}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Crea
          </button>
        </div>
      </div>

      {loading ? (
        <p>Caricamento classi in corso...</p>
      ) : classi.length === 0 ? (
        <p className="text-gray-600">Nessuna classe trovata.</p>
      ) : (
        <ul className="space-y-3">
          {classi.map((classe) => (
            <li
              key={classe.id}
              className="p-4 border rounded bg-white shadow hover:shadow-md transition"
            >
              <div
                className="cursor-pointer"
                onClick={() => router.push(`/docente/classi/${classe.id}`)}
              >
                <p className="font-semibold text-lg">{classe.nome}</p>
                {classe.descrizione && (
                  <p className="text-sm text-gray-600">{classe.descrizione}</p>
                )}
              </div>
              <div className="text-xs text-gray-500 mt-2 flex items-center gap-2">
                Codice: <span className="font-mono">{classe.codice}</span>
                <button
                  onClick={() => copiaCodice(classe.codice, classe.id)}
                  title="Copia codice"
                >
                  {copiedId === classe.id ? (
                    <Check className="w-4 h-4 text-green-600 transition-transform duration-200 scale-110" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-600 hover:text-blue-600" />
                  )}
                </button>
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Creata il: {new Date(classe.creata_il).toLocaleDateString()}
              </div>
              <button
                onClick={() => eliminaClasse(classe.id)}
                className="mt-2 text-red-600 text-sm hover:underline"
              >
                Elimina classe
              </button>
            </li>
          ))}
        </ul>
      )}
    </DocenteLayout>
  );
}

import { withAccess } from "@/lib/withRole";
export default withAccess(ListaClassiDocente, ["docente"]);

