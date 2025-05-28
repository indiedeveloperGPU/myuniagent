import type { AppProps } from "next/app";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Toaster } from "react-hot-toast";

// Import library CSS first
import 'katex/dist/katex.min.css';       // stile formule
import 'highlight.js/styles/github.css';       // tema chiaro
import 'highlight.js/styles/github-dark.css';  // tema scuro (facoltativo)

// Import your global styles LAST
import "@/styles/globals.css";

// KaTeX chemical typesetting support (mhchem.js)
// This is a JS file, not CSS. Its import location relative to CSS is less critical for styling,
// but often kept with other KaTeX related imports.
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
    }
    setLoading(false);
  };

  checkAuth();

  // 🌙 DARK MODE - gestione reattiva
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  const applyTheme = (e: MediaQueryList | MediaQueryListEvent) => {
    if (e.matches) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  applyTheme(mediaQuery); // Imposta subito

  mediaQuery.addEventListener('change', applyTheme); // Ascolta modifiche

  return () => mediaQuery.removeEventListener('change', applyTheme); // Cleanup
}, [Component]);


  const getLayout = Component.getLayout || ((page) => page);

  if (Component.requireAuth && (loading || !isAuthenticated)) {
    return <p className="text-center mt-10">🔐 Verifica autenticazione...</p>;
  }

  return (
    <>
      <Toaster position="top-right" reverseOrder={false} />
      {getLayout(<Component {...pageProps} />)}
    </>
  );
}

