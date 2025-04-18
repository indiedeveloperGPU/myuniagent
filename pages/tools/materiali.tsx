import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/lib/supabaseClient";

export default function MaterialiStudentePage() {
  const [materiali, setMateriali] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMateriali = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      // Trova classi a cui è iscritto lo studente
      const { data: iscrizioni } = await supabase
        .from("studenti_classi")
        .select("classe_id")
        .eq("studente_id", user.id);

      if (!iscrizioni || iscrizioni.length === 0) {
        setMateriali([]);
        setLoading(false);
        return;
      }

      const classIds = iscrizioni.map((i) => i.classe_id);

      // Recupera materiali associati a queste classi
      const { data: materialiData } = await supabase
        .from("materiali_classi")
        .select("*")
        .in("classe_id", classIds)
        .order("caricato_il", { ascending: false });

      setMateriali(materialiData || []);
      setLoading(false);
    };

    fetchMateriali();
  }, []);

  const getDownloadUrl = (path: string) =>
    `https://ffzihxqgmfkxtntfwkck.supabase.co/storage/v1/object/public/materiali/${path}`;

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold mb-6">📄 Materiali Didattici</h1>

      {loading ? (
        <p>Caricamento materiali...</p>
      ) : materiali.length === 0 ? (
        <p className="text-gray-500">Nessun materiale disponibile.</p>
      ) : (
        <ul className="space-y-4">
          {materiali.map((mat) => (
            <li key={mat.id} className="p-4 border rounded bg-white shadow">
              <p className="font-semibold">{mat.nome_file}</p>
              {mat.descrizione && <p className="text-sm text-gray-600">{mat.descrizione}</p>}
              <p className="text-xs text-gray-400">
                Caricato il: {new Date(mat.caricato_il).toLocaleString()}
              </p>
              <a
                href={getDownloadUrl(mat.percorso)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-blue-600 hover:underline"
              >
                Scarica materiale
              </a>
            </li>
          ))}
        </ul>
      )}
    </DashboardLayout>
  );
}

MaterialiStudentePage.requireAuth = true;
