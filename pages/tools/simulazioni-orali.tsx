import { useEffect, useState, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "react-hot-toast";

// 🎯 Tipi TypeScript
type DifficultyLevel = "liceo" | "università" | "magistrale" | "dottorato";
type SimulationType = "standard" | "intensivo" | "express" | "comprehensive";
type AIPersona = "professore_universitario" | "esaminatore_severo" | "tutor_amichevole";
type SimulationStatus = "setup" | "in_progress" | "recording" | "processing" | "completed" | "error";

interface ActiveSimulation {
  id: string;
  materia: string;
  argomento: string;
  sottotema?: string;
  difficulty_level: DifficultyLevel;
  simulation_type: SimulationType;
  ai_persona: AIPersona;
  status: string;
  current_step: number;
  total_steps: number;
  progress_percentage: number;
  total_questions: number;
  questions_completed: number;
  can_resume: boolean;
  last_activity: string;
  estimated_time_remaining: number;
}

interface CurrentSimulation {
  id: string;
  current_question: string;
  question_number: number;
  total_questions: number;
  current_step: number;
  total_steps: number;
  materia: string;
  argomento: string;
  ai_persona: AIPersona;
}

interface EvaluationResult {
  scores: {
    contenuto: number;
    chiarezza: number;
    approfondimento: number;
    linguaggio: number;
  };
  score_totale: number;
  punti_forza: string[];
  aree_miglioramento: string[];
  feedback_breve: string;
  suggerimenti: string[];
}

export default function SimulazioniOraliPage() {
  // 🎯 State Management Principale
  const [userChecked, setUserChecked] = useState(false);
  const [simulationStatus, setSimulationStatus] = useState<SimulationStatus>("setup");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // 🔧 Setup Simulazione
  const [materia, setMateria] = useState("");
  const [argomento, setArgomento] = useState("");
  const [sottotema, setSottotema] = useState("");
  const [difficultyLevel, setDifficultyLevel] = useState<DifficultyLevel>("università");
  const [simulationType, setSimulationType] = useState<SimulationType>("standard");
  const [aiPersona, setAiPersona] = useState<AIPersona>("professore_universitario");
  const [totalQuestions, setTotalQuestions] = useState(3);
  const [durationMinutes, setDurationMinutes] = useState(15);

  // 📋 Simulazioni Attive
  const [activeSimulations, setActiveSimulations] = useState<ActiveSimulation[]>([]);
  const [showActiveSimulations, setShowActiveSimulations] = useState(false);

  // 🎤 Simulazione in Corso
  const [currentSimulation, setCurrentSimulation] = useState<CurrentSimulation | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [lastEvaluation, setLastEvaluation] = useState<EvaluationResult | null>(null);
  const [ttsAudioData, setTtsAudioData] = useState<string | null>(null);

  // 🎤 Audio Recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // 🎵 Audio Playback
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const [isPlayingTTS, setIsPlayingTTS] = useState(false);

  // 🔐 Authentication Check
  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        window.location.href = "/auth";
        return;
      }
      setUserChecked(true);
    };
    checkUser();
  }, []);

  // 📋 Load Active Simulations
  useEffect(() => {
    const loadActiveSimulations = async () => {
      if (!userChecked) return;
      
      try {
        const { data } = await supabase.auth.getSession();
        const accessToken = data.session?.access_token;
        if (!accessToken) return;

        const response = await fetch('/api/simulazioni/active', {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        
        if (response.ok) {
          const result = await response.json();
          setActiveSimulations(result.active_simulations || []);
        }
      } catch (error) {
        console.error('Errore caricamento simulazioni attive:', error);
      }
    };

    loadActiveSimulations();
  }, [userChecked]);

  // ⏱️ Recording Timer
  useEffect(() => {
    if (isRecording) {
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    }

    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, [isRecording]);

  // 🎯 Inizia Nuova Simulazione
  const startNewSimulation = async () => {
    if (!materia.trim() || !argomento.trim()) {
      setError("❌ Materia e Argomento sono obbligatori.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      if (!accessToken) return;

      const response = await fetch('/api/simulazioni/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          materia: materia.trim(),
          argomento: argomento.trim(),
          sottotema: sottotema.trim() || undefined,
          difficulty_level: difficultyLevel,
          simulation_type: simulationType,
          ai_persona: aiPersona,
          total_questions: totalQuestions,
          duration_minutes: durationMinutes
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore nella creazione della simulazione');
      }

      const result = await response.json();
      
      // Setup simulazione in corso
      setCurrentSimulation({
        id: result.simulation.id,
        current_question: result.first_question,
        question_number: 1,
        total_questions: result.simulation.total_questions,
        current_step: result.simulation.current_step,
        total_steps: result.simulation.total_steps,
        materia: result.simulation.materia,
        argomento: result.simulation.argomento,
        ai_persona: aiPersona
      });

      setCurrentQuestion(result.first_question);
      setSimulationStatus("in_progress");
      
      toast.success("🚀 Simulazione iniziata! Ascolta la domanda e registra la tua risposta.");

      // Auto-play TTS per prima domanda
      if (result.first_question_tts_data) {
        setTtsAudioData(result.first_question_tts_data);
        playTTSAudio(result.first_question_tts_data);
      } else if (result.first_question_tts_text) {
        // Fallback: usa browser TTS se disponibile
        playBrowserTTS(result.first_question_tts_text);
      }

    } catch (err: any) {
      setError(`❌ Errore: ${err.message}`);
      toast.error("❌ Errore durante l'inizializzazione della simulazione");
    } finally {
      setLoading(false);
    }
  };

  // 📄 Riprendi Simulazione Esistente
  const resumeSimulation = async (simulation: ActiveSimulation) => {
    setLoading(true);
    setError("");

    try {
      // Per ora, implementazione base - in futuro potresti aggiungere un endpoint specifico
      toast.success(`📚 Ripresa simulazione: ${simulation.materia} - ${simulation.argomento}`);
      
      // Setup state per simulazione ripresa
      setCurrentSimulation({
        id: simulation.id,
        current_question: "Domanda in caricamento...", // Da recuperare dall'API
        question_number: simulation.questions_completed + 1,
        total_questions: simulation.total_questions,
        current_step: simulation.current_step,
        total_steps: simulation.total_steps,
        materia: simulation.materia,
        argomento: simulation.argomento,
        ai_persona: simulation.ai_persona
      });

      setSimulationStatus("in_progress");
      setShowActiveSimulations(false);

    } catch (err: any) {
      setError(`❌ Errore: ${err.message}`);
      toast.error("❌ Errore durante la ripresa della simulazione");
    } finally {
      setLoading(false);
    }
  };

  // 🎤 Inizia Registrazione Audio
  const startRecording = async () => {
    if (!currentSimulation) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
        setAudioBlob(blob);
        
        // Auto-submit audio dopo registrazione
        setTimeout(() => {
          submitAudioResponse(blob);
        }, 500);

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingTime(0);
      setSimulationStatus("recording");
      
      toast.success("🎤 Registrazione iniziata! Parla chiaramente.");

    } catch (err: any) {
      setError("❌ Errore accesso microfono. Verifica i permessi del browser.");
      toast.error("❌ Errore accesso microfono");
    }
  };

  // ⏹️ Ferma Registrazione
  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      setSimulationStatus("processing");
      toast.success("🎤 Registrazione completata! Elaborazione in corso...");
    }
  };

  // 📤 Invia Risposta Audio
  const submitAudioResponse = async (audioBlob: Blob) => {
    if (!currentSimulation || !audioBlob) return;

    setLoading(true);
    setSimulationStatus("processing");

    try {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      if (!accessToken) return;

      const formData = new FormData();
      formData.append('audio', audioBlob, 'response.webm');

      const response = await fetch(`/api/simulazioni/${currentSimulation.id}/process-audio`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore elaborazione audio');
      }

      const result = await response.json();

      // Update evaluation
      setLastEvaluation(result.evaluation);

      if (result.is_completed) {
        // Simulazione completata
        setSimulationStatus("completed");
        toast.success("🎉 Simulazione completata! Elaborazione risultati finali...");
        
        // Auto-finalize
        setTimeout(() => {
          finalizeSimulation();
        }, 2000);
        
      } else {
        // Prossima domanda
        setCurrentQuestion(result.next_question);
        setCurrentSimulation(prev => prev ? {
          ...prev,
          current_question: result.next_question,
          question_number: prev.question_number + 1,
          current_step: result.current_step
        } : null);

        setSimulationStatus("in_progress");
        setRecordingTime(0);

        const scoreDisplay = difficultyLevel === 'liceo' 
          ? `${result.evaluation.score_totale.toFixed(1)}/10` 
          : `${Math.round(result.evaluation.score_totale)}/30`;
        
        toast.success(`✅ Risposta valutata! Voto: ${scoreDisplay}`);

        // Auto-play TTS per prossima domanda
        if (result.tts_audio_data) {
          setTtsAudioData(result.tts_audio_data);
          playTTSAudio(result.tts_audio_data);
        } else if (result.tts_text) {
          // Fallback: usa browser TTS se disponibile
          playBrowserTTS(result.tts_text);
        }
      }

    } catch (err: any) {
      setError(`❌ Errore elaborazione: ${err.message}`);
      toast.error("❌ Errore durante l'elaborazione della risposta");
      setSimulationStatus("in_progress"); // Retry possible
    } finally {
      setLoading(false);
    }
  };

  // 🏁 Finalizza Simulazione
  const finalizeSimulation = async () => {
    if (!currentSimulation) return;

    setLoading(true);

    try {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      if (!accessToken) return;

      const response = await fetch(`/api/simulazioni/${currentSimulation.id}/finalize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore finalizzazione');
      }

      const result = await response.json();

      toast.success(`🎉 Simulazione completata! Voto finale: ${result.results.grade_letter} (${result.results.grade_description || result.results.final_score})`);

      // Auto-play TTS per risultati finali
      if (result.tts_audio_data) {
        setTtsAudioData(result.tts_audio_data);
        playTTSAudio(result.tts_audio_data);
      } else if (result.tts_text) {
        // Fallback: usa browser TTS se disponibile
        playBrowserTTS(result.tts_text);
      }

      // Reset per nuova simulazione
      setTimeout(() => {
        setCurrentSimulation(null);
        setCurrentQuestion("");
        setLastEvaluation(null);
        setSimulationStatus("setup");
        setTtsAudioData(null);
        setRecordingTime(0);
        
        // Opzionale: mostra risultati dettagliati
        if (confirm("Vuoi visualizzare i risultati dettagliati?")) {
          // Qui potresti aprire un modal o navigare a una pagina risultati
          console.log("Risultati dettagliati:", result.results);
        }
      }, 3000);

    } catch (err: any) {
      setError(`❌ Errore finalizzazione: ${err.message}`);
      toast.error("❌ Errore durante la finalizzazione");
    } finally {
      setLoading(false);
    }
  };

  // 🔊 Play TTS Audio (aggiornato per base64)
  const playTTSAudio = (audioData: string) => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.src = audioData; // audioData è già data:audio/mp3;base64,...
      audioPlayerRef.current.play()
        .then(() => {
          setIsPlayingTTS(true);
          toast.success("🔊 Ascolta la domanda/feedback");
        })
        .catch((err) => {
          console.error("Errore riproduzione TTS:", err);
          toast.error("❌ Errore riproduzione audio");
        });
    }
  };

  // 🔊 Fallback Browser TTS
  const playBrowserTTS = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'it-IT';
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      
      utterance.onstart = () => {
        setIsPlayingTTS(true);
        toast.success("🔊 Riproduzione con sintesi vocale browser");
      };
      
      utterance.onend = () => {
        setIsPlayingTTS(false);
      };
      
      utterance.onerror = () => {
        setIsPlayingTTS(false);
        toast.error("❌ Errore sintesi vocale");
      };
      
      speechSynthesis.speak(utterance);
    } else {
      toast.error("❌ Sintesi vocale non supportata dal browser");
    }
  };

  // 🗑️ Abbandona Simulazione
  const abandonSimulation = async () => {
    if (!currentSimulation) return;
    
    if (confirm("Sei sicuro di voler abbandonare questa simulazione? Tutti i progressi andranno persi.")) {
      try {
        const { data } = await supabase.auth.getSession();
        const accessToken = data.session?.access_token;
        if (!accessToken) return;

        // Chiama endpoint abandon (da implementare)
        // await fetch(`/api/simulazioni/${currentSimulation.id}/abandon`, { ... });

        setCurrentSimulation(null);
        setSimulationStatus("setup");
        setCurrentQuestion("");
        setLastEvaluation(null);
        setRecordingTime(0);
        
        toast.success("🗑️ Simulazione abbandonata");
      } catch (err: any) {
        console.error('Errore abbandono simulazione:', err);
      }
    }
  };

  // 🎨 Utility Functions
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getPersonaLabel = (persona: AIPersona): string => {
    const labels = {
      professore_universitario: "👨‍🏫 Professore Universitario",
      esaminatore_severo: "👨‍⚖️ Esaminatore Severo", 
      tutor_amichevole: "🤝 Tutor Amichevole"
    };
    return labels[persona];
  };

  const getDifficultyColor = (level: DifficultyLevel): string => {
    const colors = {
      liceo: "bg-green-100 text-green-800",
      università: "bg-blue-100 text-blue-800",
      magistrale: "bg-purple-100 text-purple-800",
      dottorato: "bg-red-100 text-red-800"
    };
    return colors[level];
  };

  if (!userChecked) return <DashboardLayout><p>Caricamento...</p></DashboardLayout>;

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">🎤 Simulazioni Esame Orale</h1>

      {/* 🎯 INFO BOX */}
      <div className="bg-gradient-to-br from-blue-50 to-purple-100 dark:from-blue-900 dark:to-purple-800 border-l-4 border-blue-500 text-blue-900 dark:text-blue-100 p-4 rounded-xl shadow-md mb-6">
        <h2 className="font-bold text-lg flex items-center gap-2 mb-2">
          🎤 Simulazione Esame Orale Intelligente
        </h2>
        <p className="text-sm leading-relaxed">
          <strong>Allenati con un esaminatore AI personalizzato!</strong> Registra le tue risposte audio, ricevi valutazioni in tempo reale e feedback costruttivo per migliorare la tua preparazione agli esami.
        </p>
      </div>

      {/* 📋 SIMULAZIONI ATTIVE */}
      {activeSimulations.length > 0 && simulationStatus === "setup" && (
        <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900 dark:to-blue-900 rounded-xl border border-green-200 dark:border-green-700">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-green-900 dark:text-green-100 flex items-center gap-2">
              📊 Simulazioni in Corso ({activeSimulations.length})
            </h3>
            <button
              onClick={() => setShowActiveSimulations(!showActiveSimulations)}
              className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm transition-all"
            >
              {showActiveSimulations ? '👁️ Nascondi' : '📋 Mostra'} Simulazioni
            </button>
          </div>
          
          {showActiveSimulations && (
            <div className="space-y-3">
              {activeSimulations.map(simulation => (
                <div key={simulation.id} className="flex justify-between items-center p-3 bg-white dark:bg-gray-800 rounded-lg border border-green-200 dark:border-green-700">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {simulation.materia} • {simulation.argomento}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {getPersonaLabel(simulation.ai_persona)} • 
                      <span className={`ml-2 px-2 py-1 rounded-full text-xs ${getDifficultyColor(simulation.difficulty_level)}`}>
                        {simulation.difficulty_level}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      Progresso: {simulation.questions_completed}/{simulation.total_questions} domande • 
                      {simulation.estimated_time_remaining > 0 && ` ${simulation.estimated_time_remaining} min rimanenti`}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {simulation.can_resume ? (
                      <button
                        onClick={() => resumeSimulation(simulation)}
                        className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm transition-all"
                      >
                        📚 Continua
                      </button>
                    ) : (
                      <span className="px-3 py-2 bg-gray-400 text-white rounded text-sm cursor-not-allowed">
                        ⏰ Scaduta
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 🎯 SETUP NUOVA SIMULAZIONE */}
      {simulationStatus === "setup" && (
        <div className="mb-6 p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            ⚙️ Configura Nuova Simulazione
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                📘 Materia *
              </label>
              <input
                type="text"
                value={materia}
                onChange={(e) => setMateria(e.target.value)}
                placeholder="Es. Diritto Privato, Storia Moderna..."
                className="w-full p-3 border rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                🎯 Argomento *
              </label>
              <input
                type="text"
                value={argomento}
                onChange={(e) => setArgomento(e.target.value)}
                placeholder="Es. I Contratti, La Prima Guerra Mondiale..."
                className="w-full p-3 border rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              📝 Sottotema Specifico (opzionale)
            </label>
            <input
              type="text"
              value={sottotema}
              onChange={(e) => setSottotema(e.target.value)}
              placeholder="Es. La Compravendita, Le Cause del Conflitto..."
              className="w-full p-3 border rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                🎓 Livello Difficoltà
              </label>
              <select
                value={difficultyLevel}
                onChange={(e) => setDifficultyLevel(e.target.value as DifficultyLevel)}
                className="w-full p-3 border rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 transition-all"
              >
                <option value="liceo">🟢 Liceo</option>
                <option value="università">🔵 Università</option>
                <option value="magistrale">🟣 Magistrale</option>
                <option value="dottorato">🔴 Dottorato</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                👨‍🏫 Tipo Esaminatore
              </label>
              <select
                value={aiPersona}
                onChange={(e) => setAiPersona(e.target.value as AIPersona)}
                className="w-full p-3 border rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 transition-all"
              >
                <option value="professore_universitario">👨‍🏫 Professore Universitario</option>
                <option value="esaminatore_severo">👨‍⚖️ Esaminatore Severo</option>
                <option value="tutor_amichevole">🤝 Tutor Amichevole</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                ❓ Numero Domande
              </label>
              <select
                value={totalQuestions}
                onChange={(e) => setTotalQuestions(parseInt(e.target.value))}
                className="w-full p-3 border rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 transition-all"
              >
                <option value={2}>2 domande (10 min)</option>
                <option value={3}>3 domande (15 min)</option>
                <option value={4}>4 domande (20 min)</option>
                <option value={5}>5 domande (25 min)</option>
              </select>
            </div>
          </div>

          <button
            onClick={startNewSimulation}
            disabled={loading || !materia.trim() || !argomento.trim()}
            className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all transform hover:scale-[1.02] text-lg"
          >
            {loading ? "🚀 Inizializzazione in corso..." : "🎤 Inizia Simulazione Orale"}
          </button>
        </div>
      )}

      {/* 🎤 SIMULAZIONE IN CORSO */}
      {currentSimulation && simulationStatus !== "setup" && (
        <div className="mb-6 p-6 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900 dark:to-purple-900 rounded-xl border border-blue-200 dark:border-blue-700 shadow-lg">
          {/* Header Simulazione */}
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="font-bold text-xl text-blue-900 dark:text-blue-100 mb-1">
                🎤 {currentSimulation.materia} • {currentSimulation.argomento}
              </h3>
              <div className="flex items-center gap-4 text-sm text-blue-700 dark:text-blue-300">
                <span>📝 Domanda {currentSimulation.question_number}/{currentSimulation.total_questions}</span>
                <span>⏱️ Step {currentSimulation.current_step}/{currentSimulation.total_steps}</span>
                <span>{getPersonaLabel(currentSimulation.ai_persona)}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={abandonSimulation}
                className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm transition-all"
              >
                🗑️ Abbandona
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
              <span>Progresso Simulazione</span>
              <span>{Math.round((currentSimulation.current_step / currentSimulation.total_steps) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${(currentSimulation.current_step / currentSimulation.total_steps) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Domanda Corrente */}
          {currentQuestion && (
            <div className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-blue-700">
              <div className="flex justify-between items-start mb-3">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  ❓ Domanda {currentSimulation.question_number}
                </h4>
                {ttsAudioData && (
                  <button
                    onClick={() => playTTSAudio(ttsAudioData)}
                    disabled={isPlayingTTS}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 transition-all"
                  >
                    {isPlayingTTS ? "🔊 Riproduzione..." : "🔊 Ascolta"}
                  </button>
                )}
              </div>
              <p className="text-gray-800 dark:text-gray-200 leading-relaxed text-lg">
                {currentQuestion}
              </p>
            </div>
          )}

          {/* Controlli Registrazione */}
          {simulationStatus === "in_progress" && (
            <div className="mb-6 text-center">
              <div className="mb-4">
                <p className="text-gray-700 dark:text-gray-300 mb-2">
                  🎤 Tempo consigliato: <strong>3 minuti</strong> per risposta completa
                </p>
                {recordingTime > 0 && (
                  <p className="text-lg font-mono text-blue-600 dark:text-blue-400">
                    ⏱️ Tempo registrazione: {formatTime(recordingTime)}
                  </p>
                )}
              </div>
              
              <button
                onClick={startRecording}
                disabled={loading || isRecording}
                className="px-8 py-4 bg-red-600 text-white rounded-full hover:bg-red-700 disabled:opacity-50 font-medium transition-all transform hover:scale-105 text-lg shadow-lg"
              >
                {isRecording ? "🎤 Registrazione in corso..." : "🎤 Inizia Registrazione"}
              </button>
              
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Clicca per iniziare, parla chiaramente, poi clicca "Ferma" quando finito
              </p>
            </div>
          )}

          {/* Controlli Registrazione Attiva */}
          {simulationStatus === "recording" && (
            <div className="mb-6 text-center">
              <div className="mb-4">
                <div className="inline-flex items-center gap-3 px-6 py-3 bg-red-100 dark:bg-red-900 rounded-full">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="font-medium text-red-800 dark:text-red-200">
                    🎤 REGISTRAZIONE IN CORSO
                  </span>
                  <span className="font-mono text-lg text-red-600 dark:text-red-400">
                    {formatTime(recordingTime)}
                  </span>
                </div>
              </div>
              
              <button
                onClick={stopRecording}
                className="px-8 py-4 bg-green-600 text-white rounded-full hover:bg-green-700 font-medium transition-all transform hover:scale-105 text-lg shadow-lg"
              >
                ⏹️ Ferma Registrazione
              </button>
              
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                Parla chiaramente e in modo naturale. Premi "Ferma" quando hai finito di rispondere.
              </p>
            </div>
          )}

          {/* Processing State */}
          {simulationStatus === "processing" && (
            <div className="mb-6 text-center">
              <div className="inline-flex items-center gap-3 px-6 py-3 bg-blue-100 dark:bg-blue-900 rounded-full mb-4">
                <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                <span className="font-medium text-blue-800 dark:text-blue-200">
                  🧠 Elaborazione AI in corso...
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Trascrizione audio → Valutazione contenuto → Generazione prossima domanda
              </p>
            </div>
          )}

          {/* Ultima Valutazione */}
          {lastEvaluation && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900 rounded-lg border border-green-200 dark:border-green-700">
              <h4 className="font-medium text-green-900 dark:text-green-100 mb-3 flex items-center gap-2">
                📊 Valutazione Ultima Risposta
              </h4>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                <div className="text-center">
                  <div className="text-lg font-bold text-green-700 dark:text-green-300">
                    {lastEvaluation.scores.contenuto.toFixed(currentSimulation?.ai_persona.includes('università') ? 0 : 1)}
                  </div>
                  <div className="text-xs text-green-600 dark:text-green-400">Contenuto</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-green-700 dark:text-green-300">
                    {lastEvaluation.scores.chiarezza.toFixed(currentSimulation?.ai_persona.includes('università') ? 0 : 1)}
                  </div>
                  <div className="text-xs text-green-600 dark:text-green-400">Chiarezza</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-green-700 dark:text-green-300">
                    {lastEvaluation.scores.approfondimento.toFixed(currentSimulation?.ai_persona.includes('università') ? 0 : 1)}
                  </div>
                  <div className="text-xs text-green-600 dark:text-green-400">Approfondimento</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-green-700 dark:text-green-300">
                    {lastEvaluation.score_totale.toFixed(currentSimulation?.ai_persona.includes('università') ? 0 : 1)}
                  </div>
                  <div className="text-xs text-green-600 dark:text-green-400">Totale</div>
                </div>
              </div>
              
              <p className="text-sm text-green-800 dark:text-green-200 italic">
                💬 {lastEvaluation.feedback_breve}
              </p>
              
              {lastEvaluation.punti_forza.length > 0 && (
                <div className="mt-2">
                  <span className="text-xs font-medium text-green-700 dark:text-green-300">
                    ✅ Punti di forza: 
                  </span>
                  <span className="text-xs text-green-600 dark:text-green-400">
                    {lastEvaluation.punti_forza.join(", ")}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Simulazione Completata */}
          {simulationStatus === "completed" && (
            <div className="text-center">
              <div className="mb-4">
                <div className="inline-flex items-center gap-3 px-6 py-3 bg-green-100 dark:bg-green-900 rounded-full">
                  <span className="text-2xl">🎉</span>
                  <span className="font-bold text-green-800 dark:text-green-200">
                    Simulazione Completata!
                  </span>
                </div>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Complimenti! Hai completato tutte le {currentSimulation.total_questions} domande.
                <br />I risultati finali vengono elaborati...
              </p>
              
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => {
                    setSimulationStatus("setup");
                    setCurrentSimulation(null);
                    setCurrentQuestion("");
                    setLastEvaluation(null);
                    setTtsAudioData(null);
                    setRecordingTime(0);
                  }}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
                >
                  🆕 Nuova Simulazione
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 🔊 Audio Player Hidden */}
      <audio
        ref={audioPlayerRef}
        onEnded={() => setIsPlayingTTS(false)}
        onError={() => setIsPlayingTTS(false)}
        style={{ display: 'none' }}
      />

      {/* ❌ Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900 border-l-4 border-red-500 rounded">
          <p className="text-red-600 dark:text-red-400 font-medium">{error}</p>
        </div>
      )}

      {/* 📊 Statistiche e Tips */}
      {simulationStatus === "setup" && (
        <div className="grid grid-cols-1 gap-6">
          {/* Tips per Simulazione Efficace */}
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900 rounded-lg border border-yellow-200 dark:border-yellow-700">
            <h4 className="font-medium text-yellow-900 dark:text-yellow-100 mb-3 flex items-center gap-2">
              💡 Consigli per una Simulazione Efficace
            </h4>
            <ul className="text-sm text-yellow-800 dark:text-yellow-200 space-y-1">
              <li>• 🎤 <strong>Audio chiaro:</strong> Usa un ambiente silenzioso</li>
              <li>• ⏱️ <strong>Tempo:</strong> 3 minuti circa per risposta completa</li>
              <li>• 🗣️ <strong>Esposizione:</strong> Parla in modo naturale e strutturato</li>
              <li>• 📚 <strong>Contenuto:</strong> Dimostra conoscenza approfondita</li>
              <li>• 🔄 <strong>Progressione:</strong> Le domande si adattano alle tue risposte</li>
            </ul>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

SimulazioniOraliPage.requireAuth = true;