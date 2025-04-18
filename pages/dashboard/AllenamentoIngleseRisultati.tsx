import { JSX, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import React from "react";


export default function AllenamentoIngleseRisultati({ userId }: { userId: string | null }) {
  const [quizVocabolario, setQuizVocabolario] = useState<any[]>([]);
  const [quizTeoria, setQuizTeoria] = useState<any[]>([]);
  const [conversazioni, setConversazioni] = useState<any[]>([]);
  const [correzioni, setCorrezioni] = useState<any[]>([]);
  const [simulazioni, setSimulazioni] = useState<any[]>([]);

  useEffect(() => {
    if (!userId) return;

    const fetchAll = async () => {
      const { data: vocabolario } = await supabase
        .from("vocabolario_risultati")
        .select("*")
        .eq("user_id", userId)
        .order("creato_il", { ascending: false });

      const { data: teoria } = await supabase
        .from("teoria_risultati")
        .select("*")
        .eq("user_id", userId)
        .order("creato_il", { ascending: false });

      const { data: conversazioniData } = await supabase
        .from("conversazione_risultati")
        .select("*")
        .eq("user_id", userId)
        .order("creato_il", { ascending: false });

      const { data: correzioniData } = await supabase
        .from("correzione_testi")
        .select("*")
        .eq("user_id", userId)
        .order("creato_il", { ascending: false });

      const { data: simulazioniData } = await supabase
        .from("simulazione_certificazioni")
        .select("*")
        .eq("user_id", userId)
        .order("creato_il", { ascending: false });

      if (vocabolario) setQuizVocabolario(vocabolario);
      if (teoria) setQuizTeoria(teoria);
      if (conversazioniData) setConversazioni(conversazioniData);
      if (correzioniData) setCorrezioni(correzioniData);
      if (simulazioniData) setSimulazioni(simulazioniData);
    };

    fetchAll();
  }, [userId]);

  return (
    <div className="space-y-6">
      <Section title="🧠 Quiz Vocabolario Tematico" data={quizVocabolario} render={(r) => (
        <>
          <div><strong>{r.tema}</strong> – Livello: {r.livello}</div>
          <div className="text-sm text-gray-700">Punteggio: <strong>{r.punteggio}%</strong> – {new Date(r.creato_il).toLocaleString()}</div>
        </>
      )} />

      <Section title="📚 Quiz Teoria Grammaticale" data={quizTeoria} render={(r) => (
        <>
          <div><strong>{r.argomento}</strong></div>
          <div className="text-sm text-gray-700">Punteggio: <strong>{r.punteggio}%</strong> – {new Date(r.creato_il).toLocaleString()}</div>
        </>
      )} />

      <Section title="🗣️ Conversazioni Simulate" data={conversazioni} render={(c) => (
        <>
          <div><strong>{c.scenario}</strong></div>
          <div className="text-sm text-gray-700">Scrittura: <strong>{c.punteggio_scrittura}%</strong> – Pronuncia: <strong>{c.punteggio_pronuncia}%</strong></div>
          <div className="text-sm text-gray-500">{new Date(c.creato_il).toLocaleString()}</div>
        </>
      )} />

      <Section title="✍️ Correzioni del Testo" data={correzioni} render={(c) => (
        <>
          <div><strong>Livello:</strong> {c.livello}</div>
          <div className="text-sm text-gray-700">Punteggio: <strong>{c.punteggio}%</strong></div>
          <div className="text-sm text-gray-500">{new Date(c.creato_il).toLocaleString()}</div>
        </>
      )} />

      <Section title="📝 Simulazioni Certificazioni" data={simulazioni} render={(s) => (
        <>
          <div><strong>{s.scenario}</strong></div>
          <div className="text-sm text-gray-700">Scrittura: <strong>{s.punteggio_scrittura}%</strong> – Orale: <strong>{s.punteggio_orale}%</strong></div>
          <div className="text-sm text-gray-500">{new Date(s.creato_il).toLocaleString()}</div>
        </>
      )} />
    </div>
  );
}

function Section({
  title,
  data,
  render,
}: {
  title: string;
  data: any[];
  render: (item: any) => JSX.Element;
}) {
  return (
    <div>
      <h3 className="font-semibold mb-2">{title}</h3>
      {data.length === 0 ? (
        <p className="text-gray-500">Nessun risultato disponibile.</p>
      ) : (
        <ul className="space-y-2">
          {data.map((item) => (
            <li key={item.id} className="bg-gray-100 p-3 rounded">
              {render(item)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
