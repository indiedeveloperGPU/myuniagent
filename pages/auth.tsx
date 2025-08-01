import { useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";
import { motion } from "framer-motion";
import { Mail, Lock } from "lucide-react";
import Image from "next/image";
import { useEffect } from "react";

export default function AuthPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [ruolo, setRuolo] = useState("studente");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);

  

  useEffect(() => {
  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      // recupera ruolo e redirige alla pagina corretta
      const { data: profilo, error: profiloError } = await supabase
        .from("profiles")
        .select("ruolo")
        .eq("id", session.user.id)
        .single();

      if (profilo && !profiloError) {
        if (profilo.ruolo === "staff") {
          router.replace("/staff/dashboard");
        } else if (profilo.ruolo === "docente") {
          router.replace("/docente/dashboard");
        } else {
          router.replace("/dashboard");
        }
      }
    }

    setCheckingSession(false);
  };

  checkSession();
}, []);

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

      if (data?.session) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      }

      const user = data.user;
      if (!user) {
        setError("Errore autenticazione.");
        setLoading(false);
        return;
      }

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

      if (profilo.ruolo === "staff") {
  router.push("/staff/dashboard");
} else if (profilo.ruolo === "docente") {
  router.push("/docente/dashboard");
} else if (profilo.ruolo === "studente") {
  router.push("/dashboard");
} else {
  setError("Ruolo non riconosciuto o accesso non consentito.");
}

    } else {
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
          abbonamento_attivo: false,
        });
      }

      alert("Registrazione completata! Controlla la tua email per confermare.");
    }

    setLoading(false);
  };

  if (checkingSession) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 dark:from-gray-900 dark:to-gray-800">
      <p className="text-white text-lg">⏳ Verifica sessione...</p>
    </div>
  );
}

  return (
    <div className="min-h-screen flex items-center justify-center overflow-auto bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 dark:from-gray-900 dark:to-gray-800 px-3 py-8 sm:px-4 sm:py-12">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md bg-white dark:bg-gray-800 p-6 md:p-8 rounded-2xl shadow-xl"
      >
        <div className="flex justify-center mb-4">
          <Image
            src="/images/logo1bg.png"
            alt="Logo MyUniAgent"
            width={64}
            height={64}
            className="mx-auto mb-4 sm:w-[80px] sm:h-[80px] w-[64px] h-[64px]"
            priority
          />
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-center text-gray-800 dark:text-white">
          {isLogin ? "Accedi a MyUniAgent" : "Registrati su MyUniAgent"}
        </h1>

        <div className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded px-4 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded px-4 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
            />
          </div>

          {!isLogin && (
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">
                Tipo account
              </label>
              <select
                value={ruolo}
                onChange={(e) => setRuolo(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded px-4 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
              >
                <option value="studente">Studente</option>
                <option value="docente">Docente</option>
              </select>
            </div>
          )}
          {error && <p className="text-red-500 dark:text-red-400 text-sm">{error}</p>}

          <button
            onClick={handleAuth}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white font-semibold py-2 rounded text-base transition-colors duration-200 flex items-center justify-center"
          >
            {loading ? (
              <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8z"
                />
              </svg>
            ) : isLogin ? "Accedi" : "Registrati"}
          </button>

          <p className="text-sm text-center text-gray-600 dark:text-gray-400 mt-4 mb-4">
            {isLogin ? "Non hai un account?" : "Hai già un account?"}{" "}
            <span
              onClick={() => setIsLogin(!isLogin)}
              className="text-blue-600 hover:underline cursor-pointer font-medium"
            >
              {isLogin ? "Registrati" : "Accedi"}
            </span>
          </p>
        </div>
      </motion.div>
    </div>
  );
}






