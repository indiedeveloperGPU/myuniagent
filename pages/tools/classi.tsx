import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/router";

export default function ClassiStudentePage() {
  const router = useRouter();
  const [userChecked, setUserChecked] = useState(false);
  const [codiceClasse, setCodiceClasse] = useState("");
  const [messaggio, setMessaggio] = useState("");
  const [classiUtente, setClassiUtente] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkAuthAndFetch = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("studenti_classi")
        .select("id, joined_at, classi ( nome, descrizione, docente_id )")
        .eq("studente_id", user.id);

      if (!error && data) setClassiUtente(data);
      setUserChecked(true);
    };

    checkAuthAndFetch();
  }, [router]);

  const handleJoinClasse = async () => {
    setMessaggio("");
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !codiceClasse) {
      setMessaggio("Codice non valido o utente non autenticato.");
      setLoading(false);
      return;
    }

    const { data: classiTrovata, error: erroreClasse } = await supabase
      .from("classi")
      .select("id")
      .eq("codice", codiceClasse)
      .single();

    if (erroreClasse || !classiTrovata) {
      setMessaggio("Classe non trovata ❌");
      setLoading(false);
      return;
    }

    const { data: iscrizione } = await supabase
      .from("studenti_classi")
      .select("id")
      .eq("studente_id", user.id)
      .eq("classe_id", classiTrovata.id)
      .single();

    if (iscrizione) {
      setMessaggio("Sei già iscritto a questa classe ⚠️");
      setLoading(false);
      return;
    }

    const { error: erroreIscrizione } = await supabase.from("studenti_classi").insert({
      studente_id: user.id,
      classe_id: classiTrovata.id,
    });

    if (!erroreIscrizione) {
      setMessaggio("Iscrizione avvenuta con successo ✅");
      setCodiceClasse("");
      // Refresh lista classi
      const { data, error } = await supabase
        .from("studenti_classi")
        .select("id, joined_at, classi ( nome, descrizione, docente_id )")
        .eq("studente_id", user.id);
      if (!error && data) setClassiUtente(data);
    } else {
      setMessaggio("Errore durante l'iscrizione ❌");
    }

    setLoading(false);
  };

  if (!userChecked) {
    return (
      <DashboardLayout>
        <p>Controllo autenticazione in corso...</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold mb-6">🏫 Le tue classi</h1>

      <div className="mb-4">
        <label className="block font-medium mb-2">Inserisci codice classe:</label>
        <input
          type="text"
          placeholder="Es. AB1234"
          value={codiceClasse}
          onChange={(e) => setCodiceClasse(e.target.value)}
          className="border p-2 rounded w-full"
        />
        <button
          onClick={handleJoinClasse}
          disabled={loading || !codiceClasse}
          className="bg-blue-600 text-white px-4 py-2 rounded mt-2 hover:bg-blue-700"
        >
          {loading ? "Iscrizione in corso..." : "Iscriviti"}
        </button>
        {messaggio && <p className="mt-2 text-sm text-center text-gray-800">{messaggio}</p>}
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-2">📚 Classi a cui sei iscritto:</h2>
        {classiUtente.length === 0 ? (
          <p className="text-gray-500">Non sei ancora iscritto a nessuna classe.</p>
        ) : (
          <ul className="space-y-3">
            {classiUtente.map((classe) => (
              <li key={classe.id} className="p-4 border rounded bg-white shadow-sm">
                <p className="font-semibold">{classe.classi.nome}</p>
                {classe.classi.descrizione && (
                  <p className="text-sm text-gray-600">{classe.classi.descrizione}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  Iscritto il: {new Date(classe.joined_at).toLocaleDateString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DashboardLayout>
  );
}

ClassiStudentePage.requireAuth = true
