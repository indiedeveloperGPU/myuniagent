import DashboardLayout from "@/components/DashboardLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Pause, Trash2, CheckCircle, AlertTriangle, Ban } from "lucide-react";


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
    await supabase.from("profiles").upsert({ id: userId, email, name, bio });
    alert("Dati aggiornati ✅");
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
    const { error } = await supabase.auth.updateUser({ password });
    if (!error) {
      alert("Password aggiornata ✅");
      setPassword("");
    } else {
      alert("Errore durante l'aggiornamento della password.");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  };

  if (loading) {
    return (
      <DashboardLayout>
        <p>Caricamento profilo...</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">👤 Il tuo profilo</h1>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Info profilo */}
        <div className="p-4 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded shadow space-y-4 border border-gray-200 dark:border-gray-700">
          <p><strong>Email:</strong> {email}</p>
          <div>
            <label className="font-semibold block">Nome:</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border rounded p-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700"
            />
          </div>
          <div>
            <label className="font-semibold block">Bio:</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="w-full border rounded p-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700"
            />
          </div>
          <button
            onClick={handleSave}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            💾 Salva modifiche
          </button>
        </div>

        {/* Cambio password */}
        <div className="p-4 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded shadow space-y-4 border border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold text-lg">🔒 Cambio password</h2>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded p-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700"
            placeholder="Nuova password"
          />
          <button
            onClick={handleChangePassword}
            className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700"
          >
            🔁 Cambia password
          </button>
        </div>
      </div>

      {/* Box classe e abbonamento */}
      <div className="mt-8 grid md:grid-cols-2 gap-6">
        {role !== "docente" && (
          <div className="p-4 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded shadow space-y-3 border border-gray-200 dark:border-gray-700">
            <h2 className="font-semibold text-lg">🏫 Collegati a una classe</h2>
            <input
              type="text"
              value={codiceClasse}
              onChange={(e) => setCodiceClasse(e.target.value)}
              placeholder="Inserisci codice classe"
              className="w-full border rounded p-2"
            />
            <button
              onClick={handleJoinClasse}
              className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
            >
              ➕ Aggiungi classe
            </button>
            {classeJoinMsg && <p className="text-sm mt-2 text-gray-700 dark:text-gray-300">{classeJoinMsg}</p>}
          </div>
        )}

        <div className="p-5 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 space-y-4">
  <div className="flex items-center justify-between">
    <h2 className="font-semibold text-lg">💳 Abbonamento</h2>
    {abbonamentoAttivo ? (
      <span className="text-sm px-2 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
        Attivo
      </span>
    ) : (
      <span className="text-sm px-2 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
        Non attivo
      </span>
    )}
  </div>

  {abbonamentoAttivo && (
    <>
      {abbonamentoPausaFino && abbonamentoPausaFino > new Date() && (
        <div className="text-yellow-700 dark:text-yellow-400 text-sm">
          ⏸ In pausa fino al <strong>{abbonamentoPausaFino.toLocaleDateString()}</strong>
        </div>
      )}

      {abbonamentoDaCancellare && (
        <div className="text-red-700 dark:text-red-400 text-sm">
          ⚠️ In scadenza: valido fino al{" "}
          <strong>{abbonamentoScadenza ? abbonamentoScadenza.toLocaleDateString() : "data sconosciuta"}</strong>
        </div>
      )}
    </>
  )}

  {!abbonamentoAttivo && (
    <p className="text-sm text-gray-500 dark:text-gray-400">
      Abbonati per accedere alle funzionalità premium
    </p>
  )}

  {abbonamentoAttivo && (
    <div className="flex flex-col sm:flex-row sm:space-x-3 space-y-2 sm:space-y-0 pt-2">
      {!abbonamentoPausaFino || abbonamentoPausaFino <= new Date() ? (
        <button
  onClick={handlePausaAbbonamento}
  className="bg-yellow-500 hover:bg-yellow-600 text-white text-sm px-4 py-2 rounded-md transition transform active:scale-95"
>
  <Pause className="inline w-4 h-4 mr-1" />
  Pausa 3 mesi
</button>
      ) : (
        <div className="relative group inline-block">
  <button
    disabled
    className="bg-yellow-200 text-yellow-800 text-sm px-4 py-2 rounded-md cursor-not-allowed"
  >
    Pausa attiva
  </button>
  <span className="absolute left-1/2 -translate-x-1/2 -bottom-8 text-xs bg-black text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition pointer-events-none z-10 whitespace-nowrap">
    In pausa fino al {abbonamentoPausaFino?.toLocaleDateString()}
  </span>
</div>

      )}

      {!abbonamentoDaCancellare ? (
        <button
  onClick={handleCancellaAbbonamento}
  className="bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-2 rounded-md transition transform active:scale-95"
>
  <Trash2 className="inline w-4 h-4 mr-1" />
  Cancella abbonamento
</button>
      ) : (
        <div className="relative group inline-block">
  <button
    disabled
    className="bg-red-200 text-red-800 text-sm px-4 py-2 rounded-md cursor-not-allowed"
  >
    Cancellazione programmata
  </button>
  <span className="absolute left-1/2 -translate-x-1/2 -bottom-8 text-xs bg-black text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition pointer-events-none z-10 whitespace-nowrap">
    Valido fino al {abbonamentoScadenza?.toLocaleDateString() || "?"}
  </span>
</div>

      )}
    </div>
  )}
</div>




      </div>

      {/* Tesi caricate */}
      <div className="mt-8 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4 rounded shadow border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold mb-3">📁 Tesi caricate</h2>
        {tesiCaricate.length === 0 ? (
          <p className="text-gray-600">Nessuna tesi caricata.</p>
        ) : (
          <ul className="space-y-2">
            {tesiCaricate.map((item) => (
              <li key={item.id} className="bg-gray-100 rounded p-3 text-gray-800 dark:bg-gray-800 dark:text-gray-100">
                <strong>{item.filename}</strong><br />
                <span className="text-sm text-gray-500">
                  Caricata il: {new Date(item.created_at).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>


      {/* Dashboard docente */}
      {role === "docente" && (
        <div className="mt-8 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4 rounded shadow border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold">🎓 Sei un docente</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
            Accedi alla tua dashboard per gestire classi, test, materiali.
          </p>
          <a
            href="/docente/dashboard"
            className="bg-purple-700 text-white px-4 py-2 rounded hover:bg-purple-800 inline-block"
          >
            Vai alla Dashboard Docente
          </a>
        </div>
      )}

      {/* Logout */}
      <div className="mt-10">
        <button
          onClick={handleLogout}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition"
        >
          🔓 Logout
        </button>
      </div>
    </DashboardLayout>
  );
}

ProfiloPage.requireAuth = true;

export default ProfiloPage;




