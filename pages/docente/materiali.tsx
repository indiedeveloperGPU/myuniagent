import DocenteLayout from "@/components/DocenteLayout";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { useRouter } from "next/router";


function MaterialiDidatticiPage() {

  const [userId, setUserId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [titolo, setTitolo] = useState("");
  const [descrizione, setDescrizione] = useState("");
  const [classeId, setClasseId] = useState("");
  const [materiali, setMateriali] = useState<any[]>([]);
  const [classi, setClassi] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);


  useEffect(() => {
    const fetchUserAndData = async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return;

      setUserId(authData.user.id);
      await fetchClassi(authData.user.id);
      await fetchMateriali(authData.user.id);
      setLoading(false);
    };

    fetchUserAndData();
  }, []);

  const router = useRouter();

  const fetchClassi = async (docenteId: string) => {
    const { data } = await supabase
      .from("classi")
      .select("id, nome")
      .eq("docente_id", docenteId);
    if (data) setClassi(data);
  };

  const fetchMateriali = async (docenteId: string) => {
    const { data } = await supabase
      .from("materiali_didattici")
      .select("*")
      .eq("docente_id", docenteId)
      .order("creato_il", { ascending: false });
    if (data) setMateriali(data);
  };

  const handleUpload = async () => {
    if (!file || !titolo || !classeId || !userId) return;
  
    setIsUploading(true); // 🔄 INIZIO UPLOAD
  
    const estensione = file.name.split(".").pop();
    const fileName = `${uuidv4()}.${estensione}`;
    const filePath = `${userId}/${fileName}`;
  
    const { error: uploadError } = await supabase.storage
      .from("materiali_didattici")
      .upload(filePath, file);
  
    if (uploadError) {
      alert("Errore durante l'upload del file");
      setIsUploading(false);
      return;
    }
  
    const { error: insertError } = await supabase.from("materiali_didattici").insert({
      docente_id: userId,
      classe_id: classeId,
      titolo,
      descrizione,
      file_path: filePath,
    });
  
    if (!insertError) {
      alert("Materiale caricato con successo ✅");
      setTitolo("");
      setDescrizione("");
      setFile(null);
      setClasseId("");
      await fetchMateriali(userId);
    }
  
    setIsUploading(false); // 🔄 FINE UPLOAD
  };
  

  const handleDelete = async (id: string, filePath: string) => {
    const { error: deleteFileError } = await supabase.storage
      .from("materiali_didattici")
      .remove([filePath]);

    const { error: deleteRowError } = await supabase
      .from("materiali_didattici")
      .delete()
      .eq("id", id);

    if (!deleteFileError && !deleteRowError) {
      alert("Materiale eliminato");
      await fetchMateriali(userId!);
    }
  };

  const handleUpdate = async (id: string, nuovoTitolo: string, nuovaDescrizione: string) => {
    const { error } = await supabase
      .from("materiali_didattici")
      .update({ titolo: nuovoTitolo, descrizione: nuovaDescrizione })
      .eq("id", id);

    if (!error) {
      alert("Modifiche salvate ✅");
      await fetchMateriali(userId!);
    }
  };

  return (
    <DocenteLayout>
      <h1 className="text-2xl font-bold mb-4">📄 Materiali Didattici</h1>

      {/* Form upload */}
      <div className="bg-white p-4 border rounded mb-6">
        <h2 className="text-lg font-semibold mb-2">Carica nuovo materiale</h2>
        <input
          type="text"
          placeholder="Titolo"
          value={titolo}
          onChange={(e) => setTitolo(e.target.value)}
          className="w-full border p-2 rounded mb-2"
        />
        <textarea
          placeholder="Descrizione"
          value={descrizione}
          onChange={(e) => setDescrizione(e.target.value)}
          className="w-full border p-2 rounded mb-2"
          rows={2}
        />
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
        <input
  type="file"
  onChange={(e) => setFile(e.target.files?.[0] || null)}
  accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.xls,.xlsx,.odt,.rtf"
/>

        <button
          onClick={handleUpload}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mt-3"
        >
          Carica materiale
        </button>
        {isUploading && (
  <div className="mt-3 flex items-center gap-2 text-gray-600 text-sm">
    <svg
      className="animate-spin h-5 w-5 text-blue-600"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"
      />
    </svg>
    <span>Caricamento in corso...</span>
  </div>
)}


      </div>

      {/* Elenco materiali */}
      <h2 className="text-lg font-semibold mb-2">📚 Elenco materiali</h2>
      {materiali.length === 0 ? (
        <p className="text-gray-500">Nessun materiale caricato.</p>
      ) : (
        <ul className="space-y-4">
          {materiali.map((m) => (
            <li key={m.id} className="bg-gray-100 p-4 rounded">
              <input
                type="text"
                className="w-full font-semibold text-lg mb-1 border rounded p-2"
                value={m.titolo}
                onChange={(e) => {
                  const newValue = e.target.value;
                  setMateriali((prev) => prev.map(item => item.id === m.id ? { ...item, titolo: newValue } : item));
                }}
              />
              <textarea
                className="w-full text-sm mb-2 border rounded p-2"
                value={m.descrizione}
                onChange={(e) => {
                  const newValue = e.target.value;
                  setMateriali((prev) => prev.map(item => item.id === m.id ? { ...item, descrizione: newValue } : item));
                }}
                rows={2}
              />
              <div className="flex gap-2">
                <a
                  href={`https://ffzihxqgmfkxtntfwkck.supabase.co/storage/v1/object/public/materiali_didattici/${m.file_path}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 underline text-sm"
                >
                  Scarica file
                </a>
                <button
                  onClick={() => handleUpdate(m.id, m.titolo, m.descrizione)}
                  className="bg-green-600 text-white px-3 py-1 rounded text-sm"
                >
                  Salva modifiche
                </button>
                <button
                  onClick={() => handleDelete(m.id, m.file_path)}
                  className="bg-red-600 text-white px-3 py-1 rounded text-sm"
                >
                  Elimina
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </DocenteLayout>
  );
}

import { withAccess } from "@/lib/withRole";
export default withAccess(MaterialiDidatticiPage, ["docente"]);


