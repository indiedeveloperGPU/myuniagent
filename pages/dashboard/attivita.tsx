import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/lib/supabaseClient";

type AttivitaItem = {
  id: string;
  tipo: "riassunto" | "spiegazione";
  input: string;
  output: string;
  creato_il: string;
};

export default function AttivitaPage() {
  const [attivita, setAttivita] = useState<AttivitaItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAttivita = async () => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) return;

    const { data, error } = await supabase
      .from("attivita")
      .select("*")
      .eq("user_id", userId)
      .order("creato_il", { ascending: false });

    if (!error && data) setAttivita(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchAttivita();
  }, []);

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold mb-4">🗂️ Le mie attività</h1>

      {loading ? (
        <p>Caricamento attività...</p>
      ) : attivita.length === 0 ? (
        <p className="text-gray-600">Nessuna attività trovata. Genera un riassunto o una spiegazione per iniziare.</p>
      ) : (
        <div className="space-y-4">
          {attivita.map((item) => (
            <div
              key={item.id}
              className="bg-white border-l-4 border-blue-500 shadow p-4 rounded"
            >
              <div className="text-sm text-gray-600 mb-1">
                {item.tipo === "riassunto" ? "🧠 Riassunto" : "📘 Spiegazione"} ·{" "}
                {new Date(item.creato_il).toLocaleString()}
              </div>
              <p className="text-sm text-gray-700 mb-2">
                <strong>Input:</strong> {item.input}
              </p>
              <div className="bg-gray-100 p-3 rounded whitespace-pre-wrap text-sm">
                <strong>Output:</strong>
                <p>{item.output}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}

AttivitaPage.requireAuth = true;



