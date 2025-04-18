import DashboardLayout from "@/components/DashboardLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import AllenamentoIngleseRisultati from "./AllenamentoIngleseRisultati";

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
        .select("name, bio, ruolo")
        .eq("id", user.id)
        .single();

      if (profilo) {
        setName(profilo.name || "");
        setBio(profilo.bio || "");
        setRole(profilo.ruolo || null);
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
      <h1 className="text-2xl font-bold mb-6">👤 Il tuo profilo</h1>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Info profilo */}
        <div className="p-4 bg-white rounded shadow space-y-4">
          <p><strong>Email:</strong> {email}</p>
          <div>
            <label className="font-semibold block">Nome:</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border p-2 rounded"
            />
          </div>
          <div>
            <label className="font-semibold block">Bio:</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="w-full border p-2 rounded"
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
        <div className="p-4 bg-white rounded shadow space-y-4">
          <h2 className="font-semibold text-lg">🔒 Cambio password</h2>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border p-2 rounded"
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
          <div className="p-4 bg-white rounded shadow space-y-3">
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
            {classeJoinMsg && <p className="text-sm mt-2">{classeJoinMsg}</p>}
          </div>
        )}

        <div className="p-4 bg-white rounded shadow">
          <h2 className="font-semibold text-lg">💳 Abbonamento</h2>
          <p className="text-green-700 mt-1">Attivo – Piano annuale (15€/anno)</p>
          <p className="text-sm text-gray-500">Gestione disponibile a breve</p>
        </div>
      </div>

      {/* Tesi caricate */}
      <div className="mt-8 bg-white p-4 rounded shadow">
        <h2 className="text-lg font-semibold mb-3">📁 Tesi caricate</h2>
        {tesiCaricate.length === 0 ? (
          <p className="text-gray-600">Nessuna tesi caricata.</p>
        ) : (
          <ul className="space-y-2">
            {tesiCaricate.map((item) => (
              <li key={item.id} className="bg-gray-100 rounded p-3">
                <strong>{item.filename}</strong><br />
                <span className="text-sm text-gray-500">
                  Caricata il: {new Date(item.created_at).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Allenamento inglese */}
      <div className="mt-8 bg-white p-4 rounded shadow">
        <h2 className="text-lg font-semibold mb-3">🌍 Allenamento Lingue – Risultati</h2>
        <AllenamentoIngleseRisultati userId={userId} />
        {badgeCertificazione && (
          <div className="mt-6 p-4 border rounded bg-yellow-50 border-yellow-300 shadow">
            <h3 className="text-lg font-semibold text-yellow-800">🏅 Badge ottenuto</h3>
            <p className="text-yellow-700 text-sm mt-1">
              Complimenti! Hai superato una simulazione con un punteggio superiore all'80%.
            </p>
          </div>
        )}
      </div>

      {/* Dashboard docente */}
      {role === "docente" && (
        <div className="mt-8 bg-white p-4 rounded shadow">
          <h2 className="text-lg font-semibold">🎓 Sei un docente</h2>
          <p className="text-sm text-gray-600 mb-3">
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
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          🔓 Logout
        </button>
      </div>
    </DashboardLayout>
  );
}

ProfiloPage.requireAuth = true;

export default ProfiloPage;



