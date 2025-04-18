// pages/docente/test/index.tsx
import { useEffect, useState } from "react";
import DocenteLayout from "@/components/DocenteLayout";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/router";

function testDocentePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [classi, setClassi] = useState<any[]>([]);
  const [test, setTest] = useState<any[]>([]);
  const [titolo, setTitolo] = useState("");
  const [tipo, setTipo] = useState("scritta");
  const [classeId, setClasseId] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const [editingTestId, setEditingTestId] = useState<string | null>(null);
  const [editedTitolo, setEditedTitolo] = useState("");
  const [editedTipo, setEditedTipo] = useState("scritta");
  const [editedClasseId, setEditedClasseId] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserId(user.id);

      const { data: classiData } = await supabase
        .from("classi")
        .select("id, nome")
        .eq("docente_id", user.id);
      if (classiData) setClassi(classiData);

      const { data: testData } = await supabase
        .from("test_esercizi")
        .select("*")
        .eq("docente_id", user.id)
        .order("creato_il", { ascending: false });
      if (testData) setTest(testData);

      setLoading(false);
    };

    fetchData();
  }, []);

  const creaTest = async () => {
    if (!titolo || !tipo || !classeId || !userId) return;

    const { error } = await supabase.from("test_esercizi").insert({
      docente_id: userId,
      classe_id: classeId,
      titolo,
      tipo,
    });

    if (!error) {
      alert("Test creato ✅");
      setTitolo("");
      setClasseId("");
      const { data: testData } = await supabase
        .from("test_esercizi")
        .select("*")
        .eq("docente_id", userId)
        .order("creato_il", { ascending: false });
      if (testData) setTest(testData);
    }
  };

  const eliminaTest = async (id: string) => {
    if (!confirm("Vuoi eliminare questo test?")) return;
    await supabase.from("test_esercizi").delete().eq("id", id);
    setTest((prev) => prev.filter((t) => t.id !== id));
  };

  const aggiornaTest = async (id: string) => {
    const { error } = await supabase
      .from("test_esercizi")
      .update({
        titolo: editedTitolo,
        tipo: editedTipo,
        classe_id: editedClasseId,
      })
      .eq("id", id);

    if (!error) {
      const { data: updated } = await supabase
        .from("test_esercizi")
        .select("*")
        .eq("docente_id", userId)
        .order("creato_il", { ascending: false });

      setTest(updated || []);
      setEditingTestId(null);
    }
  };

  return (
    <DocenteLayout>
      <h1 className="text-2xl font-bold mb-4">🧪 Test ed Esercizi</h1>

      {/* Creazione test */}
      <div className="bg-white p-4 border rounded mb-6">
        <h2 className="text-lg font-semibold mb-2">Crea nuovo test</h2>
        <input
          type="text"
          placeholder="Titolo del test"
          value={titolo}
          onChange={(e) => setTitolo(e.target.value)}
          className="w-full border p-2 rounded mb-2"
        />
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
          className="w-full border p-2 rounded mb-2"
        >
          <option value="scritta">Test scritto</option>
          <option value="orale">Test orale</option>
        </select>
        <select
          value={classeId}
          onChange={(e) => setClasseId(e.target.value)}
          className="w-full border p-2 rounded mb-2"
        >
          <option value="">Seleziona classe</option>
          {classi.map((c) => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </select>
        <button
          onClick={creaTest}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Crea test
        </button>
      </div>

      <h2 className="text-lg font-semibold mb-2">📋 Test creati</h2>
      {loading ? (
        <p>Caricamento...</p>
      ) : test.length === 0 ? (
        <p className="text-gray-500">Nessun test creato.</p>
      ) : (
        <ul className="space-y-3">
          {test.map((t) => (
            <li key={t.id} className="bg-gray-100 p-4 rounded">
              {editingTestId === t.id ? (
                <>
                  <input
                    type="text"
                    value={editedTitolo}
                    onChange={(e) => setEditedTitolo(e.target.value)}
                    className="w-full border p-2 rounded mb-2"
                  />
                  <select
                    value={editedTipo}
                    onChange={(e) => setEditedTipo(e.target.value)}
                    className="w-full border p-2 rounded mb-2"
                  >
                    <option value="scritta">Test scritto</option>
                    <option value="orale">Test orale</option>
                  </select>
                  <select
                    value={editedClasseId}
                    onChange={(e) => setEditedClasseId(e.target.value)}
                    className="w-full border p-2 rounded mb-2"
                  >
                    <option value="">Seleziona classe</option>
                    {classi.map((c) => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <button
                      onClick={() => aggiornaTest(t.id)}
                      className="bg-green-600 text-white px-3 py-1 rounded"
                    >
                      Salva
                    </button>
                    <button
                      onClick={() => setEditingTestId(null)}
                      className="bg-gray-400 text-white px-3 py-1 rounded"
                    >
                      Annulla
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p
                    onClick={() => router.push(`/docente/test/${t.id}`)}
                    className="font-semibold text-lg cursor-pointer text-blue-700 hover:underline"
                  >
                    {t.titolo}
                  </p>
                  <p className="text-sm text-gray-600">
                    Tipo: <strong>{t.tipo}</strong> – Creato il {new Date(t.creato_il).toLocaleDateString()}
                  </p>
                  <div className="flex flex-wrap items-center gap-4 mt-2">
                    <button
                      onClick={() => {
                        setEditingTestId(t.id);
                        setEditedTitolo(t.titolo);
                        setEditedTipo(t.tipo);
                        setEditedClasseId(t.classe_id);
                      }}
                      className="text-blue-600 hover:underline text-sm"
                    >
                      Modifica
                    </button>
                    <button
                      onClick={() => eliminaTest(t.id)}
                      className="text-red-600 hover:underline text-sm"
                    >
                      Elimina
                    </button>
                    <button
                      onClick={() => router.push(`/docente/test/${t.id}`)}
                      className="text-indigo-600 hover:underline text-sm"
                    >
                      Gestisci domande
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </DocenteLayout>
  );
}

import { withAccess } from "@/lib/withRole";
export default withAccess(testDocentePage, ["docente"]);

