// File: pages/analisi-tesi.tsx
// Pagina di avvio per la funzionalità di Analisi Tesi.
// Permette la creazione di un nuovo progetto e reindirizza alla dashboard dedicata.

import { useState } from "react";
import { useRouter } from 'next/router';
import Link from 'next/link';
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "react-hot-toast";

export default function AnalisiTesiPage() {
  const router = useRouter();

  // State per il form di creazione
  const [projectName, setProjectName] = useState("");
  const [faculty, setFaculty] = useState("");
  const [thesisTopic, setThesisTopic] = useState("");
  const [level, setLevel] = useState<'triennale' | 'magistrale' | 'dottorato' | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  /**
   * Gestisce la creazione di una nuova sessione di analisi.
   * Dopo il successo, reindirizza l'utente alla dashboard dedicata del nuovo progetto.
   */
  const createNewSession = async () => {
    if (!projectName.trim() || !faculty.trim() || !thesisTopic.trim() || !level) {
      setError("❌ Tutti i campi del progetto sono obbligatori.");
      return;
    }
    
    setIsSubmitting(true);
    setError("");

    try {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      if (!accessToken) throw new Error("Utente non autenticato");

      const response = await fetch('/api/thesis-sessions/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          project_title: projectName.trim(),
          faculty: faculty.trim(),
          thesis_topic: thesisTopic.trim(),
          level: level,
          is_public: false // Default a privato
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore nella creazione della sessione');
      }

      const session = await response.json();
      
      toast.success("🚀 Progetto creato! Reindirizzamento alla dashboard...");

      // Reindirizza alla nuova dashboard dedicata dopo un breve ritardo.
      setTimeout(() => {
        router.push(`/dashboard/tesi/${session.id}`);
      }, 1000);

    } catch (error: any) {
      setError("❌ Errore nella creazione del progetto: " + error.message);
      console.error(error);
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">🎓 Analisi Tesi Enterprise</h1>

      <div className="bg-gradient-to-br from-purple-50 to-blue-100 dark:from-purple-900 dark:to-blue-800 border-l-4 border-purple-500 text-purple-900 dark:text-purple-100 p-4 rounded-xl shadow-md mb-6">
        <h2 className="font-bold text-lg mb-2">Crea un nuovo progetto o gestisci quelli esistenti</h2>
        <p className="text-sm leading-relaxed">
          Inizia un nuovo progetto di analisi per la tua tesi. Una volta creato, verrai reindirizzato alla sua dashboard dedicata dove potrai caricare materiali ed eseguire le analisi.
        </p>
        <div className="mt-4">
            <Link href="/dashboard/tesi" legacyBehavior>
                <a className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm transition-all">
                    Vai all'elenco dei tuoi progetti
                </a>
            </Link>
        </div>
      </div>

      {/* Form per la creazione di un nuovo progetto */}
      <div className="mb-6 p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg">
          <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
            🚀 Nuovo Progetto di Analisi Tesi
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome del progetto</label>
              <input type="text" value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="Es. Analisi Tesi - Blockchain nel Diritto Commerciale"
                className="w-full p-2 border rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-purple-500"/>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Facoltà</label>
                <input type="text" value={faculty} onChange={(e) => setFaculty(e.target.value)} placeholder="Es. Giurisprudenza"
                  className="w-full p-2 border rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-purple-500"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Argomento della tesi</label>
                <input type="text" value={thesisTopic} onChange={(e) => setThesisTopic(e.target.value)} placeholder="Es. Blockchain e Smart Contracts"
                  className="w-full p-2 border rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-purple-500"/>
              </div>
            </div>
            
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Livello di tesi</label>
                <select value={level} onChange={(e) => setLevel(e.target.value as 'triennale' | 'magistrale' | 'dottorato')}
                  className="w-full p-2 border rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-purple-500">
                  <option value="">Seleziona livello</option>
                  <option value="triennale">📖 Triennale</option>
                  <option value="magistrale">📚 Magistrale</option>
                  <option value="dottorato">🎯 Dottorato</option>
                </select>
            </div>
            
            <button
              onClick={createNewSession}
              disabled={isSubmitting || !projectName.trim() || !faculty.trim() || !thesisTopic.trim() || !level}
              className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all transform hover:scale-[1.02]"
            >
              {isSubmitting ? 'Creazione in corso...' : 'Crea Progetto e Vai alla Dashboard'}
            </button>
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          </div>
        </div>
    </DashboardLayout>
  );
}
