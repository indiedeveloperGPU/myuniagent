import { useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";

export default function AuthPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [ruolo, setRuolo] = useState("studente");
  const [isStaff, setIsStaff] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAuth = async () => {
    setLoading(true);
    setError("");

    if (isLogin) {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      const user = data.user;
      if (!user) {
        setError("Errore autenticazione.");
        setLoading(false);
        return;
      }

      // Recupera ruolo
      const { data: profilo, error: profiloError } = await supabase
        .from("profiles")
        .select("ruolo")
        .eq("id", user.id)
        .single();

      if (profiloError || !profilo) {
        setError("Impossibile recuperare il profilo.");
        setLoading(false);
        return;
      }

      // Verifica se lo staff ha spuntato l'accesso dedicato
      if (isStaff && profilo.ruolo === "staff") {
        router.push("/staff/dashboard");
      } else if (profilo.ruolo === "docente") {
        router.push("/docente/dashboard");
      } else if (profilo.ruolo === "studente") {
        router.push("/dashboard");
      } else {
        setError("Ruolo non riconosciuto o accesso non consentito.");
      }
    } else {
      // REGISTRAZIONE (solo studente/docente)
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      const user = data.user;
      if (user) {
        await supabase.from("profiles").insert({
          id: user.id,
          email: user.email,
          ruolo,
        });
      }

      alert("Registrazione completata! Controlla la tua email per confermare.");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="max-w-md w-full bg-white p-6 shadow rounded">
        <h1 className="text-2xl font-bold mb-4 text-center">
          {isLogin ? "Accedi a MyUniAgent" : "Registrati su MyUniAgent"}
        </h1>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border rounded px-3 py-2 mb-3"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border rounded px-3 py-2 mb-4"
        />

        {!isLogin && (
          <div className="mb-4">
            <label className="block font-semibold mb-1">Tipo account</label>
            <select
              value={ruolo}
              onChange={(e) => setRuolo(e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="studente">Studente</option>
              <option value="docente">Docente</option>
            </select>
          </div>
        )}

        {isLogin && (
          <div className="flex items-center mb-4">
            <input
              type="checkbox"
              id="isStaff"
              checked={isStaff}
              onChange={(e) => setIsStaff(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="isStaff" className="text-sm font-medium text-gray-700">
              Accedi come membro dello staff
            </label>
          </div>
        )}

        {error && <p className="text-red-600 mb-3 text-sm">{error}</p>}

        <button
          onClick={handleAuth}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          {loading ? "Attendi..." : isLogin ? "Accedi" : "Registrati"}
        </button>

        <p className="text-sm mt-4 text-center">
          {isLogin ? "Non hai un account?" : "Hai già un account?"}{" "}
          <span
            onClick={() => setIsLogin(!isLogin)}
            className="text-blue-600 hover:underline cursor-pointer"
          >
            {isLogin ? "Registrati" : "Accedi"}
          </span>
        </p>
      </div>
    </div>
  );
}

