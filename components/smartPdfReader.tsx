// IMPORT PRINCIPALI
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/router";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import SmartPdfReader from "@/components/smartPdfReader";
import TutorialModal from "@/components/TutorialModal";
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';

// ICONE CUSTOM
const Icons = {
  Fox: () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L4 7V12C4 16.5 7 20.26 12 21C17 20.26 20 16.5 20 12V7L12 2Z" fill="currentColor" opacity="0.2"/>
      <path d="M12 2L4 7V12C4 16.5 7 20.26 12 21C17 20.26 20 16.5 20 12V7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="9" cy="10" r="1" fill="currentColor"/>
      <circle cx="15" cy="10" r="1" fill="currentColor"/>
      <path d="M12 14C13 14 14 13 14 12H10C10 13 11 14 12 14Z" fill="currentColor"/>
    </svg>
  ),
  Engineer: () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z" fill="currentColor" opacity="0.2"/>
      <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z" stroke="currentColor" strokeWidth="2"/>
      <path d="M12 6V12L16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  Sparkles: () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L14.09 8.26L20.18 8.27L15.45 12.14L17.45 18.18L12 14.77L6.55 18.18L8.55 12.14L3.82 8.27L9.91 8.26L12 2Z" fill="currentColor" opacity="0.2"/>
      <path d="M12 2L14.09 8.26L20.18 8.27L15.45 12.14L17.45 18.18L12 14.77L6.55 18.18L8.55 12.14L3.82 8.27L9.91 8.26L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Send: () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Upload: () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M21 15V19C21 20.1 20.1 21 19 21H5C3.9 21 3 20.1 3 19V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M7 10L12 15L17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  History: () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z" stroke="currentColor" strokeWidth="2"/>
      <path d="M12 6V12L16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  Settings: () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
      <path d="M12 1V6M12 18V23M4.22 4.22L6.34 6.34M17.66 17.66L19.78 19.78M1 12H6M18 12H23M4.22 19.78L6.34 17.66M17.66 6.34L19.78 4.22" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  FileText: () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M16 13H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M16 17H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M10 9H9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
};

// COMPONENTE PRINCIPALE
export default function Spiegazione() {
  // Stati principali
  const [input, setInput] = useState("");
  const [risposta, setRisposta] = useState("");
  const [loading, setLoading] = useState(false);
  const [userChecked, setUserChecked] = useState(false);
  const [chat, setChat] = useState<{ role: string; content: string }[]>([]);
  const [followUp, setFollowUp] = useState("");
  const [livello, setLivello] = useState("superiori");
  const [tipoAssistente, setTipoAssistente] = useState<"generale" | "ingegnere">("generale");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [suggerimenti, setSuggerimenti] = useState<string[]>([]);
  const [mostraSuggerimenti, setMostraSuggerimenti] = useState(false);
  const [mostraTutorial, setMostraTutorial] = useState(false);
  const [suggerimentoLoading, setSuggerimentoLoading] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<{ question: string; answer: string } | null>(null);
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const [chatSalvate, setChatSalvate] = useState<{ titolo: string; creata: string; modificata: string }[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  
  // Stati per SmartPdfReader unificato
  const [showSmartReader, setShowSmartReader] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const router = useRouter();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll alla fine della chat
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chat]);

  // Check utente
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

  // Carica chat dal router
  useEffect(() => {
    const concettoQuery = router.query.concetto as string;
    if (concettoQuery) {
      setInput(concettoQuery);
      caricaChatOGenera(concettoQuery);
    }
  }, [router.query]);

  // Carica chat salvate
  useEffect(() => {
    const caricaChatSalvate = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) return;

      const { data } = await supabase
        .from("chat_spiegazioni")
        .select("titolo, creata_il, ultima_modifica")
        .eq("user_id", user.id)
        .order("ultima_modifica", { ascending: false });

      if (data) {
        setChatSalvate(data.map(chat => ({
          titolo: chat.titolo,
          creata: new Date(chat.creata_il).toLocaleDateString(),
          modificata: new Date(chat.ultima_modifica).toLocaleString(),
        })));
      }
    };

    if (userChecked) caricaChatSalvate();
  }, [userChecked]);

  // Funzioni principali
  const caricaChatOGenera = async (testo: string) => {
    setInput(testo);
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) return generaSpiegazioneFox(testo);

    const { data: chatEsistente } = await supabase
      .from("chat_spiegazioni")
      .select("messaggi")
      .eq("user_id", user.id)
      .eq("titolo", testo)
      .maybeSingle();

    if (chatEsistente?.messaggi) {
      setChat(chatEsistente.messaggi);
      const last = chatEsistente.messaggi
        .slice().reverse()
        .find((msg: any) => msg.role === "assistant")?.content;
      if (last) setRisposta(last);
    } else {
      generaSpiegazioneFox(testo);
    }

    setLoading(false);
  };

  // Gestione file unificata con SmartPdfReader
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Verifica che sia PDF o immagine
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      toast.error("Formato file non supportato. Carica un'immagine o un PDF.");
      return;
    }

    setSelectedFile(file);
    setShowSmartReader(true);
  };

  // Gestione testo estratto dal SmartPdfReader
  const handleExtractedText = (text: string) => {
    setInput((prev) => `${prev ? prev + "\n\n" : ""}${text}`);
    toast.success("Testo estratto con successo!");
    setShowSmartReader(false);
    setSelectedFile(null);
  };

  const eliminaConversazione = async (titolo: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) return;
    
    await supabase
      .from("chat_spiegazioni")
      .delete()
      .eq("user_id", user.id)
      .eq("titolo", titolo);

    setChatSalvate(prev => prev.filter(c => c.titolo !== titolo));
    if (input === titolo) {
      setInput("");
      setChat([]);
      setRisposta("");
    }
    toast.success("Conversazione eliminata");
  };

  const normalizeLatex = (text: string): string => {
    let normalized = text
      .replace(/\\\\\[/g, '\\[')
      .replace(/\\\\\]/g, '\\]')
      .replace(/\\\\\(/g, '\\(')
      .replace(/\\\\\)/g, '\\)')
      .replace(/(^|[^\\])([a-zA-Z0-9]+)\^(\([^)]+\)|[a-zA-Z0-9]+)/g, (match, before, base, exp) => {
        return `${before}${base}^{${exp.replace(/^\(|\)$/g, '')}}`;
      });

    return normalized;
  };

  // Genera spiegazione Ingegnere
  const generaSpiegazioneIngegnere = async (testo: string) => {
    if (!testo || isSubmitting) return;
    setTipoAssistente("ingegnere");
    setIsSubmitting(true);
    setLoading(true);
    setRisposta("");
    const userMessage = { role: "user" as const, content: testo };
    const assistantPlaceholder = { role: "assistant" as const, content: "" };
    setChat([userMessage, assistantPlaceholder]);

    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;

    try {
      const res = await fetch("/api/spiegazione", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          concetto: testo,
          livelloStudente: livello,
          isFirst: true,
          isRisolutore: true
        }),
      });

      if (!res.ok || !res.body) {
        const errorData = await res.json().catch(() => ({ error: "Errore sconosciuto con l'ingegnere" }));
        toast.error(errorData.error || "Errore durante la richiesta all'ingegnere.");
        setChat(prevChat => prevChat.slice(0, prevChat.length - 1));
        setLoading(false);
        setIsSubmitting(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedResponse = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        accumulatedResponse += chunk;
        setChat(prevChat => {
          const newChat = [...prevChat];
          if (newChat.length > 0 && newChat[newChat.length - 1].role === "assistant") {
            newChat[newChat.length - 1].content = accumulatedResponse;
          }
          return newChat;
        });
        setRisposta(accumulatedResponse);
      }

      if (accumulatedResponse.length > 20) {
        toast.success("✅ Spiegazione generata con successo!");
      }

    } catch (error) {
      console.error("Errore con ingegnere:", error);
      toast.error("Errore durante la richiesta all'ingegnere.");
    } finally {
      setLoading(false);
      setIsSubmitting(false);
    }
  };

  // Ottimizza prompt
  const ottimizzaPrompt = async () => {
    if (!input.trim()) {
      toast.error("Inserisci una domanda prima.");
      return;
    }

    setSuggerimentoLoading(true);
    const toastId = toast.loading("Analisi in corso... ✨");
    setMostraSuggerimenti(false);

    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;

    try {
      const res = await fetch("/api/ottimizzaPrompt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ domanda: input }),
      });

      const data = await res.json();
      if (res.ok && data.suggestions) {
        if (Array.isArray(data.suggestions)) {
          const suggeriti = data.suggestions
            .map((s: string) => s.trim())
            .filter((s: string) => s.length > 10);
          const filtrati = suggeriti.filter((s: string) => !s.toLowerCase().startsWith("ecco alcune"));
          setSuggerimenti(filtrati.slice(0, 3));
        }
        setMostraSuggerimenti(true);
        toast.success("Suggerimenti pronti!", { id: toastId });
      } else {
        toast.error("Nessun suggerimento disponibile.", { id: toastId });
      }
    } catch (error) {
      console.error("Errore ottimizzazione:", error);
      toast.error("Errore durante l'analisi.", { id: toastId });
    } finally {
      setSuggerimentoLoading(false);
    }
  };

  // Genera spiegazione Fox
  const generaSpiegazioneFox = async (testo: string) => {
    if (!testo || isSubmitting) return;
    setTipoAssistente("generale");
    setIsSubmitting(true);
    setLoading(true);
    setRisposta("");
    const userMessage = { role: "user" as const, content: testo };
    const assistantPlaceholder = { role: "assistant" as const, content: "" };
    setChat([userMessage, assistantPlaceholder]);

    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;

    try {
      const res = await fetch("/api/spiegazione", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          concetto: testo,
          livelloStudente: livello,
          isFirst: true,
          isRisolutore: false
        }),
      });

      if (!res.ok || !res.body) {
        const errorData = await res.json().catch(() => ({ error: "Errore sconosciuto" }));
        toast.error(errorData.error || "Errore durante la richiesta.");
        setChat(prevChat => prevChat.slice(0, prevChat.length - 1));
        setLoading(false);
        setIsSubmitting(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedResponse = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        accumulatedResponse += chunk;
        setChat(prevChat => {
          const newChat = [...prevChat];
          if (newChat.length > 0 && newChat[newChat.length - 1].role === "assistant") {
            newChat[newChat.length - 1].content = accumulatedResponse;
          }
          return newChat;
        });
        setRisposta(accumulatedResponse);
      }

      if (accumulatedResponse.length > 20) {
        toast.success("✅ Spiegazione salvata automaticamente!");
      }

    } catch (error) {
      console.error("Errore con Fox:", error);
      toast.error("Errore durante la richiesta.");
    } finally {
      setLoading(false);
      setIsSubmitting(false);
    }
  };

  // Invia follow-up
  const inviaFollowUp = async () => {
    if (!followUp.trim() || isSubmitting || followUpLoading) return;

    setIsSubmitting(true);
    setFollowUpLoading(true);

    const userMessageContent = followUp;
    const newChatWithMessage = [...chat, { role: "user" as const, content: userMessageContent }];
    const assistantPlaceholder = { role: "assistant" as const, content: "" };
    setChat([...newChatWithMessage, assistantPlaceholder]);
    setFollowUp("");
    setRisposta("");

    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;

    try {
      const res = await fetch("/api/spiegazione", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          concetto: chat[0]?.content || "Argomento sconosciuto",
          followUp: newChatWithMessage,
          livelloStudente: livello,
          isFirst: false,
          isRisolutore: tipoAssistente === "ingegnere"
        }),
      });

      if (!res.ok || !res.body) {
        toast.error("Errore durante l'invio del follow-up.");
        setChat(prevChat => prevChat.slice(0, prevChat.length - 1));
        setFollowUpLoading(false);
        setIsSubmitting(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedResponse = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        accumulatedResponse += chunk;

        setChat(prevChat => {
          const newChat = [...prevChat];
          if (newChat.length > 0 && newChat[newChat.length - 1].role === "assistant") {
            newChat[newChat.length - 1].content = accumulatedResponse;
          }
          return newChat;
        });
        setRisposta(accumulatedResponse);
      }

    } catch (error) {
      console.error("Errore nel follow-up:", error);
      toast.error("Errore durante la richiesta di follow-up.");
    } finally {
      setFollowUpLoading(false);
      setIsSubmitting(false);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K per focus input
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      // Cmd/Ctrl + Enter per inviare
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        if (input.trim() && !isSubmitting) {
          generaSpiegazioneFox(input);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [input, isSubmitting]);

  if (!userChecked) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
        {/* Header Enterprise */}
       <div className="sticky top-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 -mx-6 md:-mx-10 -mt-6 md:-mt-10 px-6 md:px-10 rounded-t-2xl">
  <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Spiegazione Avanzata
                </h1>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {chat.length > 0 ? `${chat.filter(m => m.role === 'user').length} domande` : 'Nuova conversazione'}
                </span>
              </div>
              
              <div className="flex items-center space-x-3">
                {/* Tutorial Button */}
                <button
                  onClick={() => setMostraTutorial(true)}
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Come funziona
                </button>
                
                {/* History Toggle */}
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  <Icons.History />
                  <span className="ml-1.5">Cronologia</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto py-6">
          {/* Main Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Panel - Input & Controls */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Input Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
              >
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Cosa vuoi approfondire oggi?
                    </label>
                    <textarea
                      ref={inputRef}
                      className="w-full min-h-[120px] px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                      placeholder="Es: Spiega il teorema di Pitagora con esempi pratici..."
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                          e.preventDefault();
                          generaSpiegazioneFox(input);
                        }
                      }}
                    />
                  </div>

                  {/* Level Selector */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Livello di studio
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {['medie', 'superiori', 'universita'].map((level) => (
                        <button
                          key={level}
                          onClick={() => setLivello(level)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                            livello === level
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                        >
                          {level.charAt(0).toUpperCase() + level.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative group">
                      <button
                        onClick={() => generaSpiegazioneFox(input)}
                        disabled={!input.trim() || isSubmitting}
                        className="w-full flex items-center justify-center px-4 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-medium shadow-sm hover:shadow-lg hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-200"
                      >
                        <Icons.Fox />
                        <span className="ml-2">Agente Fox</span>
                      </button>
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-10">
                        <div className="bg-gray-900 text-white text-xs rounded-lg p-3 shadow-lg">
                          <p className="font-semibold mb-1">Spiegazioni intuitive</p>
                          <p>Ricevi spiegazioni chiare e comprensibili con esempi pratici e analogie</p>
                          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900"></div>
                        </div>
                      </div>
                    </div>

                    <div className="relative group">
                      <button
                        onClick={() => generaSpiegazioneIngegnere(input)}
                        disabled={!input.trim() || isSubmitting}
                        className="w-full flex items-center justify-center px-4 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium shadow-sm hover:shadow-lg hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-200"
                      >
                        <Icons.Engineer />
                        <span className="ml-2">Ingegnere STEM</span>
                      </button>
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-10">
                        <div className="bg-gray-900 text-white text-xs rounded-lg p-3 shadow-lg">
                          <p className="font-semibold mb-1">Approccio tecnico-scientifico</p>
                          <p>Ottieni spiegazioni rigorose con formule, dimostrazioni e dettagli tecnici</p>
                          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900"></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Optimize Button */}
                  <div className="relative group">
                    <button
                      onClick={ottimizzaPrompt}
                      disabled={!input.trim() || suggerimentoLoading}
                      className="w-full flex items-center justify-center px-4 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium shadow-sm hover:shadow-lg hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-200"
                    >
                      <Icons.Sparkles />
                      <span className="ml-2">Ottimizza domanda con AI</span>
                    </button>
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-10">
                      <div className="bg-gray-900 text-white text-xs rounded-lg p-3 shadow-lg">
                        <p className="font-semibold mb-1">Ricevi 3 versioni migliorate</p>
                        <p>Analizza e migliora la tua domanda per ottenere risposte più precise</p>
                        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900"></div>
                      </div>
                    </div>
                  </div>

                  {/* Smart File Upload - UNIFICATO */}
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <label
                      htmlFor="smart-file-upload"
                      className="flex items-center justify-center px-4 py-3 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-all group"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center">
                          <Icons.Upload />
                          <Icons.FileText />
                        </div>
                        <div className="text-center">
                          <span className="block text-sm font-medium">Smart Reader</span>
                          <span className="block text-xs text-gray-500 dark:text-gray-400 group-hover:text-blue-500 dark:group-hover:text-blue-400">
                            PDF, immagini con OCR intelligente
                          </span>
                        </div>
                      </div>
                      <input
                        id="smart-file-upload"
                        type="file"
                        accept="application/pdf,image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                    
                    {/* Helper text */}
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                      ✨ Carica PDF per navigazione avanzata o immagini per OCR automatico
                    </p>
                  </div>
                </div>
              </motion.div>

            
              {/* Suggestions Card */}
              <AnimatePresence>
                {mostraSuggerimenti && suggerimenti.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl border border-purple-200 dark:border-purple-700 p-6"
                  >
                    <h3 className="text-sm font-semibold text-purple-900 dark:text-purple-100 mb-4 flex items-center">
                      <Icons.Sparkles />
                      <span className="ml-2">Domande ottimizzate</span>
                    </h3>
                    <div className="space-y-3">
                      {suggerimenti.map((sugg, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer group"
                          onClick={() => {
                            setInput(sugg);
                            setMostraSuggerimenti(false);
                            toast.success("Domanda ottimizzata selezionata!");
                          }}
                        >
                          <p className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {sugg}
                          </p>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* History Panel */}
              <AnimatePresence>
                {showHistory && chatSalvate.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
                  >
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                      <Icons.History />
                      <span className="ml-2">Conversazioni recenti</span>
                    </h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {chatSalvate.map((chat, i) => (
                        <div
                          key={i}
                          className="group p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                        >
                          <div
                            onClick={() => caricaChatOGenera(chat.titolo)}
                            className="flex items-start justify-between"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {chat.titolo}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {chat.modificata}
                              </p>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                eliminaConversazione(chat.titolo);
                              }}
                              className="ml-2 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-all"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Right Panel - Chat */}
            <div className="lg:col-span-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 h-[calc(100vh-200px)] flex flex-col overflow-hidden"
              >
                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
                  {chat.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-4l-4 4v-4z" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                          Inizia una nuova conversazione
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Scrivi una domanda o carica un documento per iniziare
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {chat.map((msg, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[85%] rounded-2xl px-5 py-3 ${
                              msg.role === 'user'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                            }`}
                          >
                            <div className="flex items-start space-x-3">
                              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                                msg.role === 'user' ? 'bg-blue-700' : 'bg-gray-200 dark:bg-gray-600'
                              }`}>
                                {msg.role === 'user' ? (
                                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                  </svg>
                                ) : tipoAssistente === 'ingegnere' ? (
                                  <Icons.Engineer />
                                ) : (
                                  <Icons.Fox />
                                )}
                              </div>
                              <div className="flex-1 prose prose-sm dark:prose-invert max-w-none">
                                <ReactMarkdown
                                  remarkPlugins={[remarkMath, remarkGfm]}
                                  rehypePlugins={[rehypeKatex, rehypeHighlight]}
                                >
                                  {normalizeLatex(msg.content)}
                                </ReactMarkdown>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                      {loading && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex justify-start"
                        >
                          <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl px-5 py-3">
                            <div className="flex space-x-2">
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Follow-up Input */}
                {chat.length > 0 && (
                  <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                    <div className="flex space-x-3">
                      <input
                        type="text"
                        className="flex-1 px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="Fai una domanda di approfondimento..."
                        value={followUp}
                        onChange={(e) => setFollowUp(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && inviaFollowUp()}
                        disabled={followUpLoading || isSubmitting}
                      />
                      <button
                        onClick={inviaFollowUp}
                        disabled={!followUp.trim() || followUpLoading || isSubmitting}
                        className="px-4 py-2 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center"
                      >
                        {followUpLoading || isSubmitting ? (
                          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          <Icons.Send />
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        </div>

        {/* Modals */}
        <TutorialModal isOpen={mostraTutorial} onClose={() => setMostraTutorial(false)} />

        {/* Smart PDF Reader - UNIFICATO */}
        <SmartPdfReader
          isOpen={showSmartReader}
          onClose={() => {
            setShowSmartReader(false);
            setSelectedFile(null);
          }}
          file={selectedFile}
          onTextSelected={handleExtractedText}
        />
    </DashboardLayout>
  );
}

Spiegazione.requireAuth = true;
