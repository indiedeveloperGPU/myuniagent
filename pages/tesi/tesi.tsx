// File: pages/dashboard/tesi/index.tsx
// Questa pagina funge da "atrio" o "lobby", elencando tutti i progetti 
// di analisi tesi attivi per l'utente.

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "react-hot-toast";
import Link from 'next/link';
import { PlusCircle, BookOpen, BarChart2 } from 'lucide-react';

// =================================================================
// TYPESCRIPT INTERFACES
// =================================================================
interface ThesisSession {
  id: string;
  project_title: string;
  faculty: string;
  level: 'triennale' | 'magistrale' | 'dottorato';
  created_at: string;
  stats: {
    completion_percentage: number;
    completed_analyses: number;
    expected_analyses: number;
  };
}

// =================================================================
// COMPONENT
// =================================================================
export default function ThesisProjectsIndexPage() {
  const [sessions, setSessions] = useState<ThesisSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchActiveSessions = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token;
        if (!accessToken) throw new Error("Utente non autenticato.");

        // Chiama l'endpoint che abbiamo creato per recuperare le sessioni attive
        const response = await fetch('/api/thesis-sessions/active', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!response.ok) {
          throw new Error("Errore nel caricamento dei progetti.");
        }

        const data = await response.json();
        setSessions(data.sessions || []);
      } catch (err: any) {
        setError(err.message);
        toast.error(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActiveSessions();
  }, []);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            I Miei Progetti di Analisi Tesi
          </h1>
          <Link href="/analisi-tesi" legacyBehavior>
            <a className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all">
              <PlusCircle className="w-5 h-5" />
              Nuovo Progetto
            </a>
          </Link>
        </header>

        {error && (
          <div className="text-center p-8 bg-red-50 rounded-lg">
            <h2 className="text-2xl font-bold text-red-700">Errore</h2>
            <p className="text-red-600 mt-2">{error}</p>
          </div>
        )}

        {!error && sessions.length === 0 && (
          <div className="text-center p-12 bg-white dark:bg-gray-800 rounded-xl shadow-md border">
            <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200">Nessun progetto attivo trovato.</h3>
            <p className="mt-2 text-gray-500">Inizia la tua prima analisi di tesi per vederla comparire qui.</p>
            <Link href="/analisi-tesi" legacyBehavior>
              <a className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-semibold">
                <PlusCircle className="w-5 h-5" />
                Crea il Tuo Primo Progetto
              </a>
            </Link>
          </div>
        )}

        {!error && sessions.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sessions.map(session => (
              <Link key={session.id} href={`/dashboard/tesi/${session.id}`} legacyBehavior>
                <a className="block p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl hover:-translate-y-1 transition-all">
                  <div className="flex justify-between items-start">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2 line-clamp-2">{session.project_title}</h2>
                    <span className="capitalize text-xs font-medium px-2 py-1 bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 rounded-full">{session.level}</span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2 mb-4">
                    <BookOpen size={14} /> {session.faculty}
                  </p>
                  
                  <div>
                    <div className="flex justify-between items-center mb-1 text-sm">
                      <span className="font-medium text-gray-700 dark:text-gray-300">Avanzamento</span>
                      <span className="font-semibold text-blue-600 dark:text-blue-400">{session.stats.completion_percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                      <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${session.stats.completion_percentage}%` }}></div>
                    </div>
                     <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 text-right">
                        {session.stats.completed_analyses} / {session.stats.expected_analyses} analisi
                    </p>
                  </div>

                  <p className="text-xs text-gray-400 dark:text-gray-600 mt-4">
                    Creato il: {new Date(session.created_at).toLocaleDateString('it-IT')}
                  </p>
                </a>
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
