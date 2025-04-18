import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";
import DocenteLayout from "@/components/DocenteLayout";

function ModificaLezione() {
  const router = useRouter();
  const { id } = router.query;

  const [titolo, setTitolo] = useState("");
  const [contenuto, setContenuto] = useState("");
  const [generataAI, setGenerataAI] = useState(false);
  const [allegati, setAllegati] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || typeof id !== "string") return;

    const fetchLezione = async () => {
      const { data, error } = await supabase
        .from("lezioni")
        .select("*")
        .eq("id", id)
        .single();

      if (!error && data) {
        setTitolo(data.titolo);
        setContenuto(data.contenuto);
        setGenerataAI(data.generata_da_ai);
        setAllegati(data.allegati || []);
      }

      setLoading(false);
    };

    fetchLezione();
  }, [id]);

  const handleUpdate = async () => {
    const { error } = await supabase
      .from("lezioni")
      .update({
        titolo,
        contenuto,
        generata_da_ai: generataAI,
        allegati,
        data_modifica: new Date().toISOString(),
      })
      .eq("id", id);

    if (!error) {
      alert("Lezione aggiornata con successo!");
      router.push("/docente/lezioni");
    } else {
      alert("Errore nell'aggiornamento.");
    }
  };

  const handleDelete = async () => {
    const conferma = confirm("Sei sicuro di voler eliminare questa lezione?");
    if (!conferma || !id) return;

    const { error } = await supabase.from("lezioni").delete().eq("id", id);

    if (!error) {
      alert("Lezione eliminata.");
      router.push("/docente/lezioni");
    } else {
      alert("Errore nell'eliminazione.");
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || typeof id !== "string") return;

    const fileExt = file.name.split(".").pop();
    const filePath = `lezioni/${id}/${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from("allegati") // Assicurati che il bucket si chiami così
      .upload(filePath, file);

    if (error) {
      alert("Errore durante l'upload.");
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("allegati")
      .getPublicUrl(filePath);

    const url = publicUrlData.publicUrl;

    setAllegati((prev) => [...prev, url]);
  };

  if (loading) {
    return (
      <DocenteLayout>
        <p>Caricamento...</p>
      </DocenteLayout>
    );
  }

  return (
    <DocenteLayout>
      <h1 className="text-2xl font-bold mb-4">✏️ Modifica Lezione</h1>

      <input
        type="text"
        placeholder="Titolo"
        className="w-full border rounded px-3 py-2 mb-3"
        value={titolo}
        onChange={(e) => setTitolo(e.target.value)}
      />

      <textarea
        placeholder="Contenuto della lezione"
        className="w-full border rounded px-3 py-2 mb-3"
        rows={8}
        value={contenuto}
        onChange={(e) => setContenuto(e.target.value)}
      />

      <label className="inline-flex items-center mb-4">
        <input
          type="checkbox"
          checked={generataAI}
          onChange={(e) => setGenerataAI(e.target.checked)}
          className="mr-2"
        />
        Questa lezione è stata generata con l'AI
      </label>

      <div className="mb-4">
        <label className="block font-medium mb-1">📎 Allegati:</label>
        <input
          type="file"
          accept=".pdf,.jpg,.png,.jpeg"
          onChange={handleUpload}
          className="mb-2"
        />
        {allegati.length > 0 && (
          <ul className="list-disc list-inside text-sm text-blue-700">
            {allegati.map((url, idx) => (
              <li key={idx}>
                <a href={url} target="_blank" rel="noopener noreferrer" className="underline">
                  Visualizza allegato {idx + 1}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => router.push("/docente/lezioni")}
          className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
        >
          Annulla
        </button>
        <button
          onClick={handleUpdate}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Salva modifiche
        </button>
        <button
          onClick={handleDelete}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 ml-auto"
        >
          Elimina lezione
        </button>
      </div>
    </DocenteLayout>
  );
}


import { withAccess } from "@/lib/withRole";
export default withAccess(ModificaLezione, ["docente"]);

