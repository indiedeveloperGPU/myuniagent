import DashboardLayout from "@/components/DashboardLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Pause, 
  Trash2, 
  CheckCircle, 
  AlertTriangle, 
  Ban, 
  Save,
  Lock,
  RefreshCw,
  School,
  Plus,
  CreditCard,
  FileText,
  GraduationCap,
  LogOut,
  User,
  Mail,
  Edit3,
  Zap,
  Trophy,
  Calendar,
  Clock
} from "lucide-react";

function ProfiloPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [name, setName] = useState<string>("");
  const [bio, setBio] = useState<string>("");
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tesiCaricate, setTesiCaricate] = useState<any[]>([]);
  const [codiceClasse, setCodiceClasse] = useState("");
  const [classeJoinMsg, setClasseJoinMsg] = useState("");
  const [badgeCertificazione, setBadgeCertificazione] = useState(false);
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<string | null>(null);
  const [abbonamentoAttivo, setAbbonamentoAttivo] = useState<boolean | null>(null);
  const [abbonamentoPausaFino, setAbbonamentoPausaFino] = useState<Date | null>(null);
  const [abbonamentoDaCancellare, setAbbonamentoDaCancellare] = useState<boolean>(false);
  const [abbonamentoScadenza, setAbbonamentoScadenza] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = "/auth";
        return;
      }

      setEmail(user.email || null);
      setUserId(user.id);

      const { data: profilo } = await supabase
        .from("profiles")
        .select("name, bio, ruolo, abbonamento_attivo, abbonamento_pausa_fino, abbonamento_da_cancellare, abbonamento_scadenza")
        .eq("id", user.id)
        .single();

      if (profilo) {
        setName(profilo.name || "");
        setBio(profilo.bio || "");
        setRole(profilo.ruolo || null);
        setAbbonamentoAttivo(profilo.abbonamento_attivo);
        setAbbonamentoPausaFino(profilo.abbonamento_pausa_fino ? new Date(profilo.abbonamento_pausa_fino) : null);
        setAbbonamentoDaCancellare(profilo.abbonamento_da_cancellare || false);
        setAbbonamentoScadenza(profilo.abbonamento_scadenza ? new Date(profilo.abbonamento_scadenza) : null);
      }

      const { data: files } = await supabase
        .from("uploaded_files")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (files) setTesiCaricate(files);

      const { data: simulazioni } = await supabase
        .from("simulazione_certificazioni")
        .select("punteggio")
        .eq("user_id", user.id);

      if (simulazioni?.some((s) => s.punteggio >= 80)) {
        setBadgeCertificazione(true);
      }

      setLoading(false);
    };

    fetchProfile();
  }, []);

  const handleSave = async () => {
    if (!userId) return;
    setIsSaving(true);
    
    try {
      await supabase.from("profiles").upsert({ id: userId, email, name, bio });
      // Success toast would go here in a real app
      alert("Dati aggiornati ✅");
    } catch (error) {
      alert("Errore durante il salvataggio");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePausaAbbonamento = async () => {
    if (!userId) return;
    const pausaFino = new Date();
    pausaFino.setMonth(pausaFino.getMonth() + 3);

    const { error } = await supabase.from("profiles")
      .update({ abbonamento_pausa_fino: pausaFino.toISOString() })
      .eq("id", userId);

    if (!error) {
      alert("Abbonamento messo in pausa ✅");
      setAbbonamentoPausaFino(pausaFino);
    }
  };

  const handleCancellaAbbonamento = async () => {
    if (!userId) return;
    const { error } = await supabase.from("profiles")
      .update({ abbonamento_da_cancellare: true })
      .eq("id", userId);

    if (!error) {
      alert("Abbonamento impostato per la cancellazione ✅");
      setAbbonamentoDaCancellare(true);
    }
  };

  const handleJoinClasse = async () => {
    if (!userId || !codiceClasse) return;

    const { data: classe, error } = await supabase
      .from("classi")
      .select("*")
      .eq("codice", codiceClasse)
      .single();

    if (!classe || error) {
      setClasseJoinMsg("❌ Codice classe non valido.");
      return;
    }

    const { error: insertError } = await supabase.from("studenti_classi").insert({
      studente_id: userId,
      classe_id: classe.id,
    });

    if (!insertError) {
      setClasseJoinMsg("✅ Classe aggiunta correttamente!");
      setCodiceClasse("");
    } else {
      setClasseJoinMsg("⚠️ Sei già iscritto a questa classe.");
    }
  };

  const handleChangePassword = async () => {
    if (!password) return;
    setIsChangingPassword(true);
    
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (!error) {
        alert("Password aggiornata ✅");
        setPassword("");
      } else {
        alert("Errore durante l'aggiornamento della password.");
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.4, 
        ease: "easeOut",
        staggerChildren: 0.1 
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  if (loading) {
    return (
      <DashboardLayout title="Profilo">
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
            <span className="text-lg text-gray-600 dark:text-gray-400">Caricamento profilo...</span>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      title="Il tuo profilo"
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Profilo" }
      ]}
    >
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-8"
      >
        {/* Profile Header */}
        <motion.div variants={cardVariants} className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {name || "Utente"}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                {email}
              </p>
              {role && (
                <div className="flex items-center gap-2 mt-2">
                  <GraduationCap className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded-full">
                    {role === 'studente' ? 'Studente' : role === 'docente' ? 'Docente' : 'Staff'}
                  </span>
                </div>
              )}
            </div>
            {badgeCertificazione && (
              <div className="flex items-center gap-2 bg-yellow-100 dark:bg-yellow-900/30 px-3 py-2 rounded-lg">
                <Trophy className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                <span className="text-sm font-medium text-yellow-700 dark:text-yellow-300">Certificato</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Main Grid */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Profile Information */}
          <motion.div variants={cardVariants} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-3 mb-6">
              <Edit3 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Informazioni Profilo</h3>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email
                </label>
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <Mail className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-900 dark:text-white">{email}</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nome
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder="Inserisci il tuo nome"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Bio
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-none"
                  placeholder="Raccontaci qualcosa di te..."
                />
              </div>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSave}
                disabled={isSaving}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-3 rounded-lg font-medium transition-all shadow-sm hover:shadow-md"
              >
                {isSaving ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {isSaving ? 'Salvataggio...' : 'Salva modifiche'}
              </motion.button>
            </div>
          </motion.div>

          {/* Security Settings */}
          <motion.div variants={cardVariants} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-3 mb-6">
              <Lock className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Sicurezza</h3>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nuova Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder="Inserisci nuova password"
                />
              </div>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleChangePassword}
                disabled={isChangingPassword || !password}
                className="w-full flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white px-6 py-3 rounded-lg font-medium transition-all shadow-sm hover:shadow-md"
              >
                {isChangingPassword ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Lock className="w-4 h-4" />
                )}
                {isChangingPassword ? 'Aggiornamento...' : 'Cambia password'}
              </motion.button>
            </div>
          </motion.div>
        </div>

        {/* Secondary Grid */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Class Management (Students only) */}
          {role !== "docente" && (
            <motion.div variants={cardVariants} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center gap-3 mb-6">
                <School className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Gestione Classi</h3>
              </div>
              
              <div className="space-y-4">
                <input
                  type="text"
                  value={codiceClasse}
                  onChange={(e) => setCodiceClasse(e.target.value)}
                  placeholder="Inserisci codice classe"
                  className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
                
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleJoinClasse}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium transition-all shadow-sm hover:shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  Aggiungi classe
                </motion.button>
                
                <AnimatePresence>
                  {classeJoinMsg && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className={`p-3 rounded-lg text-sm ${
                        classeJoinMsg.includes('✅') 
                          ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800' 
                          : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                      }`}
                    >
                      {classeJoinMsg}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {/* Subscription Management */}
          <motion.div variants={cardVariants} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Abbonamento</h3>
              </div>
              {abbonamentoAttivo ? (
                <div className="flex items-center gap-2 bg-green-100 dark:bg-green-900/30 px-3 py-1 rounded-full">
                  <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <span className="text-sm font-medium text-green-700 dark:text-green-300">Attivo</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-red-100 dark:bg-red-900/30 px-3 py-1 rounded-full">
                  <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                  <span className="text-sm font-medium text-red-700 dark:text-red-300">Non attivo</span>
                </div>
              )}
            </div>

            {abbonamentoAttivo && (
              <div className="space-y-4 mb-6">
                {abbonamentoPausaFino && abbonamentoPausaFino > new Date() && (
                  <div className="flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                    <div>
                      <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">In pausa</p>
                      <p className="text-xs text-yellow-600 dark:text-yellow-400">
                        Fino al {abbonamentoPausaFino.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}

                {abbonamentoDaCancellare && (
                  <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                    <div>
                      <p className="text-sm font-medium text-red-800 dark:text-red-200">Cancellazione programmata</p>
                      <p className="text-xs text-red-600 dark:text-red-400">
                        Valido fino al {abbonamentoScadenza ? abbonamentoScadenza.toLocaleDateString() : "data sconosciuta"}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {!abbonamentoAttivo && (
              <div className="text-center py-6">
                <Zap className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  Abbonati per accedere alle funzionalità premium
                </p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-2 rounded-lg font-medium transition-all shadow-sm hover:shadow-md"
                >
                  Scopri i piani
                </motion.button>
              </div>
            )}

            {abbonamentoAttivo && (
              <div className="flex flex-col sm:flex-row gap-3">
                {!abbonamentoPausaFino || abbonamentoPausaFino <= new Date() ? (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handlePausaAbbonamento}
                    className="flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg font-medium transition-all shadow-sm hover:shadow-md"
                  >
                    <Pause className="w-4 h-4" />
                    Pausa 3 mesi
                  </motion.button>
                ) : (
                  <div className="flex items-center justify-center gap-2 bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 px-4 py-2 rounded-lg cursor-not-allowed">
                    <Pause className="w-4 h-4" />
                    Pausa attiva
                  </div>
                )}

                {!abbonamentoDaCancellare ? (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleCancellaAbbonamento}
                    className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-all shadow-sm hover:shadow-md"
                  >
                    <Trash2 className="w-4 h-4" />
                    Cancella abbonamento
                  </motion.button>
                ) : (
                  <div className="flex items-center justify-center gap-2 bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200 px-4 py-2 rounded-lg cursor-not-allowed">
                    <Ban className="w-4 h-4" />
                    Cancellazione programmata
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </div>

        {/* Files Section */}
        <motion.div variants={cardVariants} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-6">
            <FileText className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">File caricati</h3>
            <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded-full text-sm font-medium">
              {tesiCaricate.length}
            </span>
          </div>
          
          {tesiCaricate.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">Nessun file caricato</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {tesiCaricate.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                  <FileText className="w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {item.filename}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <Calendar className="w-3 h-3" />
                      {new Date(item.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Teacher Dashboard Link */}
        {role === "docente" && (
          <motion.div variants={cardVariants} className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-purple-200 dark:border-purple-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
                  <GraduationCap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Dashboard Docente</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Gestisci classi, test e materiali didattici
                  </p>
                </div>
              </div>
              <motion.a
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                href="/docente/dashboard"
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-all shadow-sm hover:shadow-md"
              >
                Accedi
              </motion.a>
            </div>
          </motion.div>
        )}

        {/* Logout Section */}
        <motion.div variants={cardVariants} className="flex justify-center pt-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleLogout}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-all shadow-sm hover:shadow-md"
          >
            <LogOut className="w-4 h-4" />
            Esci dall'account
          </motion.button>
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
}

ProfiloPage.requireAuth = true;

export default ProfiloPage;