import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "./supabaseClient";

export function withAccess(Component: any, allowedRoles: string[]) {
  const Wrapper = (props: any) => {
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
      const checkRole = async () => {
        const { data: authData } = await supabase.auth.getUser();
        const userId = authData?.user?.id;

        if (!userId) {
          router.push("/auth");
          return;
        }

        const { data: profilo } = await supabase
          .from("profiles")
          .select("ruolo")
          .eq("id", userId)
          .single();

        const ruolo = profilo?.ruolo;

        // STAFF può accedere a tutto
        if (ruolo === "staff") {
          setLoading(false);
          return;
        }

        // se non incluso tra i ruoli consentiti → redirect
        if (!allowedRoles.includes(ruolo)) {
          router.push("/dashboard");
          return;
        }

        setLoading(false);
      };

      checkRole();
    }, []);

    if (loading) {
      return <p className="p-4">🔐 Verifica accesso in corso...</p>;
    }

    return <Component {...props} />;
  };

  Wrapper.requireAuth = true;
  return Wrapper;
}
