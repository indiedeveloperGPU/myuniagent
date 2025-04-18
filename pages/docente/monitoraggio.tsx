import DocenteLayout from "@/components/DocenteLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { CSVLink } from "react-csv";

function MonitoraggioDocentePage() {
  const [classi, setClassi] = useState<any[]>([]);
  const [studentiPerClasse, setStudentiPerClasse] = useState<Record<string, any[]>>({});
  const [testPerStudente, setTestPerStudente] = useState<Record<string, any[]>>({});
  const [testNomi, setTestNomi] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [classeSelezionata, setClasseSelezionata] = useState<string>("");
  const [dataInizio, setDataInizio] = useState<string>("");
  const [dataFine, setDataFine] = useState<string>("");
  const [filtroStudente, setFiltroStudente] = useState<string>("");

  useEffect(() => {
    const fetchData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: classiData } = await supabase
        .from("classi")
        .select("id, nome")
        .eq("docente_id", user.id);

      if (classiData) {
        setClassi(classiData);

        const studentiPerClasseTemp: Record<string, any[]> = {};
        const testTemp: Record<string, any[]> = {};
        const testNomiTemp: Record<string, string> = {};

        for (const classe of classiData) {
          const { data: iscrizioni } = await supabase
            .from("studenti_classi")
            .select("studente_id")
            .eq("classe_id", classe.id);

          const studentiIds = iscrizioni?.map((i) => i.studente_id) || [];

          const { data: studenti } = await supabase
            .from("profiles")
            .select("id, name, email")
            .in("id", studentiIds);

          studentiPerClasseTemp[classe.id] = studenti || [];

          for (const studente of studenti || []) {
            const { data: testSvolti } = await supabase
              .from("test_risposte")
              .select("test_id, voto, stato, data_svolgimento")
              .eq("studente_id", studente.id)
              .order("data_svolgimento", { ascending: false });

            testTemp[studente.id] = testSvolti || [];

            for (const test of testSvolti || []) {
              if (!testNomiTemp[test.test_id]) {
                const { data: testInfo } = await supabase
                  .from("test")
                  .select("titolo")
                  .eq("id", test.test_id)
                  .single();

                if (testInfo?.titolo) {
                  testNomiTemp[test.test_id] = testInfo.titolo;
                } else {
                  testNomiTemp[test.test_id] = "Test sconosciuto";
                }
              }
            }
          }
        }

        setStudentiPerClasse(studentiPerClasseTemp);
        setTestPerStudente(testTemp);
        setTestNomi(testNomiTemp);
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  const handleDownloadPDF = async () => {
    const html2pdf = (await import("html2pdf.js")).default;
    const element = document.getElementById("monitoraggioPDF");
    if (element) {
      html2pdf().from(element).save("monitoraggio.pdf");
    }
  };

  const exportCSVData = () => {
    const rows: any[] = [];
    const classiFiltrate = classeSelezionata
      ? classi.filter((c) => c.id === classeSelezionata)
      : classi;

    classiFiltrate.forEach((classe) => {
      studentiPerClasse[classe.id]?.forEach((studente) => {
        const matchStudente =
          studente.name.toLowerCase().includes(filtroStudente) ||
          studente.email.toLowerCase().includes(filtroStudente);

        if (!filtroStudente || matchStudente) {
          testPerStudente[studente.id]?.forEach((test) => {
            const dataTest = new Date(test.data_svolgimento);
            const inRange =
              (!dataInizio || dataTest >= new Date(dataInizio)) &&
              (!dataFine || dataTest <= new Date(dataFine));

            if (inRange) {
              rows.push({
                Classe: classe.nome,
                Studente: studente.name,
                Email: studente.email,
                TitoloTest: testNomi[test.test_id] || "-",
                Voto: test.voto,
                Stato: test.stato,
                Data: dataTest.toLocaleDateString(),
              });
            }
          });
        }
      });
    });
    return rows;
  };

  return (
    <DocenteLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">📊 Monitoraggio Studenti</h1>
      </div>

      {/* Filtri */}
      <div className="bg-white border p-4 rounded shadow mb-6">
        <h2 className="text-lg font-semibold mb-3">🎯 Filtri</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <select
            value={classeSelezionata}
            onChange={(e) => setClasseSelezionata(e.target.value)}
            className="border rounded p-2"
          >
            <option value="">Tutte le classi</option>
            {classi.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>

          <input
            type="date"
            value={dataInizio}
            onChange={(e) => setDataInizio(e.target.value)}
            className="border rounded p-2"
          />
          <input
            type="date"
            value={dataFine}
            onChange={(e) => setDataFine(e.target.value)}
            className="border rounded p-2"
          />
          <input
            type="text"
            placeholder="🔍 Cerca studente"
            value={filtroStudente}
            onChange={(e) => setFiltroStudente(e.target.value.toLowerCase())}
            className="border rounded p-2"
          />
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={handleDownloadPDF}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            ⬇️ Esporta PDF
          </button>
          <CSVLink
            data={exportCSVData()}
            filename="monitoraggio_studenti.csv"
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            📁 Esporta CSV
          </CSVLink>
        </div>
      </div>

      {loading ? (
        <p>Caricamento...</p>
      ) : classi.length === 0 ? (
        <p>Nessuna classe trovata.</p>
      ) : (
        <div id="monitoraggioPDF" className="space-y-6">
          {classi
            .filter((c) => !classeSelezionata || c.id === classeSelezionata)
            .map((classe) => (
              <div key={classe.id} className="bg-white p-4 rounded shadow">
                <h2 className="text-xl font-semibold mb-2">🏫 {classe.nome}</h2>

                {studentiPerClasse[classe.id]?.length === 0 ? (
                  <p className="text-gray-500">Nessuno studente iscritto.</p>
                ) : (
                  <ul className="space-y-4">
                    {studentiPerClasse[classe.id]
                      .filter((studente) => {
                        return (
                          !filtroStudente ||
                          studente.name.toLowerCase().includes(filtroStudente) ||
                          studente.email.toLowerCase().includes(filtroStudente)
                        );
                      })
                      .map((studente) => (
                        <li
                          key={studente.id}
                          className="border p-3 rounded bg-gray-50"
                        >
                          <p className="font-medium">{studente.name}</p>
                          <p className="text-sm text-gray-600">{studente.email}</p>

                          <div className="mt-2">
                            <p className="font-semibold mb-1">🧪 Test svolti:</p>
                            {testPerStudente[studente.id]?.length === 0 ? (
                              <p className="text-sm text-gray-500 italic">Nessun test svolto.</p>
                            ) : (
                              <ul className="text-sm space-y-1">
                                {testPerStudente[studente.id]
                                  .filter((t) => {
                                    const data = new Date(t.data_svolgimento);
                                    return (
                                      (!dataInizio || data >= new Date(dataInizio)) &&
                                      (!dataFine || data <= new Date(dataFine))
                                    );
                                  })
                                  .map((test, index) => {
                                    const data = new Date(test.data_svolgimento);
                                    const diffGiorni = Math.floor((Date.now() - data.getTime()) / (1000 * 60 * 60 * 24));
                                    const badge = test.stato === "completato" && diffGiorni <= 7
                                      ? "✅ Completato"
                                      : "⚠️ In ritardo";

                                    return (
                                      <li key={index} className="text-gray-700">
                                        <strong>{testNomi[test.test_id]}</strong> | Voto: <strong>{test.voto}</strong> | Stato: {test.stato} | {data.toLocaleDateString()} | <span className="ml-2 text-sm font-semibold">{badge}</span>
                                      </li>
                                    );
                                  })}
                              </ul>
                            )}
                          </div>
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            ))}
        </div>
      )}
    </DocenteLayout>
  );
}

import { withAccess } from "@/lib/withRole";
export default withAccess(MonitoraggioDocentePage, ["docente"]);
