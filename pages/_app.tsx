import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Toaster } from "react-hot-toast";
import { SpeedInsights } from "@vercel/speed-insights/next"; // ✅ aggiunto

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

      setLoading(false);
    };

    checkAuth();
  }, [Component]);

  const getLayout = Component.getLayout || ((page) => page);

  if (Component.requireAuth && (loading || !isAuthenticated)) {
    return <p className="text-center mt-10">🔐 Verifica autenticazione...</p>;
  }

  return (
    <>
      <Toaster position="top-right" reverseOrder={false} />
      {getLayout(<Component {...pageProps} />)}
      <SpeedInsights /> {/* ✅ monitoraggio Vercel */}
    </>
  );
}

}



