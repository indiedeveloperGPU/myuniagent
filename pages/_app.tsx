import type { AppProps } from "next/app";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Toaster } from "react-hot-toast";
import { SpeedInsights } from "@vercel/speed-insights/next"
import 'katex/dist/katex.min.css';      
import 'highlight.js/styles/github.css';       
import 'highlight.js/styles/github-dark.css';  
import "@/styles/globals.css";
import 'katex/dist/contrib/mhchem.js';


type CustomAppProps = AppProps & {
  Component: AppProps["Component"] & {
    requireAuth?: boolean;
    getLayout?: (page: React.ReactNode) => React.ReactNode;
  };
};

export default function App({ Component, pageProps }: CustomAppProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isTrialExpired, setIsTrialExpired] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);


  useEffect(() => {
  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    if (Component.requireAuth && !user) {
      router.push("/auth");
    } else {
      setIsAuthenticated(!!user);
    }

    if (user) {
      await supabase
        .from("profiles")
        .update({ ultimo_accesso: new Date().toISOString() })
        .eq("id", user.id);

      const { data, error } = await supabase
        .from("profiles")
        .select("created_at, abbonamento_attivo, abbonamento_scadenza, abbonamento_pausa_fino")
        .eq("id", user.id)
        .single();

      if (!error && data) {
        const trialDays = 1;
        const now = new Date();

        // Calcolo scadenza trial
        const trialEndDate = new Date(data.created_at);
        trialEndDate.setDate(trialEndDate.getDate() + trialDays);
        const trialExpired = now > trialEndDate;

        // Controllo pausa abbonamento
        const pausaFino = data.abbonamento_pausa_fino ? new Date(data.abbonamento_pausa_fino) : null;
        const isInPause = pausaFino ? now <= pausaFino : false;

        // Controllo se abbonamento valido oltre scadenza (es. proroghe)
        const abbonamentoScadenza = data.abbonamento_scadenza ? new Date(data.abbonamento_scadenza) : null;
        const hasValidSubscription = data.abbonamento_attivo === true && 
          (!abbonamentoScadenza || now <= abbonamentoScadenza);

        const shouldBlock = trialExpired && !hasValidSubscription && !isInPause;

        setIsTrialExpired(shouldBlock);
        setIsSubscribed(hasValidSubscription);
      }
    }

    setLoading(false);
  };

  checkAuth();

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const applyTheme = (e: MediaQueryList | MediaQueryListEvent) => {
    if (e.matches) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  applyTheme(mediaQuery);
  mediaQuery.addEventListener('change', applyTheme);

  return () => mediaQuery.removeEventListener('change', applyTheme);
}, [Component]);




  const getLayout = Component.getLayout || ((page) => page);

  if (Component.requireAuth && (loading || !isAuthenticated)) {
    return <p className="text-center mt-10">🔐 Verifica autenticazione...</p>;
  }

  if (Component.requireAuth && isAuthenticated && isTrialExpired && !isSubscribed) {
  return (
    <div className="fixed inset-0 bg-white dark:bg-black z-50 flex flex-col items-center justify-center">
      <h2 className="text-xl font-bold mb-4">🎓 Il tuo periodo di prova è terminato</h2>
      <p className="mb-4">Per continuare a usare MyUniAgent, abbonati ora.</p>
      <button
        onClick={() => router.push('/abbonamento')}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
      >
        Abbonati
      </button>
    </div>
  );
}


  return (
    <>
      <Toaster position="top-right" reverseOrder={false} />
      {getLayout(<Component {...pageProps} />)}
    </>
  );
}
