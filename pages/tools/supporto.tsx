import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import DashboardLayout from "@/components/DashboardLayout";
import { toast } from "react-hot-toast";
import { useRouter } from 'next/router';

// 🎯 ENTERPRISE TYPESCRIPT INTERFACES
interface SupportTicket {
  id: string;
  user_id: string;
  email: string;
  tipo: 'problema tecnico' | 'generale' | 'pagamento/abbonamento';
  oggetto: string;
  messaggio: string;
  risposta?: string;
  stato: 'aperto' | 'chiuso' | 'in_corso';
  priorita?: 'bassa' | 'media' | 'alta' | 'urgente';
  creato_il: string;
  aggiornato_il?: string;
}

interface SupportStats {
  total_tickets: number;
  open_tickets: number;
  closed_tickets: number;
  avg_response_time: string;
  last_ticket_date?: string;
  satisfaction_rate: number;
}

type FilterType = 'all' | 'problema tecnico' | 'generale' | 'pagamento/abbonamento';
type FilterStatus = 'all' | 'aperto' | 'chiuso' | 'in_corso';
type SortOption = 'recent' | 'oldest' | 'priority' | 'status';

export default function SupportoPage() {
  // 🎯 STATE MANAGEMENT ENTERPRISE
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<SupportTicket[]>([]);
  const [supportStats, setSupportStats] = useState<SupportStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [userChecked, setUserChecked] = useState(false);
  
  // 🎫 NUOVO TICKET STATE
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const [newTicket, setNewTicket] = useState({
    tipo: 'generale' as FilterType,
    oggetto: '',
    messaggio: '',
    priorita: 'media' as SupportTicket['priorita']
  });
  
  // 🔍 FILTRI E RICERCA
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  
  // 🎨 UI STATE
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [replyMessage, setReplyMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const router = useRouter();

  // 🔄 AUTH CHECK
  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.push("/auth");
        return;
      }
      setUserChecked(true);
    };
    checkUser();
  }, [router]);

  // 🔄 CARICA TICKETS E STATS
  useEffect(() => {
    const loadSupportData = async () => {
      if (!userChecked) return;
      
      setIsLoading(true);
      setError("");

      try {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData?.user?.id;

        if (!userId) {
          setError("Utente non autenticato");
          return;
        }

        // Carica tickets
        const { data: ticketsData, error: ticketsError } = await supabase
          .from("support_tickets")
          .select("*")
          .eq("user_id", userId)
          .order("creato_il", { ascending: false });

        if (ticketsError) throw ticketsError;

        setTickets(ticketsData || []);

        // Calcola statistiche
        const stats = calculateStats(ticketsData || []);
        setSupportStats(stats);
        
      } catch (error: any) {
        console.error('Errore caricamento supporto:', error);
        setError("Errore nel caricamento dei dati di supporto");
        toast.error("❌ Errore nel caricamento dei ticket");
      } finally {
        setIsLoading(false);
      }
    };

    loadSupportData();
  }, [userChecked]);

  // 📊 CALCOLA STATISTICHE
  const calculateStats = (ticketsData: SupportTicket[]): SupportStats => {
    const total = ticketsData.length;
    const open = ticketsData.filter(t => t.stato === 'aperto').length;
    const closed = ticketsData.filter(t => t.stato === 'chiuso').length;
    
    return {
      total_tickets: total,
      open_tickets: open,
      closed_tickets: closed,
      avg_response_time: "< 24h",
      last_ticket_date: ticketsData[0]?.creato_il,
      satisfaction_rate: 94
    };
  };

  // 🔄 APPLICA FILTRI E RICERCA
  useEffect(() => {
    let filtered = tickets;

    // 🔍 Ricerca testuale
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(ticket => 
        ticket.oggetto.toLowerCase().includes(term) ||
        ticket.messaggio.toLowerCase().includes(term) ||
        ticket.tipo.toLowerCase().includes(term)
      );
    }

    // 📂 Filtro per tipo
    if (filterType !== 'all') {
      filtered = filtered.filter(ticket => ticket.tipo === filterType);
    }

    // 📊 Filtro per status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(ticket => ticket.stato === filterStatus);
    }

    // 📈 Ordinamento
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.creato_il).getTime() - new Date(b.creato_il).getTime();
        case 'priority':
          const priorityOrder = { 'urgente': 4, 'alta': 3, 'media': 2, 'bassa': 1 };
          return (priorityOrder[b.priorita || 'media'] || 2) - (priorityOrder[a.priorita || 'media'] || 2);
        case 'status':
          return a.stato.localeCompare(b.stato);
        case 'recent':
        default:
          return new Date(b.creato_il).getTime() - new Date(a.creato_il).getTime();
      }
    });

    setFilteredTickets(filtered);
  }, [tickets, searchTerm, filterType, filterStatus, sortBy]);

  // 🎫 CREA NUOVO TICKET
  const handleCreateTicket = async () => {
    if (!newTicket.oggetto.trim() || !newTicket.messaggio.trim()) {
      toast.error("❌ Inserisci oggetto e messaggio");
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      const email = userData?.user?.email;

      if (!userId || !email) {
        toast.error("❌ Utente non autenticato");
        return;
      }

      const { error } = await supabase.from("support_tickets").insert({
        user_id: userId,
        email,
        tipo: newTicket.tipo,
        oggetto: newTicket.oggetto,
        messaggio: newTicket.messaggio,
        priorita: newTicket.priorita,
        stato: "aperto",
      });

      if (error) throw error;

      toast.success("✅ Ticket creato con successo!");
      setNewTicket({
        tipo: 'generale',
        oggetto: '',
        messaggio: '',
        priorita: 'media'
      });
      setIsCreatingTicket(false);
      
      // Ricarica tickets
      const { data: ticketsData } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("user_id", userId)
        .order("creato_il", { ascending: false });
      
      setTickets(ticketsData || []);
      
    } catch (error: any) {
      console.error('Errore creazione ticket:', error);
      toast.error("❌ Errore durante la creazione del ticket");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 💬 INVIA RISPOSTA
  const handleSendReply = async () => {
    if (!selectedTicket || !replyMessage.trim()) return;

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from("support_tickets")
        .update({ 
          messaggio: selectedTicket.messaggio + "\n\n--- RISPOSTA UTENTE ---\n" + replyMessage,
          aggiornato_il: new Date().toISOString()
        })
        .eq("id", selectedTicket.id);

      if (error) throw error;

      toast.success("✅ Risposta inviata!");
      setReplyMessage("");
      setIsTicketModalOpen(false);
      
      // Ricarica tickets
      const { data: userData } = await supabase.auth.getUser();
      const { data: ticketsData } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("user_id", userData.user?.id)
        .order("creato_il", { ascending: false });
      
      setTickets(ticketsData || []);
      
    } catch (error: any) {
      console.error('Errore invio risposta:', error);
      toast.error("❌ Errore durante l'invio della risposta");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 🎨 HELPER FUNCTIONS
  const getTypeEmoji = (tipo: string) => {
    switch (tipo) {
      case 'problema tecnico': return '🔧';
      case 'pagamento/abbonamento': return '💳';
      case 'generale': return '💬';
      default: return '📧';
    }
  };

  const getTypeColor = (tipo: string) => {
    switch (tipo) {
      case 'problema tecnico': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'pagamento/abbonamento': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'generale': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getStatusColor = (stato: string) => {
    switch (stato) {
      case 'aperto': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'in_corso': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'chiuso': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getStatusEmoji = (stato: string) => {
    switch (stato) {
      case 'aperto': return '🟢';
      case 'in_corso': return '🟡';
      case 'chiuso': return '⚫';
      default: return '❓';
    }
  };

  const getPriorityColor = (priorita?: string) => {
    switch (priorita) {
      case 'urgente': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'alta': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'media': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'bassa': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  // 👁️ APRI DETTAGLI TICKET
  const openTicketDetails = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setIsTicketModalOpen(true);
  };

  // 🔄 CHIUDI MODAL
  const closeTicketModal = () => {
    setIsTicketModalOpen(false);
    setSelectedTicket(null);
    setReplyMessage("");
  };

  if (!userChecked || isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Caricamento supporto...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* 🎯 HEADER */}
      <div className="mb-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              🎟️ Centro Supporto Studente
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Gestisci le tue richieste di supporto e ottieni assistenza rapida
            </p>
          </div>
          
          <button
            onClick={() => setIsCreatingTicket(true)}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all transform hover:scale-105 font-medium"
          >
            ➕ Nuovo Ticket
          </button>
        </div>

        {/* 📊 STATISTICHE SUPPORTO */}
        {supportStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 p-4 rounded-xl border border-blue-200 dark:border-blue-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Ticket Totali</p>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{supportStats.total_tickets}</p>
                </div>
                <div className="text-2xl">🎫</div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900 dark:to-green-800 p-4 rounded-xl border border-green-200 dark:border-green-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700 dark:text-green-300">Ticket Aperti</p>
                  <p className="text-2xl font-bold text-green-900 dark:text-green-100">{supportStats.open_tickets}</p>
                </div>
                <div className="text-2xl">🟢</div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900 dark:to-purple-800 p-4 rounded-xl border border-purple-200 dark:border-purple-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Tempo Risposta</p>
                  <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{supportStats.avg_response_time}</p>
                </div>
                <div className="text-2xl">⚡</div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900 dark:to-orange-800 p-4 rounded-xl border border-orange-200 dark:border-orange-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-700 dark:text-orange-300">Soddisfazione</p>
                  <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">{supportStats.satisfaction_rate}%</p>
                </div>
                <div className="text-2xl">⭐</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 🔍 FILTRI E RICERCA */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* 🔍 Ricerca */}
          <div className="flex-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cerca per oggetto, messaggio o tipo..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* 📂 Filtro Tipo */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as FilterType)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
          >
            <option value="all">Tutti i tipi</option>
            <option value="generale">💬 Generale</option>
            <option value="problema tecnico">🔧 Problema Tecnico</option>
            <option value="pagamento/abbonamento">💳 Pagamento</option>
          </select>

          {/* 📊 Filtro Status */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
          >
            <option value="all">Tutti gli stati</option>
            <option value="aperto">🟢 Aperti</option>
            <option value="in_corso">🟡 In Corso</option>
            <option value="chiuso">⚫ Chiusi</option>
          </select>

          {/* 📈 Ordinamento */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
          >
            <option value="recent">📅 Più recenti</option>
            <option value="oldest">📅 Più vecchi</option>
            <option value="priority">🚨 Priorità</option>
            <option value="status">📊 Stato</option>
          </select>

          {/* 👁️ Vista */}
          <div className="flex border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 text-sm transition-all ${
                viewMode === 'grid' 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              ⊞ Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 text-sm transition-all ${
                viewMode === 'list' 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              ☰ Lista
            </button>
          </div>
        </div>

        {/* 📊 Risultati */}
        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          {filteredTickets.length === tickets.length ? (
            `Visualizzando tutti i ${tickets.length} ticket`
          ) : (
            `${filteredTickets.length} di ${tickets.length} ticket`
          )}
        </div>
      </div>

      {/* ❌ ERROR STATE */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-xl p-4 mb-6">
          <p className="text-red-600 dark:text-red-400 font-medium">{error}</p>
        </div>
      )}

      {/* 📭 EMPTY STATE */}
      {!isLoading && filteredTickets.length === 0 && !error && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🎟️</div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {tickets.length === 0 ? 'Nessun ticket di supporto' : 'Nessun risultato'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {tickets.length === 0 
              ? 'Crea il tuo primo ticket di supporto per ottenere assistenza.'
              : 'Prova a modificare i filtri per trovare quello che cerchi.'
            }
          </p>
          {tickets.length === 0 && (
            <button
              onClick={() => setIsCreatingTicket(true)}
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all transform hover:scale-105 font-medium"
            >
              🎫 Crea Primo Ticket
            </button>
          )}
        </div>
      )}

      {/* 🎯 GRID TICKETS */}
      {!isLoading && filteredTickets.length > 0 && (
        <div className={`${
          viewMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' 
            : 'space-y-4'
        }`}>
          {filteredTickets.map((ticket) => (
            <div
              key={ticket.id}
              className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 transition-all duration-300 hover:shadow-lg ${
                viewMode === 'list' ? 'flex items-center p-4' : 'p-6'
              }`}
            >
              {viewMode === 'grid' ? (
                // 🎯 GRID VIEW
                <>
                  {/* Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{getTypeEmoji(ticket.tipo)}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(ticket.tipo)}`}>
                        {ticket.tipo}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.stato)}`}>
                        {getStatusEmoji(ticket.stato)} {ticket.stato}
                      </span>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100 mb-2 line-clamp-2">
                    {ticket.oggetto}
                  </h3>

                  {/* Message Preview */}
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
                    {ticket.messaggio}
                  </p>

                  {/* Details */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                      <span className="w-4 h-4 mr-2">📅</span>
                      <span>{new Date(ticket.creato_il).toLocaleDateString('it-IT')}</span>
                    </div>
                    {ticket.priorita && (
                      <div className="flex items-center text-sm">
                        <span className="w-4 h-4 mr-2">🚨</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(ticket.priorita)}`}>
                          {ticket.priorita.toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => openTicketDetails(ticket)}
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all text-sm font-medium"
                    >
                      👁️ Visualizza
                    </button>
                    {ticket.stato === 'aperto' && (
                      <button
                        onClick={() => openTicketDetails(ticket)}
                        className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all text-sm"
                      >
                        💬 Rispondi
                      </button>
                    )}
                  </div>
                </>
              ) : (
                // 📋 LIST VIEW
                <>
                  <div className="flex items-center gap-4 flex-1">
                    <div className="text-2xl">{getTypeEmoji(ticket.tipo)}</div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {ticket.oggetto}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(ticket.tipo)}`}>
                          {ticket.tipo}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                        {ticket.messaggio.length > 60 ? ticket.messaggio.substring(0, 60) + '...' : ticket.messaggio}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                          {new Date(ticket.creato_il).toLocaleDateString('it-IT')}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {ticket.priorita || 'media'}
                        </div>
                      </div>
                      
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.stato)}`}>
                        {getStatusEmoji(ticket.stato)} {ticket.stato}
                      </span>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => openTicketDetails(ticket)}
                          className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 transition-all text-sm"
                        >
                          👁️ Visualizza
                        </button>
                        {ticket.stato === 'aperto' && (
                          <button
                            onClick={() => openTicketDetails(ticket)}
                            className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-all text-sm"
                          >
                            💬
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 🎫 MODAL NUOVO TICKET */}
      {isCreatingTicket && (
        <div className="fixed inset-0 bg-gradient-to-br from-gray-900/90 via-purple-900/20 to-blue-900/90 backdrop-blur-lg flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                🎫 Nuovo Ticket di Supporto
              </h2>
              <button
                onClick={() => setIsCreatingTicket(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Form */}
            <div className="space-y-6">
              {/* Tipo e Priorità */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    📂 Tipo di Richiesta
                  </label>
                  <select
                    value={newTicket.tipo}
                    onChange={(e) => setNewTicket({...newTicket, tipo: e.target.value as FilterType})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  >
                    <option value="generale">💬 Generale</option>
                    <option value="problema tecnico">🔧 Problema Tecnico</option>
                    <option value="pagamento/abbonamento">💳 Pagamento/Abbonamento</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    🚨 Priorità
                  </label>
                  <select
                    value={newTicket.priorita}
                    onChange={(e) => setNewTicket({...newTicket, priorita: e.target.value as SupportTicket['priorita']})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  >
                    <option value="bassa">🔵 Bassa</option>
                    <option value="media">🟡 Media</option>
                    <option value="alta">🟠 Alta</option>
                    <option value="urgente">🔴 Urgente</option>
                  </select>
                </div>
              </div>

              {/* Oggetto */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  📝 Oggetto
                </label>
                <input
                  type="text"
                  value={newTicket.oggetto}
                  onChange={(e) => setNewTicket({...newTicket, oggetto: e.target.value})}
                  placeholder="Es: Problema caricamento tesi, Errore analisi, etc..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Messaggio */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  💬 Descrizione Dettagliata
                </label>
                <textarea
                  value={newTicket.messaggio}
                  onChange={(e) => setNewTicket({...newTicket, messaggio: e.target.value})}
                  rows={6}
                  placeholder="Descrivi in dettaglio il problema o la tua richiesta. Includi eventuali passi per riprodurre il problema, messaggi di errore, o altre informazioni utili..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                />
              </div>

              {/* Tips */}
              <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">💡 Suggerimenti per un supporto veloce:</h4>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <li>• Descrivi il problema in modo chiaro e dettagliato</li>
                  <li>• Includi eventuali messaggi di errore che hai ricevuto</li>
                  <li>• Specifica quando si è verificato il problema</li>
                  <li>• Menziona se il problema è ricorrente o occasionale</li>
                </ul>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-6">
              <button
                onClick={() => setIsCreatingTicket(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
              >
                ❌ Annulla
              </button>
              <button
                onClick={handleCreateTicket}
                disabled={isSubmitting || !newTicket.oggetto.trim() || !newTicket.messaggio.trim()}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                    Creazione...
                  </div>
                ) : (
                  '🚀 Crea Ticket'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 👁️ MODAL DETTAGLI TICKET */}
      {selectedTicket && isTicketModalOpen && (
        <div className="fixed inset-0 bg-gradient-to-br from-gray-900/90 via-purple-900/20 to-blue-900/90 backdrop-blur-lg flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-2xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-3xl">{getTypeEmoji(selectedTicket.tipo)}</span>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {selectedTicket.oggetto}
                  </h2>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getTypeColor(selectedTicket.tipo)}`}>
                    {selectedTicket.tipo}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedTicket.stato)}`}>
                    {getStatusEmoji(selectedTicket.stato)} {selectedTicket.stato}
                  </span>
                  {selectedTicket.priorita && (
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(selectedTicket.priorita)}`}>
                      🚨 {selectedTicket.priorita.toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={closeTicketModal}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Metadata */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">📧 Email</p>
                <p className="text-sm text-gray-900 dark:text-gray-100">{selectedTicket.email}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">📅 Creato il</p>
                <p className="text-sm text-gray-900 dark:text-gray-100">
                  {new Date(selectedTicket.creato_il).toLocaleString('it-IT')}
                </p>
              </div>
              {selectedTicket.aggiornato_il && (
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">🔄 Ultimo aggiornamento</p>
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    {new Date(selectedTicket.aggiornato_il).toLocaleString('it-IT')}
                  </p>
                </div>
              )}
            </div>

            {/* Messaggio */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">💬 Messaggio</h3>
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                  {selectedTicket.messaggio}
                </p>
              </div>
            </div>

            {/* Risposta Staff */}
            {selectedTicket.risposta && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">📩 Risposta del Team di Supporto</h3>
                <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
                  <p className="text-blue-900 dark:text-blue-100 whitespace-pre-wrap leading-relaxed">
                    {selectedTicket.risposta}
                  </p>
                </div>
              </div>
            )}

            {/* Area Risposta Utente */}
            {selectedTicket.stato === 'aperto' && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">✍️ Aggiungi Risposta</h3>
                <textarea
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  rows={4}
                  placeholder="Scrivi una risposta aggiuntiva o fornisci ulteriori informazioni..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={closeTicketModal}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
              >
                ❌ Chiudi
              </button>
              
              {selectedTicket.stato === 'aperto' && (
                <button
                  onClick={handleSendReply}
                  disabled={isSubmitting || !replyMessage.trim()}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                      Invio...
                    </div>
                  ) : (
                    '📤 Invia Risposta'
                  )}
                </button>
              )}
            </div>

            {/* Help Text */}
            {selectedTicket.stato === 'aperto' && (
              <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg">
                <p className="text-sm text-green-800 dark:text-green-200">
                  💡 <strong>Suggerimento:</strong> Il nostro team di supporto risponde solitamente entro 24 ore. 
                  Riceverai una notifica via email quando ci sarà una risposta.
                </p>
              </div>
            )}

            {selectedTicket.stato === 'chiuso' && (
              <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  ⚫ <strong>Ticket Chiuso:</strong> Questo ticket è stato risolto e chiuso. 
                  Se hai ancora problemi, crea un nuovo ticket di supporto.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

SupportoPage.requireAuth = true;